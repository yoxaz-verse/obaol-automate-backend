const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

// Models
const Country = require("../database/models/country");
const UnLoCodeStatus = require("../database/models/unLoCodeStatus");
const UnLoCodeFunction = require("../database/models/unLoCodeFunction");
const UnLoCode = require("../database/models/unLoCode");
const UnLoCodeAdminArea = require("../database/models/unLoCodeAdminArea");

mongoose.connect("mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/ports");

const ADMIN_AREA_CSV = path.join(__dirname, "../../data/adminAreas.csv");
const PORT_LIST_CSV = path.join(__dirname, "../../data/portList.csv");

function parseCoords(raw = "") {
  const [latRaw = "", lonRaw = ""] = raw.trim().split(/\s+/);
  if (!latRaw || !lonRaw) return { latitude: "", longitude: "" };

  const latDeg = +latRaw.slice(0, 2),
    latMin = +latRaw.slice(2, 4),
    lat = latDeg + latMin / 60,
    latitude = latRaw.endsWith("S") ? -lat : lat;

  const lonDeg = +lonRaw.slice(0, 3),
    lonMin = +lonRaw.slice(3, 5),
    lon = lonDeg + lonMin / 60,
    longitude = lonRaw.endsWith("W") ? -lon : lon;

  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
  };
}

(async () => {
  try {
    console.log("🌍 Connecting to MongoDB...");
    const statuses = await UnLoCodeStatus.find();
    const statusMap = new Map(statuses.map((s) => [s.code, s._id]));

    const funcs = await UnLoCodeFunction.find();
    const funcMap = new Map(funcs.map((f) => [f.name, f._id]));

    console.log("📥 Loading admin areas...");
    const adminAreaMap = {};
    await new Promise((resolve, reject) => {
      fs.createReadStream(ADMIN_AREA_CSV)
        .pipe(csv({ separator: "\t", skipEmptyLines: true }))
        .on("data", (row) => {
          const country = row["COUNTRYCODE"]?.trim();
          const code = row["ADMINCODE"]?.trim();
          const name = row["ADMINAREANAME"]?.trim();
          if (country && code && name) {
            adminAreaMap[`${country}-${code}`] = name;
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("📦 Seeding port list...");
    const rows = [];
    fs.createReadStream(PORT_LIST_CSV)
      .pipe(csv({ skipEmptyLines: true }))
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        let currentCountry = null;
        let count = 0;

        for (const row of rows) {
          try {
            const countryCode = row["COUNTRYCODE"]?.trim();
            const locode = row["LOCODE"]?.trim();
            const city = row["CITY"]?.trim();
            const desc = row["DESC"]?.trim();
            const adminCode = row["ADMINAREA"]?.trim();
            const funcCode = row["FUNCTIONCODE"]?.trim();
            const statusCode = row["STATUS"]?.trim();
            const locCode = row["LOCATIONCODE"]?.trim();
            const coordsRaw = row["COORDS"]?.trim();

            // Handle country header
            if (!locode && desc?.startsWith(".")) {
              const countryName = desc.slice(1).trim();
              currentCountry = await Country.findOneAndUpdate(
                { code: countryCode },
                { code: countryCode, name: countryName },
                { upsert: true, new: true }
              );
              console.log(`→ Country: ${countryCode} = ${countryName}`);
              continue;
            }

            if (!locode || !countryCode) {
              console.warn("⚠️ Skipping bad row:", row);
              continue;
            }

            // Ensure currentCountry is set
            if (!currentCountry || currentCountry.code !== countryCode) {
              currentCountry = await Country.findOne({ code: countryCode });
              if (!currentCountry) {
                console.warn(`⚠️ Unknown country ${countryCode} — skipping`);
                continue;
              }
            }

            const adminKey = `${countryCode}-${adminCode}`;
            const adminName = adminAreaMap[adminKey] || null;

            let adminDoc = null;
            if (adminCode) {
              adminDoc = await UnLoCodeAdminArea.findOneAndUpdate(
                { countryCode, code: adminCode },
                { countryCode, code: adminCode, name: adminName },
                { upsert: true, new: true }
              );
            }

            const statusId = statusMap.get(statusCode) || null;
            const funcDigit = (funcCode.match(/[1-7]/) || [])[0];
            const funcId = funcDigit ? funcMap.get(funcDigit) : null;
            const coords = parseCoords(coordsRaw);

            await UnLoCode.create({
              loCode: locode,
              city,
              description: desc,
              country: currentCountry._id,
              adminArea: adminCode || null,
              adminAreaName: adminName,
              function: funcId,
              status: statusId,
              locationCode: locCode ? +locCode : null,
              coordinates: coords,
              isDeleted: false,
            });

            if (++count % 250 === 0) {
              process.stdout.write(`🚢 Imported: ${count}\r`);
            }
          } catch (err) {
            console.error("❌ Row error:", err);
          }
        }

        console.log(`\n✅ Done. Total imported: ${count}`);
        await mongoose.disconnect();
      });
  } catch (err) {
    console.error("❌ Failed to seed ports:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
})();
