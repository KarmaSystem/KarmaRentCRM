import { differenceInCalendarDays, isBefore, startOfDay } from "date-fns";

export function rentalDays(start: Date, end: Date): number {
  const days = differenceInCalendarDays(startOfDay(end), startOfDay(start));
  if (days < 1) throw new Error("Дата окончания должна быть позже даты начала");
  return days;
}

export function calculateTotal(start: Date, end: Date, dailyRate: number): number {
  return Number((rentalDays(start, end) * dailyRate).toFixed(2));
}

export function calculateBalance(total: number, paid: number): number {
  return Number(Math.max(0, total - paid).toFixed(2));
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return isBefore(aStart, bEnd) && isBefore(bStart, aEnd);
}

export function assertValidPhone(phone: string): void {
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) throw new Error("Некорректный номер телефона");
}
