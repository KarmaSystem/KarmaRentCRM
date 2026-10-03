import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const body = await request.json();
    const bookingId = String(body.bookingId || "");
    const requestedExtensionDays = Math.max(0, Math.floor(Number(body.days) || 0));
    if (!bookingId) throw new Error("Не указана бронь");
    if (!Number.isFinite(requestedExtensionDays)) throw new Error("Укажите количество суток продления");

    const current = await prisma.booking.findFirst({ where: { id: bookingId, userId: user.id } });
    if (!current) throw new Error("Бронь не найдена");
    const extensionBase = current.extensionStartDate || current.endDate;
    const nextEnd = new Date(extensionBase);
    nextEnd.setUTCDate(nextEnd.getUTCDate() + requestedExtensionDays);
    const overlap = await prisma.booking.findFirst({
      where: { userId: user.id, assetId: current.assetId, id: { not: bookingId }, status: { notIn: ["CANCELLED", "COMPLETED"] }, startDate: { lt: nextEnd }, endDate: { gt: current.startDate } },
    });
    if (overlap) throw new Error("Продление пересекается с другой бронью этого объекта");

    const dailyRate = body.dailyRate != null ? Number(body.dailyRate) : Number(current.dailyRate);
    if (!Number.isFinite(dailyRate) || dailyRate < 0) throw new Error("Некорректная ставка за сутки");

    const previousExtensionAmount = Number(current.extensionAmount || 0);
    const extensionAmount = requestedExtensionDays > 0 ? requestedExtensionDays * dailyRate : 0;
    const totalPrice = Number(current.totalPrice) - previousExtensionAmount + extensionAmount;
    const nextExtensionStart = requestedExtensionDays > 0 ? extensionBase : null;
    const nextExtensionEnd = requestedExtensionDays > 0 ? nextEnd : null;
    console.info(`[booking.extend] requested id=${bookingId} targetDays=${requestedExtensionDays} from=${extensionBase.toISOString()} to=${nextExtensionEnd?.toISOString() || "none"}`);
    const before = { startDate: current.startDate.toISOString(), endDate: current.endDate.toISOString(), startTime: current.startTime, endTime: current.endTime, dailyRate: String(current.dailyRate), totalPrice: String(current.totalPrice), extensionDays: current.extensionDays, extensionAmount: String(current.extensionAmount) };
    const after = { startDate: current.startDate.toISOString(), endDate: nextExtensionEnd?.toISOString() || extensionBase.toISOString(), startTime: current.startTime, endTime: current.endTime, dailyRate: String(dailyRate), totalPrice: String(totalPrice), extensionStartDate: nextExtensionStart?.toISOString() || null, extensionEndDate: nextExtensionEnd?.toISOString() || null, extensionDays: requestedExtensionDays, extensionAmount, partnerCommission: 0 };

    const updated = await prisma.$transaction(async tx => {
      const result = await tx.booking.update({ where: { id: bookingId }, data: { endDate: nextExtensionEnd || extensionBase, dailyRate, totalPrice, extensionStartDate: nextExtensionStart, extensionEndDate: nextExtensionEnd, extensionDays: requestedExtensionDays, extensionAmount } });
      const act = await tx.handoverAct.findUnique({ where: { bookingId } });
      if (act) {
        const oldPayload = act.payload && typeof act.payload === "object" ? act.payload as Record<string, unknown> : {};
        await tx.handoverAct.update({ where: { bookingId }, data: { payload: { ...oldPayload, endDate: (nextExtensionEnd || extensionBase).toISOString(), dailyRate: String(dailyRate), totalPrice: String(totalPrice), extension: requestedExtensionDays > 0 ? { from: extensionBase.toISOString(), to: nextEnd.toISOString(), days: requestedExtensionDays, amount: extensionAmount, partnerCommission: 0 } : null } } });
      }
      await tx.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: bookingId, action: "EXTEND", reason: String(body.reason || `Продление установлено: ${requestedExtensionDays} суток`), before, after } });
      return result;
    });
    console.info(`[booking.extend] saved id=${bookingId} endDate=${updated.endDate.toISOString()} totalPrice=${String(updated.totalPrice)}`);
    return Response.json({ ...updated, extensionDays: requestedExtensionDays });
  } catch (error) {
    console.error("[booking.extend] failed", error);
    return jsonError(error);
  }
}
