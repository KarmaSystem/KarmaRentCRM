import { describe, expect, it } from "vitest";
import { calculateBalance, calculateTotal, rangesOverlap, rentalDays } from "@/lib/rental";

const cashToHandOver = (cashIn: number, depositIn: number, depositReturn: number, refund: number, expenses: number) => Math.max(0, cashIn + depositIn - depositReturn - refund - expenses);
const depositsHeld = (deposits: number, returns: number) => Math.max(0, deposits - returns);

describe("rental business rules", () => {
  it("calculates inclusive rental period as calendar nights", () => expect(rentalDays(new Date("2026-10-01"), new Date("2026-10-04"))).toBe(3));
  it("calculates total and outstanding balance", () => { expect(calculateTotal(new Date("2026-10-01"), new Date("2026-10-04"), 25)).toBe(75); expect(calculateBalance(75, 20)).toBe(55); });
  it("detects overlapping active periods", () => { expect(rangesOverlap(new Date("2026-10-01"), new Date("2026-10-05"), new Date("2026-10-04"), new Date("2026-10-07"))).toBe(true); expect(rangesOverlap(new Date("2026-10-01"), new Date("2026-10-05"), new Date("2026-10-05"), new Date("2026-10-07"))).toBe(false); });
});
