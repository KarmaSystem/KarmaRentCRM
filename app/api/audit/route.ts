import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser, jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    const entityId = request.nextUrl.searchParams.get("entityId");
    if (!entityId) throw new Error("Не указан объект журнала");
    const rows = await prisma.auditLog.findMany({ where: { userId: user.id, entity: "BOOKING", entityId }, orderBy: { createdAt: "desc" }, take: 20 });
    return Response.json(rows);
  } catch (error) { return jsonError(error, 401); }
}
