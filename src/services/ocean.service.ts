const oceanRateMatrix: Record<string, number> = {
  "Mundra->Jebel Ali": 800,
  "Mumbai->Los Angeles": 1200,
  "Chennai->Hamburg": 900,
  Default: 1000,
};

/**
 * Fetch ocean freight rate (USD per TEU) from Freightos public API with fallback
 */
export async function getOceanRateAPI(
  originCode: string,
  destCode: string
): Promise<number> {
  const key = `${originCode}->${destCode}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const url = `https://ship.freightos.com/api/shippingCalculator`;
    const params = new URLSearchParams({
      format: "json",
      loadtype: "container20",
      origin: originCode,
      destination: destCode,
      weight: "20000",
      quantity: "1",
    }).toString();

    const res = await fetch(`${url}?${params}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Freightos failed: ${res.statusText}`);

    const json = await res.json();
    const price = parseFloat(
      json.estimatedFreightRates?.mode?.price?.min?.moneyAmount?.amount
    );

    if (isNaN(price)) throw new Error("Invalid rate from Freightos");

    return price;
  } catch (err) {
    console.warn(`⚠️ Freightos fallback triggered for ${key}:`, err);
    return oceanRateMatrix[key] ?? oceanRateMatrix["Default"];
  }
}
