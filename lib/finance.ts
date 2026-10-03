export const calculateDepositsHeld = (deposits: number, returns: number) => Math.max(0, deposits - returns);

export const calculateCashToHandOver = (cashIn: number, cashOut: number, expenses: number) => Math.max(0, cashIn - cashOut - expenses);

/**
 * Allocate rental payments to the original booking first. Any amount above the
 * original booking total is an extension and is never commissionable.
 * The result is the commissionable amount paid inside the selected period.
 */
export const calculateCommissionableRental = (totalPrice: number, extensionAmount: number, paidBeforePeriod: number, paidThroughPeriod: number) => {
  const originalRentalTotal = Math.max(0, totalPrice - extensionAmount);
  const before = Math.min(originalRentalTotal, Math.max(0, paidBeforePeriod));
  const through = Math.min(originalRentalTotal, Math.max(0, paidThroughPeriod));
  return Math.max(0, through - before);
};

export const calculatePartnerCommission = (commissionableRental: number, commissionType: string, commissionValue: number) => {
  if (commissionableRental <= 0) return 0;
  return commissionType === "PERCENT" ? commissionableRental * Math.max(0, commissionValue) / 100 : Math.max(0, commissionValue);
};
