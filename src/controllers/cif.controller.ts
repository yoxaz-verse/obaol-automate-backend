// controllers/cif.controller.ts
import { Request, Response } from "express";
import { getDistanceKm } from "../services/inland.service";
import { getOceanRate } from "../services/ocean.service";
import { calcInsurance } from "../services/insurance.service";

export async function calculateCIF(req: Request, res: Response) {
  try {
    const {
      originCoords,
      destinationCoords,
      originPort,
      destPort,
      cargoValueUSD,
      unitWeightTon,
    } = req.body as {
      originCoords: [number, number];
      destinationCoords: [number, number];
      originPort: string;
      destPort: string;
      cargoValueUSD: number;
      unitWeightTon: number;
    };

    console.log("Inland cost");
    // 1) Inland cost
    const distanceKm = await getDistanceKm(originCoords, destinationCoords);
    // → Replace second originCoords with actual port coords lookup in real code
    console.log("Replace second originCoords");

    const ratePerKmPerTon = 0.1; // USD per km per ton, adjust as needed
    const inlandCostUSD = distanceKm * ratePerKmPerTon * unitWeightTon;
    console.log("Ocean cost");

    // 2) Ocean cost
    const oceanCostPerTEU = getOceanRate(originPort, destPort);
    const oceanCostUSD = (unitWeightTon / 10) * oceanCostPerTEU;

    // 3) Insurance
    const insuranceUSD = calcInsurance(
      cargoValueUSD,
      inlandCostUSD + oceanCostUSD
    );

    // 4) Total CIF
    const cifUSD = inlandCostUSD + oceanCostUSD + insuranceUSD;

    res.json({ distanceKm, inlandCostUSD, oceanCostUSD, insuranceUSD, cifUSD });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
