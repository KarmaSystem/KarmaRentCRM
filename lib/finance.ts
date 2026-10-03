export const calculateDepositsHeld = (deposits: number, returns: number) => Math.max(0, deposits - returns);

export const calculateCashToHandOver = (cashIn: number, cashOut: number, expenses: number) => Math.max(0, cashIn - cashOut - expenses);
