import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import csv from "csv-parser";

import { CountryModel } from "../database/models/country";
import { UnLoCodeStatusModel } from "../database/models/unLoCodeStatus";
import { UnLoCodeFunctionsModel } from "../database/models/unLoCodeFunction";
import { UnLoCodeModel } from "../database/models/unLoCode";

function parseCoords(raw: string) {
  if (!raw) return undefined;
  const parts = raw.trim().split(/\s+/);
  if (parts.length < 2) return undefined;
  const [latRaw, lonRaw] = parts;
  const latDeg = parseInt(latRaw.slice(0, 2), 10);
  const latMin = parseInt(latRaw.slice(2, 4), 10);
  let latitude = latDeg + latMin / 60;
  if (latRaw.endsWith("S")) latitude = -latitude;
  const lonDeg = parseInt(lonRaw.slice(0, 3), 10);
  const lonMin = parseInt(lonRaw.slice(3, 5), 10);
  let longitude = lonDeg + lonMin / 60;
  if (lonRaw.endsWith("W")) longitude = -longitude;
  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
  };
}

async function processCsv(
  filePath: string,
  funcMap: Record<string, mongoose.Types.ObjectId>,
  statusMap: Record<string, mongoose.Types.ObjectId>
) {
  const rows: any[] = [];
  await new Promise<void>((res, rej) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", res)
      .on("error", rej);
  });

  let currentCountry: any = null;
  let imported = 0;

  for (const r of rows) {
    // Country header (e.g. ".NEW ZEALAND")
    if (!r.LOCODE && (r.CITY || r.DESC)?.trim().startsWith(".")) {
      const code = r.COUNTRYCODE?.trim();
      const name = (r.CITY || r.DESC).slice(1).trim();
      currentCountry = await CountryModel.findOneAndUpdate(
        { code },
        { code, name, isDeleted: false },
        { upsert: true, new: true }
      );
      continue;
    }
    if (!r.LOCODE || !r.COUNTRYCODE) continue;

    // Ensure country context
    if (!currentCountry || currentCountry.code !== r.COUNTRYCODE) {
      currentCountry = await CountryModel.findOne({ code: r.COUNTRYCODE });
      if (!currentCountry) {
        console.warn(`⚠️ Unknown country ${r.COUNTRYCODE}`);
        continue;
      }
    }

    const loCode = r.LOCODE.trim().toUpperCase();

    // Skip duplicates
    if (await UnLoCodeModel.exists({ loCode, country: currentCountry._id })) {
      console.log(`⏩ Skipped duplicate ${loCode} for ${r.COUNTRYCODE}`);
      continue;
    }

    // Parse positional functions
    const functionCode = r.FUNCTIONCODE || "";
    const funcIds: mongoose.Types.ObjectId[] = [];
    for (let i = 0; i < functionCode.length; i++) {
      if (functionCode[i] !== "-") {
        const digit = (i + 1).toString(); // "1"-"7"
        if (funcMap[digit]) funcIds.push(funcMap[digit]);
      }
    }
    if (funcIds.length === 0) {
      console.warn(`⚠️ Skipping ${loCode} — no functions defined`);
      continue;
    }

    // Optional bits
    const coords = parseCoords(r.COORDS);
    const statusId = r.STATUS ? statusMap[r.STATUS] : null;
    const locCode = r.LOCATIONCODE ? Number(r.LOCATIONCODE) : undefined;

    // Create!
    try {
      await UnLoCodeModel.create({
        name: r.CITY?.trim(),
        loCode,
        description: r.DESC?.trim(),
        country: currentCountry._id,
        functions: funcIds, // <- plural matches schema
        status: statusId,
        locationCode: locCode,
        coordinates: coords,
        isDeleted: false,
      });
      imported++;
      if (imported % 100 === 0)
        process.stdout.write(`📦 Imported ${imported}...\r`);
    } catch (err: any) {
      console.error("❌ Failed row:", r, "\n   →", err.message);
    }
  }

  console.log(`\n✅ Imported ${imported} from ${path.basename(filePath)}`);
}

async function seedAll() {
  await mongoose.connect(
    "mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/ports"
  );
  console.log("🔌 MongoDB connected");

  // Preload lookups
  const statuses = await UnLoCodeStatusModel.find();
  const statusMap = Object.fromEntries(statuses.map((s) => [s.code, s._id]));
  const funcs = await UnLoCodeFunctionsModel.find();
  const funcMap = Object.fromEntries(funcs.map((f) => [f.code, f._id]));

  // CSVs to process
  const files = [
    "../../portList1.csv",
    "../../portList2.csv",
    "../../portList3.csv",
  ].map((f) => path.join(__dirname, f));

  for (const file of files) {
    console.log(`\n📥 Processing ${path.basename(file)}`);
    await processCsv(file, funcMap, statusMap);
  }

  console.log("\n🎯 All done!");
  await mongoose.disconnect();
}

seedAll().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
