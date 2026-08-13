// CompozeIT – cashback business rules for B2B renewal simulation.

// Assumption for demo economics: every kilogram of classified food waste earns Rp1.000 cashback.
export const CASHBACK_RATE_IDR_PER_KG = 1000;

// Assumption for subscription renewal demo: one monthly B2B subscription costs Rp300.000.
export const SUBSCRIPTION_RENEWAL_FEE_IDR = 300000;

export function calculateCashbackAmount(estimatedWeightKg: number): number {
  const rawAmount = Math.max(0, estimatedWeightKg) * CASHBACK_RATE_IDR_PER_KG;
  return roundCurrency(rawAmount);
}

export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}
