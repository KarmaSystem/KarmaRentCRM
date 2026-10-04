export const calculateDepositsHeld = (deposits: number, returns: number) => Math.max(0, deposits - returns);

/** Physical rental cash to hand over; deposits are separate. */
export const calculateCashToHandOver = (cashRentalIn: number, cashOut: number, expenses: number) =>
  Math.max(0, cashRentalIn - cashOut - expenses);

/** Cash deposits currently physically held, separate from rental cash. */
export const calculateCashDepositsHeld = (cashDeposits: number, cashDepositReturns: number) =>
  Math.max(0, cashDeposits - cashDepositReturns);

/** Sum the fixed percentage of every active manager. */
export const calculateManagerCommission = (rentalRevenue: number, managerPercents: number[]) =>
  Math.max(0, rentalRevenue) * managerPercents.reduce((sum, percent) => sum + Math.max(0, percent), 0) / 100;

/** A branch rate is paid only when the booking has a referred partner lead. */
export const calculateLeadCommission = (commissionableRental: number, hasPartner: boolean, branchPercent: number) =>
  hasPartner ? Math.max(0, commissionableRental) * Math.max(0, branchPercent) / 100 : 0;

/** Allocate base rental payments; extension payments are never commissionable. */
export const calculateCommissionableRental = (totalPrice: number, extensionAmount: number, paidBeforePeriod: number, paidThroughPeriod: number) => {
  const originalRentalTotal = Math.max(0, totalPrice - extensionAmount);
  const before = Math.min(originalRentalTotal, Math.max(0, paidBeforePeriod));
  const through = Math.min(originalRentalTotal, Math.max(0, paidThroughPeriod));
  return Math.max(0, through - before);
};

/** Kept for legacy callers; partner rates are no longer used by analytics. */
export const calculatePartnerCommission = (commissionableRental: number, commissionType: string, commissionValue: number) => {
  if (commissionableRental <= 0) return 0;
  return commissionType === "PERCENT" ? commissionableRental * Math.max(0, commissionValue) / 100 : Math.max(0, commissionValue);
};
