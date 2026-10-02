import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { calculateTotal, assertValidPhone } from "@/lib/rental";
import { bookingSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try { const user = await getUser(request); const bookings = await prisma.booking.findMany({ where: { userId: user.id }, include: { asset: true, payments: true }, orderBy: { startDate: "asc" } }); return Response.json(bookings); } catch (e) { return jsonError(e, 401); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request); const input = bookingSchema.parse(await request.json()); assertValidPhone(input.clientPhone);
    const asset = await prisma.asset.findFirst({ where: { id: input.assetId, userId: user.id, status: { not: "ARCHIVED" } } });
    if (!asset) throw new Error("Объект не найден или архивирован");
    if (input.endDate <= input.startDate) throw new Error("Дата окончания должна быть позже даты начала");
    const overlap = await prisma.booking.findFirst({ where: { userId: user.id, assetId: input.assetId, status: { notIn: ["CANCELLED", "COMPLETED"] }, startDate: { lt: input.endDate }, endDate: { gt: input.startDate } } });
    const block = await prisma.assetBlock.findFirst({ where: { userId: user.id, assetId: input.assetId, startDate: { lt: input.endDate }, endDate: { gt: input.startDate } } });
    if (overlap || block) throw new Error("Период пересекается с существующей бронью или блокировкой");
    const totalPrice = input.totalPrice ?? calculateTotal(input.startDate, input.endDate, input.dailyRate);
    const booking = await prisma.$transaction(async tx => {
      const created = await tx.booking.create({ data: { userId: user.id, assetId: input.assetId, clientName: input.clientName, clientPhone: input.clientPhone, startDate: input.startDate, endDate: input.endDate, dailyRate: input.dailyRate, totalPrice, paidAmount: input.paidAmount, depositAmount: input.depositAmount, notes: input.notes, status: input.maintenanceBlock ? "TECHNICAL" : input.status } });
      if (input.maintenanceBlock) await tx.assetBlock.create({ data: { userId: user.id, assetId: input.assetId, startDate: input.startDate, endDate: input.endDate, reason: input.notes || "Техническая блокировка" } });
      return created;
    });
    return Response.json(booking, { status: 201 });
  } catch (e) { return jsonError(e); }
}
