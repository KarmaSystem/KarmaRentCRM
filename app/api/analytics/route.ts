import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";
import { addDays, differenceInCalendarDays, startOfDay } from "date-fns";

const money = (value: unknown) => Number(value || 0);
const statusLabel = (status: string) => ({ PENDING: "Ожидает подтверждения", CONFIRMED: "Подтверждена", PAID: "Оплачена", ACTIVE: "В аренде", COMPLETED: "Завершена", CANCELLED: "Отменена" } as Record<string, string>)[status] || status;

export async function GET(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const today = startOfDay(new Date());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const tomorrow = addDays(today, 1);
    const week = addDays(today, 7);
    const monthDays = differenceInCalendarDays(monthEnd, monthStart);
    const [bookings, allPayments, expenses, assets, blocks, team, branches, partners] = await Promise.all([
      prisma.booking.findMany({ where: { userId: user.id, status: { not: "CANCELLED" }, startDate: { lt: monthEnd }, endDate: { gte: monthStart } }, include: { asset: true, partner: true, act: true }, orderBy: { startDate: "asc" } }),
      prisma.payment.findMany({ where: { userId: user.id } }),
      prisma.expense.findMany({ where: { userId: user.id, date: { gte: monthStart, lt: monthEnd } }, include: { asset: true } }),
      prisma.asset.findMany({ where: { userId: user.id }, include: { branch: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.assetBlock.findMany({ where: { userId: user.id } }),
      prisma.teamMember.findMany({ where: { ownerId: user.id, active: true }, select: { commissionPercent: true } }),
      prisma.branch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.partner.findMany({ where: { userId: user.id } }),
    ]);
    const monthPayments = allPayments.filter(payment => payment.paymentDate >= monthStart && payment.paymentDate < monthEnd);
    const rentalPayments = monthPayments.filter(payment => payment.paymentType === "RENTAL");
    const depositPayments = monthPayments.filter(payment => payment.paymentType === "DEPOSIT");
    const depositReturns = monthPayments.filter(payment => payment.paymentType === "DEPOSIT_RETURN");
    const allRentalByBooking = new Map<string, number>();
    const monthRentalByBooking = new Map<string, number>();
    const depositByBooking = new Map<string, number>();
    for (const payment of allPayments) {
      if (payment.paymentType === "RENTAL" && payment.bookingId) allRentalByBooking.set(payment.bookingId, (allRentalByBooking.get(payment.bookingId) || 0) + money(payment.amount));
      if (payment.paymentType === "DEPOSIT" && payment.bookingId) depositByBooking.set(payment.bookingId, (depositByBooking.get(payment.bookingId) || 0) + money(payment.amount));
    }
    for (const payment of rentalPayments) if (payment.bookingId) monthRentalByBooking.set(payment.bookingId, (monthRentalByBooking.get(payment.bookingId) || 0) + money(payment.amount));
    const fallbackRevenue = bookings.filter(booking => booking.createdAt >= monthStart && !allRentalByBooking.has(booking.id)).reduce((sum, booking) => sum + Math.max(0, money(booking.paidAmount) - (depositByBooking.get(booking.id) || 0)), 0);
    const grossRevenue = rentalPayments.reduce((sum, payment) => sum + money(payment.amount), 0) + fallbackRevenue;
    const deposits = Math.max(0, depositPayments.reduce((sum, payment) => sum + money(payment.amount), 0) - depositReturns.reduce((sum, payment) => sum + money(payment.amount), 0));
    const expensesTotal = expenses.reduce((sum, expense) => sum + money(expense.amount), 0);
    const periodRentalFor = (booking: { id: string; paidAmount: unknown; createdAt: Date }) => monthRentalByBooking.get(booking.id) || (booking.createdAt >= monthStart && !allRentalByBooking.has(booking.id) ? Math.max(0, money(booking.paidAmount) - (depositByBooking.get(booking.id) || 0)) : 0);
    const totalRentalPaidFor = (booking: { id: string; paidAmount: unknown }) => allRentalByBooking.get(booking.id) || Math.max(0, money(booking.paidAmount) - (depositByBooking.get(booking.id) || 0));
    const partnerFor = (booking: { partner?: { name: string; commissionType: string; commissionValue: unknown } | null; act?: { payload: unknown } | null }) => {
      if (booking.partner) return booking.partner;
      const payload = booking.act?.payload && typeof booking.act.payload === "object" ? booking.act.payload as Record<string, unknown> : {};
      const name = String(payload.partnerName || "").trim().toLowerCase();
      return partners.find(partner => partner.name.trim().toLowerCase() === name) || null;
    };
    const partnerCommission = bookings.reduce((sum, booking) => {
      const partner = partnerFor(booking); if (!partner || partner.commissionType !== "PERCENT") return sum;
      return sum + Math.max(0, periodRentalFor(booking) - money(booking.extensionAmount)) * money(partner.commissionValue) / 100;
    }, 0);
    const expected = bookings.reduce((sum, booking) => sum + Math.max(0, money(booking.totalPrice) - totalRentalPaidFor(booking)), 0);
    const configuredManagerPercent = team.reduce((max, item) => Math.max(max, money(item.commissionPercent)), 0);
    const manager = Boolean(member);
    const managerPercent = member ? money(member.commissionPercent) : 0;
    const commission = grossRevenue * managerPercent / 100;
    const managerCommission = manager ? commission : grossRevenue * configuredManagerPercent / 100;
    const branchRows = branches.map(branch => {
      const branchAssets = assets.filter(asset => asset.branchId === branch.id);
      const branchIncome = branchAssets.reduce((sum, asset) => sum + bookings.filter(booking => booking.assetId === asset.id).reduce((inner, booking) => inner + periodRentalFor(booking), 0), 0);
      const branchExpenses = expenses.filter(expense => expense.branchId === branch.id).reduce((sum, expense) => sum + money(expense.amount), 0);
      const branchCommission = branchIncome * money(branch.commissionPercent) / 100;
      return { id: branch.id, name: branch.name, commissionPercent: money(branch.commissionPercent), income: branchIncome, expenses: branchExpenses, cashIn: branchIncome - branchExpenses, commission: branchCommission };
    });
    const branchCommissionTotal = branchRows.reduce((sum, branch) => sum + branch.commission, 0);
    const cashIn = grossRevenue + deposits;
    const netAfterCommissions = grossRevenue - expensesTotal - partnerCommission - managerCommission - branchCommissionTotal;
    const rentalDays = bookings.reduce((sum, booking) => { const start = booking.startDate < monthStart ? monthStart : booking.startDate; const end = booking.endDate > monthEnd ? monthEnd : booking.endDate; return sum + Math.max(0, differenceInCalendarDays(end, start)); }, 0);
    const todayReturns = bookings.filter(booking => booking.endDate >= today && booking.endDate < tomorrow).map(booking => ({ id: booking.id, clientName: booking.clientName, assetName: booking.asset.name, time: booking.endDate.toISOString(), status: booking.status, statusLabel: statusLabel(booking.status) }));
    const todayPickups = bookings.filter(booking => booking.startDate >= today && booking.startDate < tomorrow).map(booking => ({ id: booking.id, clientName: booking.clientName, assetName: booking.asset.name, time: booking.startDate.toISOString(), status: booking.status, statusLabel: statusLabel(booking.status) }));
    const upcomingPayments = bookings.filter(booking => !["CANCELLED", "COMPLETED", "PAID"].includes(booking.status) && ((booking.endDate >= today && booking.startDate <= week) || money(booking.extensionAmount) > 0) && money(booking.totalPrice) - totalRentalPaidFor(booking) > 0).map(booking => ({ id: booking.id, clientName: booking.clientName, assetName: booking.asset.name, amount: Math.max(0, money(booking.totalPrice) - totalRentalPaidFor(booking)), date: booking.startDate.toISOString(), status: booking.status, statusLabel: "Ожидается оплата" }));
    const serviceAssets = assets.filter(asset => { const mileage = asset.currentMileage ?? 0; return asset.status === "MAINTENANCE" || (asset.serviceMileage != null && mileage >= asset.serviceMileage) || (asset.oilChangeMileage != null && mileage >= asset.oilChangeMileage) || (asset.variatorServiceMileage != null && mileage >= asset.variatorServiceMileage); }).map(asset => ({ id: asset.id, name: asset.name, status: asset.status, currentMileage: asset.currentMileage, serviceMileage: asset.serviceMileage, oilChangeMileage: asset.oilChangeMileage, variatorServiceMileage: asset.variatorServiceMileage, lastServiceDate: asset.lastServiceDate, serviceNote: asset.serviceNote || "" }));
    const byAsset = assets.map(asset => {
      const assetBookings = bookings.filter(booking => booking.assetId === asset.id);
      const baseIncome = assetBookings.reduce((sum, booking) => sum + periodRentalFor(booking), 0);
      const income = manager ? baseIncome * managerPercent / 100 : baseIncome;
      const assetExpenses = manager ? 0 : expenses.filter(expense => expense.assetId === asset.id).reduce((sum, expense) => sum + money(expense.amount), 0);
      const days = assetBookings.reduce((sum, booking) => sum + Math.max(0, differenceInCalendarDays(booking.endDate, booking.startDate)), 0);
      const blockedDays = blocks.filter(block => block.assetId === asset.id).reduce((sum, block) => sum + Math.max(0, differenceInCalendarDays(block.endDate, block.startDate)), 0);
      const monthRentalDays = assetBookings.reduce((sum, booking) => { const start = booking.startDate < monthStart ? monthStart : booking.startDate; const end = booking.endDate > monthEnd ? monthEnd : booking.endDate; return sum + Math.max(0, differenceInCalendarDays(end, start)); }, 0);
      return { assetId: asset.id, name: asset.name, status: asset.status, statusColor: asset.statusColor, currentMileage: asset.currentMileage, oilChangeMileage: asset.oilChangeMileage, variatorServiceMileage: asset.variatorServiceMileage, lastServiceDate: asset.lastServiceDate, serviceNote: asset.serviceNote, rentalDays: days, blockedDays, income, expenses: assetExpenses, profit: income - assetExpenses, bookings: assetBookings.length, monthlyIdle: Math.max(0, monthDays - monthRentalDays) };
    });
    return Response.json({ revenue: manager ? 0 : grossRevenue, deposits: manager ? 0 : deposits, expenses: manager ? 0 : expensesTotal, partnerCommission: manager ? 0 : partnerCommission, branchCommission: manager ? 0 : branchCommissionTotal, managerCommission, branches: manager ? [] : branchRows, cashIn: manager ? 0 : cashIn, net: manager ? commission : netAfterCommissions, expected: manager ? 0 : expected, commissionPercent: manager ? managerPercent : configuredManagerPercent, commission, isManager: manager, period: { from: monthStart.toISOString(), to: monthEnd.toISOString() }, bookings: bookings.length, rentalDays, blockedDays: blocks.reduce((sum, block) => sum + Math.max(0, differenceInCalendarDays(block.endDate, block.startDate)), 0), byAsset, todayReturns, todayPickups, upcomingPayments, serviceAssets });
  } catch (error) { console.error("[analytics] failed", error); return jsonError(error, 401); }
}
