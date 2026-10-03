import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, jsonError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    const body = await request.json().catch(() => ({}));
    const id = String(body.bookingId || "");
    const returnFuelLevel = String(body.returnFuelLevel || "").trim().slice(0, 40) || null;
    const returnMileage = body.returnMileage === "" || body.returnMileage == null ? null : Number(body.returnMileage);
    const returnComment = String(body.returnComment || "").trim().slice(0, 1000) || null;
    const surchargeType = String(body.surchargeType || "OTHER").trim().slice(0, 30) || "OTHER";
    const surcharge = Number(body.surcharge || 0);
    if (!id) throw new Error("Не указана бронь");
    if (returnMileage !== null && (!Number.isInteger(returnMileage) || returnMileage < 0)) throw new Error("Пробег при возврате должен быть целым неотрицательным числом");
    if (!Number.isFinite(surcharge) || surcharge < 0) throw new Error("Доплата должна быть неотрицательной суммой");

    const result = await prisma.$transaction(async tx => {
      const booking = await tx.booking.findFirst({ where: { id, userId: user.id }, include: { asset: true } });
      if (!booking) throw new Error("Бронь не найдена");
      if (booking.status === "CANCELLED") throw new Error("Архивную бронь нельзя принять");
      if (booking.status === "COMPLETED") throw new Error("Байк по этой брони уже принят");

      const before = { status: booking.status, assetStatus: booking.asset.status, returnFuelLevel: booking.returnFuelLevel, returnMileage: booking.returnMileage, returnComment: booking.returnComment, returnSurcharge: String(booking.returnSurcharge), returnSurchargeType: booking.returnSurchargeType };
      const depositAmount = Number(booking.depositAmount);
      const existingDepositReturn = await tx.payment.aggregate({ where: { bookingId: id, userId: user.id, paymentType: "DEPOSIT_RETURN" }, _sum: { amount: true } });
      const alreadyReturned = Number(existingDepositReturn._sum.amount || 0);
      const refundAmount = Math.max(0, depositAmount - alreadyReturned);
      const updated = await tx.booking.update({ where: { id }, data: { status: "COMPLETED", returnFuelLevel, returnMileage, returnComment, returnSurcharge: surcharge, returnSurchargeType: surcharge > 0 ? surchargeType : null, ...(surcharge > 0 ? { paidAmount: { increment: surcharge } } : {}) }, include: { asset: true } });
      await tx.asset.update({ where: { id: booking.assetId }, data: { status: "AVAILABLE" } });
      if (refundAmount > 0) await tx.payment.create({ data: { userId: user.id, bookingId: id, amount: refundAmount, paymentType: "DEPOSIT_RETURN", paymentMethod: "CASH", branchId: booking.asset.branchId, comment: "Автоматический возврат депозита при приёме байка" } });
      if (surcharge > 0) {
        await tx.payment.create({ data: { userId: user.id, bookingId: id, amount: surcharge, paymentType: "RENTAL", paymentMethod: "CASH", branchId: booking.asset.branchId, comment: `Доплата (${surchargeType}) при возврате. Бензин: ${returnFuelLevel || "не указан"}. Пробег: ${returnMileage ?? "не указан"}. ${returnComment || ""}` } });
      }
      await tx.auditLog.create({ data: { userId: user.id, actorName: member?.name || "Владелец", actorRole: member?.role || "OWNER", entity: "BOOKING", entityId: id, action: "RETURN", reason: `Приём байка. Бензин при возврате: ${returnFuelLevel || "не указан"}. Пробег: ${returnMileage ?? "не указан"}. ${returnComment ? `Комментарий: ${returnComment}. ` : ""}${surcharge > 0 ? `Доплата (${surchargeType}): ${surcharge} ₫.` : "Доплаты нет."} ${refundAmount > 0 ? `Возвращён депозит ${refundAmount} ${booking.depositCurrency}.` : "Депозит уже возвращён или не указан."}`, before, after: { status: "COMPLETED", assetStatus: "AVAILABLE", returnFuelLevel, returnMileage, returnComment, returnSurcharge: surcharge, surchargeType, refundAmount } } });
      return { booking: updated, refundAmount, depositCurrency: booking.depositCurrency, surcharge, returnFuelLevel, returnMileage, returnComment, surchargeType };
    });

    return Response.json({ ok: true, booking: result.booking, refundedDeposit: result.refundAmount, depositCurrency: result.depositCurrency, surcharge: result.surcharge, returnFuelLevel: result.returnFuelLevel, returnMileage: result.returnMileage, returnComment: result.returnComment, surchargeType: result.surchargeType, message: `Байк принят. Бензин: ${result.returnFuelLevel || "не указан"}. ${result.surcharge > 0 ? `Доплата ${result.surcharge} ₫ зафиксирована. ` : ""}${result.refundAmount > 0 ? `Депозит возвращён: ${result.refundAmount} ${result.depositCurrency}.` : "Депозит уже возвращён или не указан."}` });
  } catch (error) {
    return jsonError(error);
  }
}
