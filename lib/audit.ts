const labels: Record<string, string> = {
  startDate: "дата выдачи", endDate: "дата возврата", startTime: "время выдачи", endTime: "время возврата",
  dailyRate: "ставка за сутки", totalPrice: "общая сумма", extensionDays: "сутки продления", extensionAmount: "сумма продления",
  extensionStartDate: "начало продления", extensionEndDate: "конец продления", status: "статус", archiveUntil: "срок архива",
  paidAmount: "оплачено", depositAmount: "депозит", partnerName: "партнёр", assetId: "объект"
};
const formatValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === "") return "—";
  if (/Date|Until/.test(key)) return String(value).slice(0, 10);
  return String(value);
};
export function describeChanges(before: Record<string, unknown>, after: Record<string, unknown>) {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return keys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(key => `${labels[key] || key}: «${formatValue(key, before[key])}» → «${formatValue(key, after[key])}»`).join("; ") || "значения не изменились";
}
export function auditReason(userReason: unknown, before: Record<string, unknown>, after: Record<string, unknown>, fallback: string) {
  const reason = String(userReason || fallback).trim();
  return `${reason}. Изменено: ${describeChanges(before, after)}.`;
}
