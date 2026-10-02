import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { expenseSchema } from "@/lib/validation";

export async function GET(request: NextRequest) { try { const user = await getUser(request); return Response.json(await prisma.expense.findMany({ where: { userId: user.id }, include: { asset: true }, orderBy: { date: "desc" } })); } catch (e) { return jsonError(e, 401); } }
export async function POST(request: NextRequest) { try { const user = await getUser(request); const input = expenseSchema.parse(await request.json()); if (input.assetId && !(await prisma.asset.findFirst({ where: { id: input.assetId, userId: user.id } }))) throw new Error("Объект не найден"); return Response.json(await prisma.expense.create({ data: { ...input, userId: user.id } }), { status: 201 }); } catch (e) { return jsonError(e); } }
