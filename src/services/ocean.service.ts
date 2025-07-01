// services/ocean.service.ts

// Example static matrix. Fill with your actual lanes.
const oceanRateMatrix: Record<string, number> = {
  "Mundra->Jebel Ali": 800,
  "Mumbai->Los Angeles": 1200,
  "Chennai->Hamburg": 900,
};

/**
 * Look up container ocean freight (USD per TEU) for a given lane.
 * Falls back to a default if not found.
 */
export function getOceanRate(originPort: string, destPort: string): number {
  const key = `${originPort}->${destPort}`;
  return oceanRateMatrix[key] ?? oceanRateMatrix["Mumbai->Los Angeles"];
}
