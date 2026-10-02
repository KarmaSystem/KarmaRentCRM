import ActActions from "./ActActions";
import { prisma } from "@/lib/prisma";

const money = (value: unknown, currency = "₫") => `${Number(value || 0).toLocaleString("vi-VN")} ${currency}`;
const date = (value: unknown) => value ? new Date(String(value)).toLocaleDateString("ru-RU") : "—";

export default async function HandoverActPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const act = await prisma.handoverAct.findUnique({ where: { publicToken: token }, include: { booking: { include: { asset: true } } } });
  if (!act) return <main className="actPage"><section className="actCard"><h1>Акт не найден</h1></section></main>;
  const data = act.payload as Record<string, unknown>;
  const start = new Date(String(data.startDate));
  const end = new Date(String(data.endDate));
  const startAt = new Date(`${String(data.startDate).slice(0, 10)}T${String(data.startTime || "12:00")}`); const endAt = new Date(`${String(data.endDate).slice(0, 10)}T${String(data.endTime || "12:00")}`); const days = Math.max(1, Math.ceil((endAt.getTime() - startAt.getTime()) / 86400000));
  return <main className="actPage"><section className="actCard">
    <div className="actBrand"><div className="actLogo">KR</div><div><b>KARMA RENT</b><small>Акт выдачи байка</small></div></div>
    <div className="actTitle"><h1>Аренда</h1><span>{date(data.startDate)}</span></div>
    <div className="actHero"><b>{String(data.clientPhone || "—")}</b><strong>Байк: {String(data.assetName || "—")}</strong>{data.partnerName ? <span>Партнёр: {String(data.partnerName)}</span> : null}</div>
    <div className="actGrid">
      <div><small>Дни</small><b>{days}</b></div><div><small>Дата</small><b>{date(data.startDate)}</b></div><div><small>Сдача</small><b>{date(data.endDate)}</b></div><div><small>Время</small><b>{String(data.startTime || "12:00")} — {String(data.endTime || "12:00")}</b></div>
      <div><small>Фото паспорта</small><b>{data.passportPhoto ? "+" : "—"}</b></div><div><small>Лимит километража</small><b>{data.mileageLimitPerDay ? `${data.mileageLimitPerDay} км/сутки` : "—"}</b></div><div><small>Держатель телефона</small><b>{String(data.phoneHolder || "—")}</b></div><div><small>Шлем</small><b>{String(data.helmetCount ?? "—")}</b></div>
      <div><small>Пробег</small><b>{String(data.mileageAtHandover ?? "—")}</b></div><div><small>Бензин</small><b>{String(data.fuelLevel || "—")}</b></div><div><small>Депозит</small><b>{money(data.depositAmount, String(data.depositCurrency || "₫"))}</b></div><div><small>Стоимость</small><b>{money(data.dailyRate)} / сутки</b></div>
    </div>
    <div className="actTotal"><span>Итого к оплате</span><strong>{money(data.totalPrice)}</strong></div>
    {data.notes ? <div className="actNotes"><small>Комментарий</small><p>{String(data.notes)}</p></div> : null}
    <div className="actConditions"><div className="actConditionsHead"><small>Условия аренды</small><b>{String(data.assetName || "Байк")}</b></div><pre>{String(data.rentalConditions || "Условия не указаны")}</pre></div>
    <ActActions />
    <p className="actFoot">Проверьте данные при получении и возврате транспорта.</p>
  </section></main>;
}
