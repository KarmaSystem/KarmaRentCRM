import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try { const user = await getUser(request); const bookingId = String(request.nextUrl.searchParams.get("bookingId") || ""); if (!bookingId) throw new Error("Не указана бронь"); const rows = await prisma.bookingMedia.findMany({ where: { userId: user.id, bookingId }, orderBy: { createdAt: "asc" }, select: { id: true, kind: true, filename: true, dataUrl: true, createdAt: true } }); return Response.json(rows); } catch (e) { return jsonError(e, 401); }
}
export async function POST(request: NextRequest) {
  try { const user = await getUser(request); const body = await request.json(); const bookingId = String(body.bookingId || ""); const dataUrl = String(body.dataUrl || ""); if (!bookingId || !dataUrl.startsWith("data:image/")) throw new Error("Нужно изображение"); if (dataUrl.length > 8_000_000) throw new Error("Фото слишком большое, максимум 6 МБ"); const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId: user.id }, select: { id: true } }); if (!booking) throw new Error("Бронь не найдена"); const row = await prisma.bookingMedia.create({ data: { userId: user.id, bookingId, kind: String(body.kind || "PHOTO"), filename: String(body.filename || "photo"), dataUrl } }); return Response.json(row, { status: 201 }); } catch (e) { return jsonError(e); }
}
export async function DELETE(request: NextRequest) {
  try { const user = await getUser(request); const id = String(request.nextUrl.searchParams.get("id") || ""); await prisma.bookingMedia.deleteMany({ where: { id, userId: user.id } }); return Response.json({ ok: true }); } catch (e) { return jsonError(e, 401); }
}
