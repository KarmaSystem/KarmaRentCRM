import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    const { bookingId } = await request.json();
    const booking = await prisma.booking.findFirst({ where: { id: String(bookingId), userId: user.id }, include: { asset: true } });
    if (!booking) throw new Error("Бронь не найдена");
    const payload = {
      bookingId: booking.id,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      assetName: booking.asset.name,
      startDate: booking.startDate.toISOString(),
      endDate: booking.endDate.toISOString(),
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
      notes: booking.notes
    };
    const act = await prisma.handoverAct.upsert({ where: { bookingId: booking.id }, update: { payload }, create: { userId: user.id, bookingId: booking.id, payload } });
    const baseUrl = process.env.APP_URL || process.env.TELEGRAM_WEBAPP_URL || request.nextUrl.origin;
    return Response.json({ id: act.id, url: `${baseUrl.replace(/\/$/, "")}/acts/${act.publicToken}`, token: act.publicToken });
  } catch (e) { return jsonError(e); }
}
