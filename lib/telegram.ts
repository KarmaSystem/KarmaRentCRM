import crypto from "node:crypto";

export type TelegramUser = { id: number; first_name?: string; last_name?: string; username?: string };

export function verifyTelegramInitData(initData: string, botToken = process.env.TELEGRAM_BOT_TOKEN): TelegramUser {
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN не настроен");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!receivedHash || !authDate || Date.now() / 1000 - authDate > 86400) throw new Error("Недействительные данные Telegram");
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedHash))) throw new Error("Неверная подпись Telegram");
  const user = JSON.parse(params.get("user") || "null") as TelegramUser | null;
  if (!user?.id) throw new Error("Пользователь Telegram не найден");
  return user;
}
