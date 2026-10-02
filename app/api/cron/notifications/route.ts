import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const now = new Date(); const due = await prisma.notification.findMany({ where: { status: "PENDING", scheduledAt: { lte: now } }, take: 100 }); let sent = 0;
  for (const notification of due) { await prisma.notification.updateMany({ where: { id: notification.id, status: "PENDING" }, data: { status: "SENT", sentAt: new Date() } }); sent += 1; }
  return Response.json({ ok: true, processed: sent, note: "Telegram delivery can be connected through TELEGRAM_BOT_TOKEN" });
}
