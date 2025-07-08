/**
 * The functions calculateCIF and calculateDomesticCost in cif.controller.ts calculate the total cost
 * of international and domestic shipping respectively based on various factors like distance, weight,
 * and value of cargo.
 * @param {Request} req - `req` is the request object representing the HTTP request made to the server.
 * It contains information about the request such as headers, parameters, body, and more. In the
 * provided code snippet, `req` is of type `Request` imported from the Express library, which is
 * commonly used in Node
 * @param {Response} res - The `res` parameter in the functions `calculateCIF` and
 * `calculateDomesticCost` represents the response object in Express. This object is used to send a
 * response back to the client making the request. It contains methods like `json()` to send JSON
 * responses, `status()` to set
 */
import { Request, Response } from "express";
import { getDistanceKm } from "../services/inland.service";
import { calcInsurance } from "../services/insurance.service";
import { getOceanRateAPI } from "../services/ocean.service";

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

    console.log("📍 Calculating Inland Distance...");
    const distanceKm = await getDistanceKm(originCoords, destinationCoords);

    const ratePerKmPerTon = 0.1;
    const inlandCostUSD = distanceKm * ratePerKmPerTon * unitWeightTon;

    console.log("🌊 Fetching Ocean Freight...");
    const oceanCostPerTEU = await getOceanRateAPI(originPort, destPort);
    const oceanCostUSD = (unitWeightTon / 10) * oceanCostPerTEU;

    console.log("💰 Calculating Insurance...");
    const insuranceUSD = calcInsurance(
      cargoValueUSD,
      inlandCostUSD + oceanCostUSD
    );

    const cifUSD = inlandCostUSD + oceanCostUSD + insuranceUSD;

    res.json({
      distanceKm,
      inlandCostUSD,
      oceanCostUSD,
      insuranceUSD,
      cifUSD,
    });
  } catch (err: any) {
    console.error("❌ CIF Calculation Error:", err);
    res.status(500).json({ error: err.message });
  }
}

export async function calculateDomesticCost(req: Request, res: Response) {
  try {
    const { originCoords, destinationCoords, cargoValueUSD, unitWeightTon } =
      req.body;

    const distanceKm = await getDistanceKm(originCoords, destinationCoords);
    const ratePerKmPerTon = 0.1;
    const inlandCostUSD = distanceKm * ratePerKmPerTon * unitWeightTon;

    const gstRate = 0.05;
    const gstUSD = cargoValueUSD * gstRate;

    const totalCostUSD = inlandCostUSD + cargoValueUSD + gstUSD;

    res.json({
      distanceKm,
      inlandCostUSD,
      gstUSD,
      totalCostUSD,
    });
  } catch (err: any) {
    console.error("❌ Domestic Cost Error:", err);
    res.status(500).json({ error: err.message });
  }
}
