import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, getUser, jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try { const user = await getUser(request); return Response.json(await prisma.branch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } })); }
  catch (e) { return jsonError(e, 401); }
}
export async function POST(request: NextRequest) {
  try { const user = await getUser(request); const body = await request.json(); const name = String(body.name || "").trim(); if (name.length < 2) throw new Error("Название филиала минимум 2 символа"); const commissionPercent = Math.max(0, Math.min(100, Number(body.commissionPercent ?? 0))); return Response.json(await prisma.branch.create({ data: { userId: user.id, name, commissionPercent } }), { status: 201 }); }
  catch (e) { return jsonError(e); }
}
export async function PATCH(request: NextRequest) {
  try { const user = await getUser(request); const body = await request.json(); const id = String(body.id); const branch = await prisma.branch.findFirst({ where: { id, userId: user.id } }); if (!branch) throw new Error("Филиал не найден"); const data: { name?: string; commissionPercent?: number } = {}; if (body.name !== undefined) data.name = String(body.name).trim(); if (body.commissionPercent !== undefined) data.commissionPercent = Math.max(0, Math.min(100, Number(body.commissionPercent))); return Response.json(await prisma.branch.update({ where: { id }, data })); }
  catch (e) { return jsonError(e); }
}
export async function DELETE(request: NextRequest) {
  try { const { user, member } = await getAccess(request); if (member?.role === "MANAGER") throw new Error("Менеджеру доступно только редактирование"); const id = String((await request.json()).id); await prisma.branch.delete({ where: { id, userId: user.id } }); return Response.json({ ok: true }); }
  catch (e) { return jsonError(e); }
}
