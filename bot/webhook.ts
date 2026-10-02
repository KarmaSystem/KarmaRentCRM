import { NextRequest } from "next/server";

export async function handleTelegramUpdate(request: NextRequest) {
  const update = await request.json();
  const message = update?.message;
  if (message?.text === "/start" && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBAPP_URL) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: message.chat.id, text: "Откройте Rental Planner для управления арендой.", reply_markup: { inline_keyboard: [[{ text: "Открыть Rental Planner", web_app: { url: process.env.TELEGRAM_WEBAPP_URL } }]] } }) });
  }
  return Response.json({ ok: true });
}
