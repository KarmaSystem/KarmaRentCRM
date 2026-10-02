import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, getUser, jsonError } from "@/lib/api";
import { calculateTotal, assertValidPhone } from "@/lib/rental";
import { bookingSchema } from "@/lib/validation";

const rentalDaysByTime = (startDate: Date, endDate: Date, startTime: string, endTime: string) => {
  const start = new Date(`${startDate.toISOString().slice(0, 10)}T${startTime}`);
  const end = new Date(`${endDate.toISOString().slice(0, 10)}T${endTime}`);
  if (end <= start) throw new Error("Время возврата должно быть позже времени выдачи");
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
};

export async function GET(request: NextRequest) {
  try { const { user, member } = await getAccess(request); if (request.nextUrl.searchParams.get("archived") === "true" && member && !["ADMIN", "ACCOUNTANT"].includes(member.role)) throw new Error("Архив доступен администратору и бухгалтеру"); await prisma.booking.deleteMany({ where: { userId: user.id, status: "CANCELLED", archiveUntil: { lt: new Date() } } }); const archived = request.nextUrl.searchParams.get("archived") === "true"; const bookings = await prisma.booking.findMany({ where: { userId: user.id, status: archived ? "CANCELLED" : { not: "CANCELLED" } }, include: { asset: true, payments: true }, orderBy: { startDate: "asc" } }); return Response.json(bookings); } catch (e) { return jsonError(e, 401); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request); const input = bookingSchema.parse(await request.json()); assertValidPhone(input.clientPhone);
    const asset = await prisma.asset.findFirst({ where: { id: input.assetId, userId: user.id, status: { not: "ARCHIVED" } } });
    if (!asset) throw new Error("Объект не найден или архивирован");
    const rentalDays = rentalDaysByTime(input.startDate, input.endDate, input.startTime, input.endTime);
    const overlap = await prisma.booking.findFirst({ where: { userId: user.id, assetId: input.assetId, status: { notIn: ["CANCELLED", "COMPLETED"] }, startDate: { lt: input.endDate }, endDate: { gt: input.startDate } } });
    const block = await prisma.assetBlock.findFirst({ where: { userId: user.id, assetId: input.assetId, startDate: { lt: input.endDate }, endDate: { gt: input.startDate } } });
    if (overlap || block) throw new Error("Период пересекается с существующей бронью или блокировкой");
    const totalPrice = rentalDays * Number(input.dailyRate);
    const booking = await prisma.$transaction(async tx => {
      const created = await tx.booking.create({ data: { userId: user.id, assetId: input.assetId, clientName: input.clientName, clientPhone: input.clientPhone, startDate: input.startDate, endDate: input.endDate, startTime: input.startTime, endTime: input.endTime, dailyRate: input.dailyRate, totalPrice, paidAmount: input.paidAmount, depositAmount: input.depositAmount, depositCurrency: input.depositCurrency, passportPhoto: input.passportPhoto, mileageLimitPerDay: input.mileageLimitPerDay ?? null, phoneHolder: input.phoneHolder || null, helmetCount: input.helmetCount ?? null, mileageAtHandover: input.mileageAtHandover ?? null, fuelLevel: input.fuelLevel || null, notes: input.notes, status: input.maintenanceBlock ? "TECHNICAL" : input.status } });
      if (input.maintenanceBlock) await tx.assetBlock.create({ data: { userId: user.id, assetId: input.assetId, startDate: input.startDate, endDate: input.endDate, reason: input.notes || "Техническая блокировка" } });
      return created;
    });
    return Response.json(booking, { status: 201 });
  } catch (e) { return jsonError(e); }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const body = await request.json();
    const id = String(body.id);
    const current = await prisma.booking.findFirst({ where: { id, userId: user.id } });
    if (!current) throw new Error("Бронь не найдена");
    if (body.restore === true) {
      if (member && !["ADMIN", "ACCOUNTANT"].includes(member.role)) throw new Error("Восстановление доступно администратору и бухгалтеру");
      const conflict = await prisma.booking.findFirst({ where: { userId: user.id, assetId: current.assetId, id: { not: id }, status: { notIn: ["CANCELLED", "COMPLETED"] }, startDate: { lt: current.endDate }, endDate: { gt: current.startDate } } });
      if (conflict) throw new Error("Нельзя восстановить: период пересекается с действующей бронью");
      const restored = await prisma.booking.update({ where: { id }, data: { status: "PENDING", archiveUntil: null } });
      await prisma.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: id, action: "RESTORE", reason: "Бронь восстановлена из архива", before: { status: current.status }, after: { status: "PENDING", archiveUntil: null } } });
      return Response.json(restored);
    }
    const startDate = body.startDate ? new Date(body.startDate) : current.startDate;
    const endDate = body.endDate ? new Date(body.endDate) : current.endDate;
    const dailyRate = body.dailyRate != null ? Number(body.dailyRate) : Number(current.dailyRate);
    const nextStartTimeForCheck = String(body.startTime || current.startTime);
    const nextEndTimeForCheck = String(body.endTime || current.endTime);
    const days = rentalDaysByTime(startDate, endDate, nextStartTimeForCheck, nextEndTimeForCheck);
    const overlap = await prisma.booking.findFirst({ where: { userId: user.id, assetId: current.assetId, id: { not: id }, status: { notIn: ["CANCELLED", "COMPLETED"] }, startDate: { lt: endDate }, endDate: { gt: startDate } } });
    if (overlap) throw new Error("Новый период пересекается с другой бронью");
    const nextStartTime = String(body.startTime || current.startTime);
    const nextEndTime = String(body.endTime || current.endTime);
    const before = { startDate: current.startDate.toISOString(), endDate: current.endDate.toISOString(), startTime: current.startTime, endTime: current.endTime, dailyRate: String(current.dailyRate), totalPrice: String(current.totalPrice) };
    const after = { startDate: startDate.toISOString(), endDate: endDate.toISOString(), startTime: nextStartTime, endTime: nextEndTime, dailyRate: String(dailyRate), totalPrice: String(days * dailyRate) };
    const updated = await prisma.$transaction(async tx => {
      const result = await tx.booking.update({ where: { id }, data: { startDate, endDate, startTime: nextStartTime, endTime: nextEndTime, dailyRate, totalPrice: days * dailyRate } });
      const existingAct = await tx.handoverAct.findUnique({ where: { bookingId: id } });
      if (existingAct) {
        const oldPayload = (existingAct.payload && typeof existingAct.payload === "object") ? existingAct.payload as Record<string, unknown> : {};
        await tx.handoverAct.update({ where: { bookingId: id }, data: { payload: { ...oldPayload, startDate: startDate.toISOString(), endDate: endDate.toISOString(), startTime: nextStartTime, endTime: nextEndTime, dailyRate: String(dailyRate), totalPrice: String(days * dailyRate) } } });
      }
      await tx.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: id, action: "UPDATE", reason: String(body.reason || "Без комментария"), before, after } });
      return result;
    });
    return Response.json(updated);
  } catch (e) { return jsonError(e); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const id = String(request.nextUrl.searchParams.get("id") || (await request.json().catch(() => ({}))).id);
    const current = await prisma.booking.findFirst({ where: { id, userId: user.id } });
    if (!current) throw new Error("Бронь не найдена");
    const archiveUntil = new Date(Date.now() + 14 * 86400000);
    const updated = await prisma.booking.update({ where: { id }, data: { status: "CANCELLED", archiveUntil } });
    await prisma.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: id, action: "ARCHIVE", reason: "Бронь удалена в архив на 14 дней", before: { status: current.status }, after: { status: "CANCELLED", archiveUntil: archiveUntil.toISOString() } } });
    return Response.json({ ok: true, archiveUntil, booking: updated });
  } catch (e) { return jsonError(e); }
}
