import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const act = await prisma.handoverAct.findUnique({ where: { publicToken: token } });
  if (!act) return Response.json({ error: "Акт не найден" }, { status: 404 });
  return Response.json({ id: act.id, payload: act.payload, status: act.status, sharedAt: act.sharedAt, acceptedAt: act.acceptedAt, acceptedName: act.acceptedName });
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const body = await request.json().catch(() => ({}));
  const acceptedName = String(body.name || "").trim();
  if (acceptedName.length < 2) return Response.json({ error: "Укажите имя или ФИО" }, { status: 400 });
  const signature = String(body.signature || "");
  if (!Boolean(body.consent)) return Response.json({ error: "Необходимо согласиться с актом и условиями аренды" }, { status: 400 });
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(signature) || signature.length > 2_000_000) return Response.json({ error: "Добавьте подпись пальцем в поле" }, { status: 400 });
  const act = await prisma.handoverAct.findUnique({ where: { publicToken: token } });
  if (!act) return Response.json({ error: "Акт не найден" }, { status: 404 });
  if (act.status === "CANCELLED") return Response.json({ error: "Этот акт отменён" }, { status: 410 });
  if (act.status === "ACCEPTED") return Response.json({ status: act.status, acceptedAt: act.acceptedAt, acceptedName: act.acceptedName });
  const acceptedAt = new Date();
  const updated = await prisma.handoverAct.updateMany({ where: { id: act.id, status: { not: "ACCEPTED" } }, data: { status: "ACCEPTED", acceptedAt, acceptedName, acceptedSignature: signature, acceptedConsent: true, acceptedIp: clientIp(request), acceptedUserAgent: request.headers.get("user-agent")?.slice(0, 500) || null } });
  if (!updated.count) {
    const current = await prisma.handoverAct.findUnique({ where: { id: act.id } });
    return Response.json({ status: current?.status, acceptedAt: current?.acceptedAt, acceptedName: current?.acceptedName });
  }
  return Response.json({ status: "ACCEPTED", acceptedAt, acceptedName });
}
