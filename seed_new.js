const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/port";

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// === SCHEMAS ===

const stateSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});
const State = mongoose.model("State", stateSchema);

const districtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
});
districtSchema.index({ name: 1, state: 1 }, { unique: true });
const District = mongoose.model("District", districtSchema);

const divisionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "District",
    required: true,
  },
});
divisionSchema.index({ name: 1, district: 1 }, { unique: true });
const Division = mongoose.model("Division", divisionSchema);

const pincodeSchema = new mongoose.Schema({
  pincode: { type: String, required: true },
  officename: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  division: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Division",
    required: true,
  },
});
pincodeSchema.index(
  { pincode: 1, officename: 1, division: 1 },
  { unique: true }
);
const PincodeEntry = mongoose.model("PincodeEntry", pincodeSchema);

// === UTILITY ===

const isValidNumber = (val) => {
  if (typeof val !== "string" && typeof val !== "number") return false;
  const s = val.toString().trim();
  return s !== "" && !isNaN(s);
};

const isValidField = (val) => {
  return val && val.trim().toLowerCase() !== "na";
};

// === MAIN ===

(async () => {
  try {
    console.log("🗑️  Clearing existing collections...");
    await Promise.all([
      State.deleteMany({}),
      District.deleteMany({}),
      Division.deleteMany({}),
      PincodeEntry.deleteMany({}),
    ]);

    const stateMap = new Map();
    const districtMap = new Map();
    const divisionMap = new Map();

    const csvPath = "location.csv";
    console.log("📥 Reading CSV...");
    const rows = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        console.log(`🔎 Parsed ${rows.length} rows. Beginning processing...`);
        let insertedCount = 0;

        for (const row of rows) {
          const rawStateName = row["statename"]?.trim();
          const rawDistrictName = row["district"]?.trim();
          const rawDivisionName = row["divisionname"]?.trim();
          const rawOfficeName = row["officename"]?.trim();
          const rawPincode = row["pincode"]?.toString().trim();
          const rawLat = row["latitude"]?.trim();
          const rawLon = row["longitude"]?.trim();

          // === VALIDATION ===
          if (
            !isValidField(rawStateName) ||
            !isValidField(rawDistrictName) ||
            !isValidField(rawDivisionName) ||
            !isValidField(rawOfficeName) ||
            !isValidField(rawPincode)
          ) {
            console.warn(
              "⚠️ Skipping row with 'NA' or missing required fields:",
              row
            );
            continue;
          }

          // === STATE ===
          let stateId;
          if (stateMap.has(rawStateName)) {
            stateId = stateMap.get(rawStateName);
          } else {
            let stateDoc = await State.findOne({ name: rawStateName });
            if (!stateDoc) {
              stateDoc = await State.create({ name: rawStateName });
              console.log(`   ➕ Created State: ${rawStateName}`);
            }
            stateId = stateDoc._id;
            stateMap.set(rawStateName, stateId);
          }

          // === DISTRICT ===
          const districtKey = `${rawStateName}||${rawDistrictName}`;
          let districtId;
          if (districtMap.has(districtKey)) {
            districtId = districtMap.get(districtKey);
          } else {
            let districtDoc = await District.findOne({
              name: rawDistrictName,
              state: stateId,
            });
            if (!districtDoc) {
              districtDoc = await District.create({
                name: rawDistrictName,
                state: stateId,
              });
              console.log(`   ➕ Created District: ${rawDistrictName}`);
            }
            districtId = districtDoc._id;
            districtMap.set(districtKey, districtId);
          }

          // === DIVISION ===
          const divisionKey = `${districtId.toString()}||${rawDivisionName}`;
          let divisionId;
          if (divisionMap.has(divisionKey)) {
            divisionId = divisionMap.get(divisionKey);
          } else {
            let divisionDoc = await Division.findOne({
              name: rawDivisionName,
              district: districtId,
            });
            if (!divisionDoc) {
              divisionDoc = await Division.create({
                name: rawDivisionName,
                district: districtId,
              });
              console.log(`   ➕ Created Division: ${rawDivisionName}`);
            }
            divisionId = divisionDoc._id;
            divisionMap.set(divisionKey, divisionId);
          }

          // === COORDINATES ===
          let latitude = undefined;
          let longitude = undefined;

          if (isValidNumber(rawLat)) latitude = parseFloat(rawLat);
          if (isValidNumber(rawLon)) longitude = parseFloat(rawLon);

          // === PINCODE ENTRY ===
          try {
            await PincodeEntry.create({
              pincode: rawPincode,
              officename: rawOfficeName,
              latitude,
              longitude,
              division: divisionId,
            });
            insertedCount++;
          } catch (err) {
            if (err.code === 11000) {
              // Duplicate
            } else {
              console.error("   ❌ Error inserting PincodeEntry:", err);
            }
          }
        }

        console.log(
          `✅ Seeding complete. Inserted ${insertedCount} Pincode entries.`
        );
        mongoose.disconnect();
      });
  } catch (err) {
    console.error("❌ Error during seeding:", err);
    mongoose.disconnect();
  }
})();
