import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { paymentSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try { const user = await getUser(request); const input = paymentSchema.parse(await request.json()); if (input.bookingId) { const booking = await prisma.booking.findFirst({ where: { id: input.bookingId, userId: user.id } }); if (!booking) throw new Error("Бронь не найдена"); }
    const payment = await prisma.$transaction(async tx => { const created = await tx.payment.create({ data: { ...input, userId: user.id } }); if (input.bookingId && ["RENTAL", "DEPOSIT"].includes(input.paymentType)) await tx.booking.update({ where: { id: input.bookingId }, data: { paidAmount: { increment: input.amount } } }); return created; }); return Response.json(payment, { status: 201 });
  } catch (e) { return jsonError(e); }
}
