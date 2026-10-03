import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";
import { auditReason } from "@/lib/audit";

const DEFAULT_RENTAL_CONDITIONS = `❗️ Важные условия:
🚫 Запрещено:
Передавать байк другим людям без согласования.
Ездить в состоянии алкогольного или наркотического опьянения.
Ездить по песку, воде и бездорожью.
Участвовать в гонках.
Оставлять байк в небезопасных местах.
Самостоятельно ремонтировать или разбирать байк.
⛽️ Бензин — ответственность клиента. Вернуть байк нужно с тем же уровнем топлива. Заправка перед возвратом силами компании — 150 000₫.
❗️ Досрочный возврат без перерасчёта: оплата за зарезервированный срок не возвращается.
🛣️ Лимит пробега: в пределах города до 100 км в день.
🛵 Клиент отвечает за байк, ключи, шлемы и аксессуары, включая угон, повреждения, ДТП, штрафы и эвакуацию.
🔐 Парковать только в безопасных местах, закрывать руль/замок и не оставлять ключи в байке.
📸 Перед арендой фиксируем внешний вид байка, пробег, бензин, ключи, шлемы и аксессуары.`;

export async function POST(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const { bookingId, partnerName } = await request.json();
    const booking = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, include: { asset: true, payments: true } });
    if (!booking) throw new Error("Бронь не найдена");
    const payload = { bookingId: booking.id, clientName: booking.clientName, clientPhone: booking.clientPhone, assetName: booking.asset.name, startDate: booking.startDate.toISOString(), endDate: booking.endDate.toISOString(), startTime: booking.startTime, endTime: booking.endTime, totalPrice: String(booking.totalPrice), dailyRate: String(booking.dailyRate), depositAmount: String(booking.depositAmount), depositCurrency: booking.depositCurrency, passportPhoto: booking.passportPhoto, mileageLimitPerDay: booking.mileageLimitPerDay, phoneHolder: booking.phoneHolder, helmetCount: booking.helmetCount, mileageAtHandover: booking.mileageAtHandover, fuelLevel: booking.fuelLevel, notes: booking.notes, rentalConditions: booking.asset.rentalConditions || DEFAULT_RENTAL_CONDITIONS, partnerName: String(partnerName || "").trim() || null };
    const baseRentalTotal = Math.max(0, Number(booking.totalPrice) - Number(booking.extensionAmount || 0));
    const rentalPaid = booking.payments.filter(payment => payment.paymentType === "RENTAL").reduce((sum, payment) => sum + Number(payment.amount), 0);
    const depositPaid = booking.payments.filter(payment => payment.paymentType === "DEPOSIT").reduce((sum, payment) => sum + Number(payment.amount), 0);
    const rentalToRecord = Math.max(0, baseRentalTotal - rentalPaid);
    const depositToRecord = Math.max(0, Number(booking.depositAmount) - depositPaid);
    const act = await prisma.$transaction(async tx => {
      const saved = await tx.handoverAct.upsert({ where: { bookingId: booking.id }, update: { payload }, create: { userId: user.id, bookingId: booking.id, payload } });
      if (rentalToRecord > 0) await tx.payment.create({ data: { userId: user.id, bookingId: booking.id, amount: rentalToRecord, paymentType: "RENTAL", paymentMethod: "CASH", comment: "Оплата подтверждена при оформлении акта" } });
      if (depositToRecord > 0) await tx.payment.create({ data: { userId: user.id, bookingId: booking.id, amount: depositToRecord, paymentType: "DEPOSIT", paymentMethod: "CASH", comment: `Залог принят при оформлении акта (${booking.depositCurrency})` } });
      const nextPaidAmount = rentalPaid + rentalToRecord;
      if (Number(booking.paidAmount) !== nextPaidAmount) await tx.booking.update({ where: { id: booking.id }, data: { paidAmount: nextPaidAmount } });
      const before = { paidAmount: String(booking.paidAmount), rentalPaid, depositPaid, act: false };
      const after = { paidAmount: String(nextPaidAmount), rentalPaid: rentalPaid + rentalToRecord, depositPaid: depositPaid + depositToRecord, act: true };
      await tx.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: booking.id, action: "ACT_PAYMENT", reason: auditReason("Акт оформлен: базовая аренда и депозит приняты; продление оплачивается отдельно", before, after, "Акт оформлен"), before, after } });
      return saved;
    });
    const configuredBaseUrl = process.env.APP_URL || process.env.TELEGRAM_WEBAPP_URL || request.nextUrl.origin;
    const baseUrl = /^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`;
    return Response.json({ id: act.id, url: `${baseUrl.replace(/\/$/, "")}/acts/${act.publicToken}`, token: act.publicToken, rentalRecorded: rentalToRecord, depositRecorded: depositToRecord });
  } catch (e) { return jsonError(e); }
}
