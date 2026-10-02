import { describe, expect, it } from "vitest";
import { calculateBalance, calculateTotal, rangesOverlap, rentalDays } from "@/lib/rental";

describe("rental business rules", () => {
  it("calculates inclusive rental period as calendar nights", () => expect(rentalDays(new Date("2026-10-01"), new Date("2026-10-04"))).toBe(3));
  it("calculates total and outstanding balance", () => { expect(calculateTotal(new Date("2026-10-01"), new Date("2026-10-04"), 25)).toBe(75); expect(calculateBalance(75, 20)).toBe(55); });
  it("detects overlapping active periods", () => { expect(rangesOverlap(new Date("2026-10-01"), new Date("2026-10-05"), new Date("2026-10-04"), new Date("2026-10-07"))).toBe(true); expect(rangesOverlap(new Date("2026-10-01"), new Date("2026-10-05"), new Date("2026-10-05"), new Date("2026-10-07"))).toBe(false); });
});
