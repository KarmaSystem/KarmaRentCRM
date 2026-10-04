import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccess, getUser, jsonError } from "@/lib/api";
import { z } from "zod";
const schema = z.object({ name: z.string().min(2), contactName: z.string().optional(), phone: z.string().optional(), contactChannel: z.enum(["PHONE", "WHATSAPP", "TELEGRAM"]).default("PHONE"), email: z.string().email().optional().or(z.literal("")), notes: z.string().optional() });
export async function GET(request: NextRequest) { try { const user = await getUser(request); return Response.json(await prisma.partner.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } })); } catch (e) { return jsonError(e, 401); } }
export async function POST(request: NextRequest) { try { const user = await getUser(request); const data = schema.parse(await request.json()); return Response.json(await prisma.partner.create({ data: { ...data, commissionType: "PERCENT", commissionValue: 0, userId: user.id } }), { status: 201 }); } catch (e) { return jsonError(e); } }
export async function PATCH(request: NextRequest) { try { const user = await getUser(request); const body = await request.json(); const id = String(body.id); const data = schema.parse(body); return Response.json(await prisma.partner.updateMany({ where: { id, userId: user.id }, data })); } catch (e) { return jsonError(e); } }
export async function DELETE(request: NextRequest) { try { const { user, member } = await getAccess(request); if (member?.role === "MANAGER") throw new Error("Менеджеру доступно только редактирование"); const id = String((await request.json()).id); await prisma.partner.deleteMany({ where: { id, userId: user.id } }); return Response.json({ ok: true }); } catch (e) { return jsonError(e); } }
