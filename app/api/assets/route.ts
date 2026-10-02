import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { assetSchema } from "@/lib/validation";

const clean = (value?: string) => value?.trim() || null;

export async function GET(request: NextRequest) {
  try { const user = await getUser(request); const assets = await prisma.asset.findMany({ where: { userId: user.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }); return Response.json(assets); } catch (e) { return jsonError(e, 401); }
}
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request); const data = assetSchema.parse(await request.json());
    const last = await prisma.asset.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } });
    const asset = await prisma.asset.create({ data: { userId: user.id, name: data.name.trim(), category: data.category, brand: clean(data.brand), model: clean(data.model), registrationNumber: clean(data.registrationNumber), dailyRate: data.dailyRate.toFixed(2), description: clean(data.description), imageUrl: clean(data.imageUrl), status: data.status, statusColor: data.statusColor, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    return Response.json(asset, { status: 201 });
  } catch (e) { return jsonError(e); }
}
export async function PATCH(request: NextRequest) {
  try { const user = await getUser(request); const body = await request.json(); const id = String(body.id); const data = assetSchema.partial().parse(body); const existing = await prisma.asset.findFirst({ where: { id, userId: user.id } }); if (!existing) throw new Error("Объект не найден"); const asset = await prisma.asset.update({ where: { id }, data: { ...(data.name !== undefined ? { name: data.name.trim() } : {}), ...(data.category !== undefined ? { category: data.category } : {}), ...(data.dailyRate !== undefined ? { dailyRate: data.dailyRate.toFixed(2) } : {}), ...(data.status !== undefined ? { status: data.status } : {}), ...(data.brand !== undefined ? { brand: clean(data.brand) } : {}), ...(data.model !== undefined ? { model: clean(data.model) } : {}), ...(data.registrationNumber !== undefined ? { registrationNumber: clean(data.registrationNumber) } : {}), ...(data.description !== undefined ? { description: clean(data.description) } : {}), ...(data.imageUrl !== undefined ? { imageUrl: clean(data.imageUrl) } : {}), ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}), ...(body.statusColor !== undefined ? { statusColor: String(body.statusColor) } : {}) } }); return Response.json(asset); } catch (e) { return jsonError(e); }
}
