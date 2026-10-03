import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";

const rentalDays = (startDate: Date, endDate: Date, startTime: string, endTime: string) => {
  const start = new Date(`${startDate.toISOString().slice(0, 10)}T${startTime}`);
  const end = new Date(`${endDate.toISOString().slice(0, 10)}T${endTime}`);
  if (end <= start) throw new Error("Время возврата должно быть позже времени выдачи");
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
};

export async function POST(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const body = await request.json();
    const bookingId = String(body.bookingId || "");
    const daysToAdd = Math.max(1, Math.floor(Number(body.days) || 0));
    if (!bookingId) throw new Error("Не указана бронь");
    if (!Number.isFinite(daysToAdd) || daysToAdd < 1) throw new Error("Укажите количество суток продления");

    const current = await prisma.booking.findFirst({ where: { id: bookingId, userId: user.id } });
    if (!current) throw new Error("Бронь не найдена");
    const nextEnd = new Date(current.endDate);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + daysToAdd);
    const overlap = await prisma.booking.findFirst({
      where: { userId: user.id, assetId: current.assetId, id: { not: bookingId }, status: { notIn: ["CANCELLED", "COMPLETED"] }, startDate: { lt: nextEnd }, endDate: { gt: current.startDate } },
    });
    if (overlap) throw new Error("Продление пересекается с другой бронью этого объекта");

    const dailyRate = body.dailyRate != null ? Number(body.dailyRate) : Number(current.dailyRate);
    if (!Number.isFinite(dailyRate) || dailyRate < 0) throw new Error("Некорректная ставка за сутки");
    const totalPrice = rentalDays(current.startDate, nextEnd, String(current.startTime || "12:00"), String(current.endTime || "12:00")) * dailyRate;
    console.info(`[booking.extend] requested id=${bookingId} addDays=${daysToAdd} from=${current.endDate.toISOString()} to=${nextEnd.toISOString()}`);
    const before = { startDate: current.startDate.toISOString(), endDate: current.endDate.toISOString(), startTime: current.startTime, endTime: current.endTime, dailyRate: String(current.dailyRate), totalPrice: String(current.totalPrice) };
    const after = { startDate: current.startDate.toISOString(), endDate: nextEnd.toISOString(), startTime: current.startTime, endTime: current.endTime, dailyRate: String(dailyRate), totalPrice: String(totalPrice) };

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.booking.update({ where: { id: bookingId }, data: { endDate: nextEnd, dailyRate, totalPrice } });
      const act = await tx.handoverAct.findUnique({ where: { bookingId } });
      if (act) {
        const oldPayload = act.payload && typeof act.payload === "object" ? act.payload as Record<string, unknown> : {};
        await tx.handoverAct.update({ where: { bookingId }, data: { payload: { ...oldPayload, endDate: nextEnd.toISOString(), dailyRate: String(dailyRate), totalPrice: String(totalPrice) } } });
      }
      await tx.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: bookingId, action: "EXTEND", reason: String(body.reason || `Продление на ${daysToAdd} суток`), before, after } });
      return result;
    });
    console.info(`[booking.extend] saved id=${bookingId} endDate=${updated.endDate.toISOString()} totalPrice=${String(updated.totalPrice)}`);
    return Response.json({ ...updated, extensionDays: daysToAdd });
  } catch (error) {
    console.error("[booking.extend] failed", error);
    return jsonError(error);
  }
}
