import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { z } from "zod";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Имя должно содержать минимум 2 символа"),
  telegramId: z.string().regex(/^\d+$/, "Telegram ID должен содержать только цифры").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Введите корректный email для входа").optional().or(z.literal("")),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов").optional(),
  commissionPercent: z.coerce.number().min(0).max(100).default(0),
  role: z.enum(["ADMIN", "MANAGER", "ACCOUNTANT"]).default("MANAGER"),
  permissions: z.record(z.boolean()).default({}),
});

const normalizeEmail = (value?: string) => value?.trim().toLowerCase() || null;
const normalizeTelegram = (value?: string) => value ? BigInt(value) : null;
const publicMember = (row: any) => ({ id: row.id, name: row.name, telegramId: row.telegramId?.toString() ?? "", phone: row.phone, email: row.email, commissionPercent: Number(row.commissionPercent), role: row.role, active: row.active });

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    const rows = await prisma.teamMember.findMany({ where: { ownerId: user.id }, orderBy: [{ createdAt: "asc" }, { name: "asc" }] });
    return Response.json(rows.map(publicMember));
  } catch (error) { return jsonError(error, 401); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (user.role !== "OWNER" && user.role !== "ADMIN") throw new Error("Только OWNER или ADMIN может управлять командой");
    const data = schema.parse(await request.json());
    const email = normalizeEmail(data.email);
    if (!email) throw new Error("Email обязателен: по нему сотрудник входит в приложение");
    if (!data.password) throw new Error("Пароль обязателен");
    const telegramId = normalizeTelegram(data.telegramId);
    if (await prisma.teamMember.findFirst({ where: { ownerId: user.id, email, active: true } })) throw new Error("Сотрудник с таким email уже есть в команде");
    if (telegramId && await prisma.teamMember.findUnique({ where: { telegramId } })) throw new Error("Этот Telegram ID уже привязан к другому сотруднику");
    const result = await prisma.teamMember.create({ data: { ownerId: user.id, name: data.name, telegramId, phone: data.phone || null, email, passwordHash: hashPassword(data.password.trim()), commissionPercent: data.commissionPercent, role: data.role, permissions: data.permissions, active: true } });
    console.info(JSON.stringify({ event: "team.member.created", ownerId: user.id, memberId: result.id, role: result.role }));
    return Response.json(publicMember(result), { status: 201 });
  } catch (error) { console.error("[team.create] failed", error); return jsonError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (user.role !== "OWNER" && user.role !== "ADMIN") throw new Error("Недостаточно прав");
    const body = schema.parse(await request.json());
    if (!body.id) throw new Error("Не указан сотрудник");
    const email = normalizeEmail(body.email);
    if (!email) throw new Error("Email обязателен: по нему сотрудник входит в приложение");
    const telegramId = normalizeTelegram(body.telegramId);
    const current = await prisma.teamMember.findFirst({ where: { id: body.id, ownerId: user.id } });
    if (!current) throw new Error("Сотрудник не найден");
    if (await prisma.teamMember.findFirst({ where: { ownerId: user.id, email, active: true, id: { not: body.id } } })) throw new Error("Сотрудник с таким email уже есть в команде");
    const telegramExists = telegramId ? await prisma.teamMember.findUnique({ where: { telegramId } }) : null;
    if (telegramExists && telegramExists.id !== body.id) throw new Error("Этот Telegram ID уже привязан к другому сотруднику");
    const data: Record<string, unknown> = { name: body.name, telegramId, phone: body.phone || null, email, commissionPercent: body.commissionPercent, role: body.role };
    if (body.password) data.passwordHash = hashPassword(body.password.trim());
    const updated = await prisma.teamMember.update({ where: { id: body.id }, data });
    console.info(JSON.stringify({ event: "team.member.updated", ownerId: user.id, memberId: body.id }));
    return Response.json(publicMember(updated));
  } catch (error) { console.error("[team.update] failed", error); return jsonError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (user.role !== "OWNER" && user.role !== "ADMIN") throw new Error("Недостаточно прав");
    const id = String((await request.json()).id || "");
    const result = await prisma.teamMember.deleteMany({ where: { id, ownerId: user.id } });
    if (!result.count) throw new Error("Сотрудник не найден");
    return Response.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
