import { NextRequest } from "next/server";
import { getAccess, jsonError } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { user, member } = await getAccess(request);
    return Response.json({ role: member?.role || user.role, memberId: member?.id || null, permissions: member?.permissions || null });
  } catch (error) {
    return jsonError(error, 401);
  }
}
