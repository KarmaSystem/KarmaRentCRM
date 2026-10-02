import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    if (member || !["OWNER", "ADMIN", "ACCOUNTANT"].includes(user.role)) throw new Error("Отчёты доступны владельцу, администратору и бухгалтеру");
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ? new Date(url.searchParams.get("from")!) : startOfMonth(new Date());
    const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : endOfMonth(new Date());
    const partnerQuery = url.searchParams.get("partner")?.trim() || undefined;
    const bookingScope = { userId: user.id, startDate: { lte: to }, endDate: { gte: from }, status: { not: "CANCELLED" as const }, ...(partnerQuery ? { partner: { name: { contains: partnerQuery, mode: "insensitive" as const } } } : {}) };
    const [payments, expenses, bookings] = await Promise.all([
      prisma.payment.findMany({ where: { userId: user.id, paymentDate: { gte: from, lte: to }, ...(partnerQuery ? { booking: { partner: { name: { contains: partnerQuery, mode: "insensitive" } } } } : {}) }, include: { booking: { include: { asset: true, partner: true, act: true } } }, orderBy: { paymentDate: "asc" } }),
      prisma.expense.findMany({ where: { userId: user.id, date: { gte: from, lte: to } }, include: { asset: true }, orderBy: { date: "asc" } }),
      prisma.booking.findMany({ where: bookingScope, include: { asset: true, partner: true, act: true }, orderBy: { startDate: "asc" } })
    ]);
    const income = payments.filter(p => ["RENTAL", "DEPOSIT"].includes(p.paymentType)).reduce((s, p) => s + Number(p.amount), 0);
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const partnerName = (booking: any) => booking?.partner?.name || ((booking?.act?.payload && typeof booking.act.payload === "object") ? String((booking.act.payload as Record<string, unknown>).partnerName || "") : "") || "Без партнёра";
    const partnerMap = new Map<string, { bookings: number; income: number; expected: number }>();
    for (const booking of bookings) { const name = partnerName(booking); const row = partnerMap.get(name) || { bookings: 0, income: 0, expected: 0 }; row.bookings += 1; row.expected += Math.max(0, Number(booking.totalPrice) - Number(booking.paidAmount)); partnerMap.set(name, row); }
    for (const payment of payments) { const name = partnerName(payment.booking); const row = partnerMap.get(name) || { bookings: 0, income: 0, expected: 0 }; if (["RENTAL", "DEPOSIT"].includes(payment.paymentType)) row.income += Number(payment.amount); partnerMap.set(name, row); }
    return Response.json({
      generatedAt: new Date().toISOString(), period: { from: from.toISOString(), to: to.toISOString() },
      totals: { income, expenses: expenseTotal, profit: income - expenseTotal, bookings: bookings.length, payments: payments.length },
      payments: payments.map(p => ({ date: p.paymentDate, type: p.paymentType, amount: Number(p.amount), asset: p.booking?.asset.name ?? "", partner: partnerName(p.booking) })),
      expenses: expenses.map(e => ({ date: e.date, category: e.category, amount: Number(e.amount), asset: e.asset?.name ?? "" })),
      bookings: bookings.map(b => ({ clientName: b.clientName, clientPhone: b.clientPhone, assetName: b.asset.name, partner: partnerName(b), startDate: b.startDate, endDate: b.endDate, startTime: b.startTime, endTime: b.endTime, dailyRate: Number(b.dailyRate), totalPrice: Number(b.totalPrice), paidAmount: Number(b.paidAmount), depositAmount: Number(b.depositAmount), depositCurrency: b.depositCurrency, passportPhoto: b.passportPhoto, mileageLimitPerDay: b.mileageLimitPerDay, phoneHolder: b.phoneHolder, helmetCount: b.helmetCount, mileageAtHandover: b.mileageAtHandover, fuelLevel: b.fuelLevel, notes: b.notes, status: b.status })),
      partnerTotals: Array.from(partnerMap, ([partner, values]) => ({ partner, ...values }))
    });
  } catch (e) { return jsonError(e, 403); }
}
