// services/insurance.service.ts

const INSURANCE_RATE = 0.005; // 0.5%

/**
 * Calculates insurance cost (USD).
 */
export function calcInsurance(valueUSD: number, freightUSD: number): number {
  return (valueUSD + freightUSD) * INSURANCE_RATE;
}
