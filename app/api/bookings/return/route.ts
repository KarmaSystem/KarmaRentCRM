import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const { bookingId } = await request.json().catch(() => ({}));
    const id = String(bookingId || "");
    if (!id) throw new Error("Не указана бронь");

    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findFirst({
        where: { id, userId: user.id },
        include: { asset: true },
      });
      if (!booking) throw new Error("Бронь не найдена");
      if (booking.status === "CANCELLED") throw new Error("Архивную бронь нельзя принять");
      if (booking.status === "COMPLETED") throw new Error("Байк по этой брони уже принят");

      const before = {
        status: booking.status,
        assetStatus: booking.asset.status,
        depositAmount: String(booking.depositAmount),
      };
      const depositAmount = Number(booking.depositAmount);
      const existingDepositReturn = await tx.payment.aggregate({
        where: { bookingId: id, userId: user.id, paymentType: "DEPOSIT_RETURN" },
        _sum: { amount: true },
      });
      const alreadyReturned = Number(existingDepositReturn._sum.amount || 0);
      const refundAmount = Math.max(0, depositAmount - alreadyReturned);

      const updated = await tx.booking.update({
        where: { id },
        data: { status: "COMPLETED" },
        include: { asset: true },
      });
      await tx.asset.update({
        where: { id: booking.assetId },
        data: { status: "AVAILABLE" },
      });
      if (refundAmount > 0) {
        await tx.payment.create({
          data: {
            userId: user.id,
            bookingId: id,
            amount: refundAmount,
            paymentType: "DEPOSIT_RETURN",
            paymentMethod: "CASH",
            branchId: booking.asset.branchId,
            comment: "Автоматический возврат депозита при приёме байка",
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          actorName: member?.name || "Владелец",
          actorRole: member?.role || "OWNER",
          entity: "BOOKING",
          entityId: id,
          action: "RETURN",
          reason: `Приём байка. ${refundAmount > 0 ? `Возвращён депозит ${refundAmount} ${booking.depositCurrency}.` : "Депозит к возврату отсутствует или уже возвращён."}`,
          before,
          after: { status: "COMPLETED", assetStatus: "AVAILABLE", refundAmount },
        },
      });
      return { booking: updated, refundAmount, depositCurrency: booking.depositCurrency };
    });

    return Response.json({
      ok: true,
      booking: result.booking,
      refundedDeposit: result.refundAmount,
      depositCurrency: result.depositCurrency,
      message: result.refundAmount > 0
        ? `Байк принят. Депозит возвращён: ${result.refundAmount} ${result.depositCurrency}.`
        : "Байк принят. Депозит уже возвращён или не указан.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
