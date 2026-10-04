import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";
import { endOfDay, endOfMonth, startOfMonth } from "date-fns";
import { calculateCommissionableRental, calculateLeadCommission, calculateManagerCommission } from "@/lib/finance";

export async function GET(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    if (member || !["OWNER", "ADMIN", "ACCOUNTANT"].includes(user.role)) throw new Error("Отчёты доступны владельцу, администратору и бухгалтеру");
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : startOfMonth(new Date());
    const to = url.searchParams.get("to") ? endOfDay(new Date(url.searchParams.get("to")!)) : endOfMonth(new Date());
    const partnerQuery = url.searchParams.get("partner")?.trim() || undefined;
    const bookingScope = { userId: user.id, startDate: { lte: to }, endDate: { gte: from }, status: { not: "CANCELLED" as const }, ...(partnerQuery ? { partner: { name: { contains: partnerQuery, mode: "insensitive" as const } } } : {}) };
    const [payments, expenses, bookings, team, partners, allRentalPayments] = await Promise.all([
      prisma.payment.findMany({ where: { userId: user.id, paymentDate: { gte: from, lte: to }, ...(partnerQuery ? { booking: { partner: { name: { contains: partnerQuery, mode: "insensitive" } } } } : {}) }, include: { booking: { include: { asset: { include: { branch: true } }, partner: true, act: true } } }, orderBy: { paymentDate: "asc" } }),
      prisma.expense.findMany({ where: { userId: user.id, date: { gte: from, lte: to } }, include: { asset: true }, orderBy: { date: "asc" } }),
      prisma.booking.findMany({ where: bookingScope, include: { asset: { include: { branch: true } }, partner: true, act: true }, orderBy: { startDate: "asc" } }),
      prisma.teamMember.findMany({ where: { ownerId: user.id, active: true }, select: { commissionPercent: true } }),
      prisma.partner.findMany({ where: { userId: user.id } }),
      prisma.payment.findMany({ where: { userId: user.id, paymentType: "RENTAL" } })
    ]);
    const income = payments.filter(p => p.paymentType === "RENTAL").reduce((s, p) => s + Number(p.amount), 0);
    const depositsHeld = payments.filter(p => p.paymentType === "DEPOSIT").reduce((s, p) => s + Number(p.amount), 0) - payments.filter(p => p.paymentType === "DEPOSIT_RETURN").reduce((s, p) => s + Number(p.amount), 0);
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const partnerName = (booking: any) => booking?.partner?.name || ((booking?.act?.payload && typeof booking.act.payload === "object") ? String((booking.act.payload as Record<string, unknown>).partnerName || "") : "") || "Без партнёра";
    const partnerMap = new Map<string, { bookings: number; income: number; expected: number; extensionAmount: number; commissionableIncome: number; partnerCommission: number }>();
    const rentalPaidByBooking = new Map<string, number>();
    const rentalPaidBeforePeriodByBooking = new Map<string, number>();
    for (const payment of allRentalPayments) if (payment.bookingId && payment.paymentDate < from) rentalPaidBeforePeriodByBooking.set(payment.bookingId, (rentalPaidBeforePeriodByBooking.get(payment.bookingId) || 0) + Number(payment.amount));
    for (const payment of payments) if (payment.paymentType === "RENTAL" && payment.bookingId) rentalPaidByBooking.set(payment.bookingId, (rentalPaidByBooking.get(payment.bookingId) || 0) + Number(payment.amount));
    for (const booking of bookings) {
      const name = partnerName(booking);
      const row = partnerMap.get(name) || { bookings: 0, income: 0, expected: 0, extensionAmount: 0, commissionableIncome: 0, partnerCommission: 0 };
      const extensionAmount = Number(booking.extensionAmount || 0);
      const rentalPaid = rentalPaidByBooking.get(booking.id) || 0;
      row.bookings += 1;
      row.expected += Math.max(0, Number(booking.totalPrice) - Number(booking.paidAmount));
      row.extensionAmount += extensionAmount;
      const paidBeforePeriod = rentalPaidBeforePeriodByBooking.get(booking.id) || 0;
      const commissionableIncome = calculateCommissionableRental(Number(booking.totalPrice), extensionAmount, paidBeforePeriod, paidBeforePeriod + rentalPaid);
      row.commissionableIncome += commissionableIncome;
      const payloadPartner = booking?.act?.payload && typeof booking.act.payload === "object" ? String((booking.act.payload as Record<string, unknown>).partnerName || "").trim().toLowerCase() : "";
      const partner = booking.partner || partners.find(item => item.name.trim().toLowerCase() === payloadPartner);
      const branchPercent = Number((booking.asset as any)?.branch?.commissionPercent || 0);
      if (partner && branchPercent > 0) row.partnerCommission += calculateLeadCommission(commissionableIncome, true, branchPercent);
      partnerMap.set(name, row);
    }
    for (const payment of payments) { const name = partnerName(payment.booking); const row = partnerMap.get(name) || { bookings: 0, income: 0, expected: 0, extensionAmount: 0, commissionableIncome: 0, partnerCommission: 0 }; if (payment.paymentType === "RENTAL") row.income += Number(payment.amount); partnerMap.set(name, row); }
    const partnerCommission = Array.from(partnerMap.values()).reduce((sum, row) => sum + row.partnerCommission, 0);
    const managerCommissionPercent = team.reduce((total, item) => total + Math.max(0, Number(item.commissionPercent)), 0);
    const managerCommission = calculateManagerCommission(income, [managerCommissionPercent]);
    return Response.json({
      generatedAt: new Date().toISOString(), period: { from: from.toISOString(), to: to.toISOString() },
      totals: { income, depositsHeld: Math.max(0, depositsHeld), expenses: expenseTotal, partnerCommission, managerCommission, cashIn: income + Math.max(0, depositsHeld), profit: income - expenseTotal - partnerCommission - managerCommission, bookings: bookings.length, payments: payments.length },
      payments: payments.map(p => ({ date: p.paymentDate, type: p.paymentType, amount: Number(p.amount), asset: p.booking?.asset.name ?? "", partner: partnerName(p.booking) })),
      expenses: expenses.map(e => ({ date: e.date, category: e.category, amount: Number(e.amount), asset: e.asset?.name ?? "" })),
      bookings: bookings.map(b => ({ clientName: b.clientName, clientPhone: b.clientPhone, assetName: b.asset.name, partner: partnerName(b), startDate: b.startDate, endDate: b.endDate, startTime: b.startTime, endTime: b.endTime, dailyRate: Number(b.dailyRate), totalPrice: Number(b.totalPrice), paidAmount: Number(b.paidAmount), extensionStartDate: b.extensionStartDate, extensionEndDate: b.extensionEndDate, extensionDays: b.extensionDays, extensionAmount: Number(b.extensionAmount || 0), partnerCommissionOnExtension: 0, depositAmount: Number(b.depositAmount), depositCurrency: b.depositCurrency, passportPhoto: b.passportPhoto, mileageLimitPerDay: b.mileageLimitPerDay, phoneHolder: b.phoneHolder, helmetCount: b.helmetCount, mileageAtHandover: b.mileageAtHandover, fuelLevel: b.fuelLevel, notes: b.notes, status: b.status })),
      partnerTotals: Array.from(partnerMap, ([partner, values]) => ({ partner, ...values }))
    });
  } catch (e) { return jsonError(e, 403); }
}
