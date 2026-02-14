import { Request, Response } from "express";

// Hardcoded rates for the prototype
const RATES = {
  INLAND_PER_KM_PER_TON: 2.5, // USD
  OCEAN_PER_KM_PER_TON: 0.5, // USD
  INSURANCE_RATE: 0.015, // 1.5%
  HANDLING_FEE_FIXED: 150, // USD
};

// Coordinates for major ports/cities for calculation
const LOCATIONS: Record<string, { lat: number; lng: number }> = {
  "MUMBAI": { lat: 18.975, lng: 72.8258 },
  "CHENNAI": { lat: 13.0827, lng: 80.2707 },
  "DUBAI": { lat: 25.2048, lng: 55.2708 },
  "SINGAPORE": { lat: 1.3521, lng: 103.8198 },
  "LONDON": { lat: 51.5074, lng: -0.1278 },
  "NEW_YORK": { lat: 40.7128, lng: -74.006 },
  "SHANGHAI": { lat: 31.2304, lng: 121.4737 },
  "ROTTERDAM": { lat: 51.9225, lng: 4.4792 },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const calculateCIF = async (req: Request, res: Response) => {
  try {
    const { origin, destination, commodityValue, weight, mode = "OCEAN" } = req.body;

    if (!origin || !destination || !commodityValue || !weight) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const loc1 = LOCATIONS[origin.toUpperCase()] || LOCATIONS["MUMBAI"];
    const loc2 = LOCATIONS[destination.toUpperCase()] || LOCATIONS["DUBAI"];

    const distance = calculateDistance(loc1.lat, loc1.lng, loc2.lat, loc2.lng);

    const ratePerKm = mode === "AIR" ? 5.0 : RATES.OCEAN_PER_KM_PER_TON;
    const freightCost = distance * ratePerKm * weight;
    const insuranceCost = commodityValue * RATES.INSURANCE_RATE;
    const totalCIF = Number(commodityValue) + freightCost + insuranceCost + RATES.HANDLING_FEE_FIXED;

    res.json({
      success: true,
      data: {
        distanceKm: Math.round(distance),
        breakdown: {
          commodityValue: Number(commodityValue),
          freight: Math.round(freightCost),
          insurance: Math.round(insuranceCost),
          handling: RATES.HANDLING_FEE_FIXED,
        },
        totalCIF: Math.round(totalCIF),
        mode
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const calculateDomesticCost = async (req: Request, res: Response) => {
  try {
    const { origin, destination, weight } = req.body;

    if (!origin || !destination || !weight) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Generic domestic calculation (simplistic for prototype)
    const distance = 500; // Mock distance for domestic
    const inlandCost = distance * RATES.INLAND_PER_KM_PER_TON * weight;

    res.json({
      success: true,
      data: {
        distanceKm: distance,
        inlandCost: Math.round(inlandCost),
        breakdown: {
          transport: Math.round(inlandCost * 0.8),
          loading: Math.round(inlandCost * 0.2),
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
