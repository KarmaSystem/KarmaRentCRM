import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTelegramInitData } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();
    const user = verifyTelegramInitData(String(initData));
    await prisma.user.upsert({ where: { telegramId: BigInt(user.id) }, update: {}, create: { telegramId: BigInt(user.id), companyName: user.first_name ? `${user.first_name}'s Rental` : "Rental Planner" } });
    const response = Response.json({ ok: true, user: { ...user, id: String(user.id) } });
    response.headers.append("Set-Cookie", `telegram_init_data=${encodeURIComponent(initData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось войти" }, { status: 401 });
  }
}
