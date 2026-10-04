import { describe, expect, it } from "vitest";
import { calculateBalance, calculateTotal, rangesOverlap, rentalDays } from "@/lib/rental";
import { calculateCashDepositsHeld, calculateCashToHandOver, calculateCommissionableRental, calculateDepositsHeld, calculatePartnerCommission } from "@/lib/finance";

describe("rental business rules", () => {
  it("calculates inclusive rental period as calendar nights", () => expect(rentalDays(new Date("2026-10-01"), new Date("2026-10-04"))).toBe(3));
  it("calculates total and outstanding balance", () => { expect(calculateTotal(new Date("2026-10-01"), new Date("2026-10-04"), 25)).toBe(75); expect(calculateBalance(75, 20)).toBe(55); });
  it("keeps deposits outside revenue and calculates evening cash separately", () => { expect(calculateDepositsHeld(200, 75)).toBe(125); expect(calculateCashToHandOver(700, 0, 50)).toBe(650); expect(calculateCashDepositsHeld(200, 75)).toBe(125); });
  it("excludes extensions from partner commission in every payment state", () => {
    expect(calculateCommissionableRental(860, 260, 0, 600)).toBe(600);
    expect(calculateCommissionableRental(860, 260, 0, 860)).toBe(600);
    expect(calculateCommissionableRental(860, 260, 600, 860)).toBe(0);
    expect(calculateCommissionableRental(860, 260, 0, 0)).toBe(0);
    expect(calculatePartnerCommission(600, "PERCENT", 15)).toBe(90);
    expect(calculatePartnerCommission(0, "PERCENT", 15)).toBe(0);
    expect(calculatePartnerCommission(600, "FIXED", 100)).toBe(100);
  });
  it("detects overlapping active periods", () => { expect(rangesOverlap(new Date("2026-10-01"), new Date("2026-10-05"), new Date("2026-10-04"), new Date("2026-10-07"))).toBe(true); expect(rangesOverlap(new Date("2026-10-01"), new Date("2026-10-05"), new Date("2026-10-05"), new Date("2026-10-07"))).toBe(false); });
});
