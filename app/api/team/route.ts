import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { z } from "zod";
const schema = z.object({ name: z.string().min(2), telegramId: z.coerce.bigint(), role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"), permissions: z.record(z.boolean()).default({}) });
export async function GET(request: NextRequest) { try { const user = await getUser(request); const rows = await prisma.teamMember.findMany({ where: { ownerId: user.id }, orderBy: { name: "asc" } }); return Response.json(rows.map(row => ({ ...row, telegramId: row.telegramId.toString() }))); } catch (e) { return jsonError(e, 401); } }
export async function POST(request: NextRequest) { try { const user = await getUser(request); if (user.role !== "OWNER" && user.role !== "ADMIN") throw new Error("Только OWNER или ADMIN может управлять командой"); const data = schema.parse(await request.json()); return Response.json(await prisma.teamMember.upsert({ where: { telegramId: data.telegramId }, update: { ownerId: user.id, name: data.name, role: data.role, permissions: data.permissions, active: true }, create: { ownerId: user.id, ...data } }), { status: 201 }); } catch (e) { return jsonError(e); } }

export async function DELETE(request: NextRequest) { try { const user = await getUser(request); if (user.role !== "OWNER" && user.role !== "ADMIN") throw new Error("Недостаточно прав"); const id = String((await request.json()).id); await prisma.teamMember.deleteMany({ where: { id, ownerId: user.id } }); return Response.json({ ok: true }); } catch (e) { return jsonError(e); } }
