import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";

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
    const user = await getUser(request);
    const { bookingId, partnerName } = await request.json();
    const booking = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, include: { asset: true } });
    if (!booking) throw new Error("Бронь не найдена");
    const payload = {
      bookingId: booking.id,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      assetName: booking.asset.name,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: String(booking.totalPrice),
      dailyRate: String(booking.dailyRate),
      depositAmount: String(booking.depositAmount),
      depositCurrency: booking.depositCurrency,
      passportPhoto: booking.passportPhoto,
      mileageLimitPerDay: booking.mileageLimitPerDay,
      phoneHolder: booking.phoneHolder,
      helmetCount: booking.helmetCount,
      mileageAtHandover: booking.mileageAtHandover,
      fuelLevel: booking.fuelLevel,
      notes: booking.notes, rentalConditions: booking.asset.rentalConditions || DEFAULT_RENTAL_CONDITIONS, partnerName: String(partnerName || "").trim() || null
    };
    const act = await prisma.handoverAct.upsert({ where: { bookingId: booking.id }, update: { payload }, create: { userId: user.id, bookingId: booking.id, payload } });
    const configuredBaseUrl = process.env.APP_URL || process.env.TELEGRAM_WEBAPP_URL || request.nextUrl.origin; const baseUrl = /^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`;
    return Response.json({ id: act.id, url: `${baseUrl.replace(/\/$/, "")}/acts/${act.publicToken}`, token: act.publicToken });
  } catch (e) { return jsonError(e); }
}
