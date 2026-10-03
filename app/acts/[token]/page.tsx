import ActActions from "./ActActions";
import { prisma } from "@/lib/prisma";
const money = (value: unknown, currency = "₫") => `${Number(value || 0).toLocaleString("vi-VN")} ${currency}`;
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("ru-RU") : "—";
export default async function HandoverActPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const act = await prisma.handoverAct.findUnique({ where: { publicToken: token } });
  if (!act) return <main className="actPage"><section className="actCard"><h1>Акт не найден</h1><p>Ссылка недействительна или акт был удалён.</p></section></main>;
  const data = act.payload as Record<string, unknown>;
  const startAt = new Date(`${String(data.startDate).slice(0, 10)}T${String(data.startTime || "12:00")}`);
  const endAt = new Date(`${String(data.endDate).slice(0, 10)}T${String(data.endTime || "12:00")}`);
  const days = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / 86400000));
  return <main className="actPage"><section className="actCard">
    <div className="actBrand"><div className="actLogo">KR</div><div><b>RIDEFLOW RENT</b><small>Официальный акт передачи транспорта</small></div><span className={`actStatus ${act.status === "ACCEPTED" ? "accepted" : "pending"}`}>{act.status === "ACCEPTED" ? "Принят гостем" : "Ожидает принятия"}</span></div>
    <div className="actTitle"><div><small className="actKicker">АКТ № {act.id.slice(-8).toUpperCase()}</small><h1>Акт передачи</h1></div><span>{date(data.startDate)}</span></div>
    <div className="actHero"><b>{String(data.clientName || "Гость")}</b><span>{String(data.clientPhone || "—")}</span><strong>Байк: {String(data.assetName || "—")}</strong>{data.partnerName ? <span>Партнёр: {String(data.partnerName)}</span> : null}</div>
    <div className="actGrid"><div><small>Срок аренды</small><b>{days} суток</b></div><div><small>Период</small><b>{date(data.startDate)} — {date(data.endDate)}</b></div><div><small>Время</small><b>{String(data.startTime || "12:00")} — {String(data.endTime || "12:00")}</b></div><div><small>Лимит пробега</small><b>{data.mileageLimitPerDay ? `${data.mileageLimitPerDay} км/сутки` : "—"}</b></div><div><small>Фото паспорта</small><b>{data.passportPhoto ? "Приложено" : "—"}</b></div><div><small>Держатель телефона</small><b>{String(data.phoneHolder || "—")}</b></div><div><small>Шлемы</small><b>{String(data.helmetCount ?? "—")}</b></div><div><small>Пробег при выдаче</small><b>{String(data.mileageAtHandover ?? "—")} км</b></div><div><small>Топливо</small><b>{String(data.fuelLevel || "—")}</b></div><div><small>Залог</small><b>{money(data.depositAmount, String(data.depositCurrency || "₫"))}</b></div><div><small>Ставка</small><b>{money(data.dailyRate)} / сутки</b></div><div><small>Стоимость аренды</small><b>{money(data.totalPrice)}</b></div></div>
    <div className="actTotal"><span>Итого по аренде</span><strong>{money(data.totalPrice)}</strong></div>
    {data.notes ? <div className="actNotes"><small>Примечание к бронированию</small><p>{String(data.notes)}</p></div> : null}
    <div className="actConditions"><div className="actConditionsHead"><small>Условия аренды</small><b>{String(data.assetName || "Транспорт")}</b></div><pre>{String(data.rentalConditions || "Условия не указаны")}</pre></div>
    <ActActions token={token} status={act.status} acceptedAt={act.acceptedAt?.toISOString() || null} acceptedName={act.acceptedName} />
    <p className="actFoot">Документ сформирован в CRM RideFlow Rent. Перед подтверждением проверьте даты, время, стоимость, залог и состояние транспорта.</p>
  </section></main>;
}
