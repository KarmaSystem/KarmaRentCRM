import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";
import { auditReason } from "@/lib/audit";
import { DEFAULT_RENTAL_CONDITIONS } from "@/lib/rental-conditions";


export async function GET(request: NextRequest) {
  try {
    const { user } = await getAccess(request);
    const bookingId = request.nextUrl.searchParams.get("bookingId");
    if (!bookingId) throw new Error("Не указан bookingId");
    const act = await prisma.handoverAct.findFirst({ where: { bookingId, userId: user.id } });
    if (!act) return Response.json({ exists: false });
    const configuredBaseUrl = process.env.APP_URL || process.env.TELEGRAM_WEBAPP_URL || request.nextUrl.origin;
    const baseUrl = /^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`;
    return Response.json({ exists: true, id: act.id, url: `${baseUrl.replace(/\/$/, "")}/acts/${act.publicToken}`, status: act.status, acceptedAt: act.acceptedAt, acceptedName: act.acceptedName });
  } catch (e) { return jsonError(e); }
}

export async function POST(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const { bookingId, partnerName } = await request.json();
    const booking = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, include: { asset: true, payments: true, act: true } });
    if (!booking) throw new Error("Бронь не найдена");
    const configuredBaseUrl = process.env.APP_URL || process.env.TELEGRAM_WEBAPP_URL || request.nextUrl.origin;
    const baseUrl = /^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`;
    if (booking.act?.status === "ACCEPTED") return Response.json({ id: booking.act.id, url: `${baseUrl.replace(/\/$/, "")}/acts/${booking.act.publicToken}`, token: booking.act.publicToken, status: booking.act.status, acceptedAt: booking.act.acceptedAt });
    const payload = { bookingId: booking.id, clientName: booking.clientName, clientPhone: booking.clientPhone, assetName: booking.asset.name, startDate: booking.startDate.toISOString(), endDate: booking.endDate.toISOString(), startTime: booking.startTime, endTime: booking.endTime, totalPrice: String(booking.totalPrice), dailyRate: String(booking.dailyRate), depositAmount: String(booking.depositAmount), depositCurrency: booking.depositCurrency, passportPhoto: booking.passportPhoto, mileageLimitPerDay: booking.mileageLimitPerDay, phoneHolder: booking.phoneHolder, helmetCount: booking.helmetCount, mileageAtHandover: booking.mileageAtHandover, fuelLevel: booking.fuelLevel, notes: booking.notes, rentalConditions: booking.asset.rentalConditions?.trim() || DEFAULT_RENTAL_CONDITIONS, partnerName: String(partnerName || "").trim() || null };
    const baseRentalTotal = Math.max(0, Number(booking.totalPrice) - Number(booking.extensionAmount || 0));
    const rentalPaid = booking.payments.filter(payment => payment.paymentType === "RENTAL").reduce((sum, payment) => sum + Number(payment.amount), 0);
    const depositPaid = booking.payments.filter(payment => payment.paymentType === "DEPOSIT").reduce((sum, payment) => sum + Number(payment.amount), 0);
    const rentalToRecord = Math.max(0, baseRentalTotal - rentalPaid);
    const depositToRecord = Math.max(0, Number(booking.depositAmount) - depositPaid);
    const act = await prisma.$transaction(async tx => {
      const saved = await tx.handoverAct.upsert({ where: { bookingId: booking.id }, update: { payload, status: "SENT", sharedAt: new Date() }, create: { userId: user.id, bookingId: booking.id, publicToken: randomBytes(32).toString("hex"), payload, status: "SENT", sharedAt: new Date() } });
      if (rentalToRecord > 0) await tx.payment.create({ data: { userId: user.id, bookingId: booking.id, amount: rentalToRecord, paymentType: "RENTAL", paymentMethod: "CASH", comment: "Оплата подтверждена при оформлении акта" } });
      if (depositToRecord > 0) await tx.payment.create({ data: { userId: user.id, bookingId: booking.id, amount: depositToRecord, paymentType: "DEPOSIT", paymentMethod: "CASH", comment: `Залог принят при оформлении акта (${booking.depositCurrency})` } });
      const nextPaidAmount = rentalPaid + rentalToRecord;
      if (Number(booking.paidAmount) !== nextPaidAmount) await tx.booking.update({ where: { id: booking.id }, data: { paidAmount: nextPaidAmount } });
      const before = { paidAmount: String(booking.paidAmount), rentalPaid, depositPaid, act: false };
      const after = { paidAmount: String(nextPaidAmount), rentalPaid: rentalPaid + rentalToRecord, depositPaid: depositPaid + depositToRecord, act: true, actStatus: "SENT" };
      await tx.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: booking.id, action: "ACT_PAYMENT", reason: auditReason("Акт создан и ссылка отправлена гостю; базовая аренда и депозит приняты, продление оплачивается отдельно", before, after, "Акт создан"), before, after } });
      return saved;
    });
    return Response.json({ id: act.id, url: `${baseUrl.replace(/\/$/, "")}/acts/${act.publicToken}`, token: act.publicToken, status: act.status, rentalRecorded: rentalToRecord, depositRecorded: depositToRecord });
  } catch (e) { return jsonError(e); }
}
