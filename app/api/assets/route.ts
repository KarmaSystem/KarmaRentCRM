import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";
import { assetSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try { const user = await getUser(request); const assets = await prisma.asset.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }); return Response.json(assets); } catch (e) { return jsonError(e, 401); }
}
export async function POST(request: NextRequest) {
  try { const user = await getUser(request); const data = assetSchema.parse(await request.json()); const asset = await prisma.asset.create({ data: { ...data, userId: user.id, dailyRate: data.dailyRate } }); return Response.json(asset, { status: 201 }); } catch (e) { return jsonError(e); }
}
