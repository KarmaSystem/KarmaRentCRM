export const calculateDepositsHeld = (deposits: number, returns: number) => Math.max(0, deposits - returns);

/**
 * Physical cash to hand over at the end of the business day.
 * Deposits are intentionally excluded: they are a client liability and are
 * shown separately as deposits held. Expenses are passed in once from the
 * expenses ledger; payment records of type EXPENSE must not be subtracted too.
 */
export const calculateCashToHandOver = (cashRentalIn: number, cashOut: number, expenses: number) =>
  Math.max(0, cashRentalIn - cashOut - expenses);

/** Cash deposits currently physically held, separate from rental cash. */
export const calculateCashDepositsHeld = (cashDeposits: number, cashDepositReturns: number) =>
  Math.max(0, cashDeposits - cashDepositReturns);

/**
 * Allocate rental payments to the original booking first. Any amount above the
 * original booking total is an extension and is never commissionable.
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
