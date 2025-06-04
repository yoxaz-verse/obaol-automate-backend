const mongoose = require("mongoose");
const fs = require("fs");
const csv = require("csv-parser");

mongoose.connect(
  "mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/oboal"
);

const Abbreviation = mongoose.model(
  "Abbreviation",
  new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    description: { type: String, required: true },
  })
);

const State = mongoose.model(
  "State",
  new mongoose.Schema({
    code: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    isUnionTerritory: { type: Boolean, default: false },
  })
);

const District = mongoose.model(
  "District",
  new mongoose.Schema({
    code: { type: Number, required: true },
    name: { type: String, required: true },
    state: { type: mongoose.Schema.Types.ObjectId, ref: "State" },
  })
);

const City = mongoose.model(
  "City",
  new mongoose.Schema({
    serialNo: { type: Number, required: true },
    name: { type: String, required: true },
    urbanStatus: { type: mongoose.Schema.Types.ObjectId, ref: "Abbreviation" },
    district: { type: mongoose.Schema.Types.ObjectId, ref: "District" },
  })
);

const ABBREVIATIONS = [
  { code: "C.B", description: "Cantonment Board / Cantonment" },
  { code: "C.M.C", description: "City Municipal Council" },
  { code: "C.T", description: "Census Town" },
  { code: "E.O", description: "Estate Office" },
  { code: "G.P", description: "Gram Panchayat" },
  { code: "I.N.A", description: "Industrial Notified Area" },
  { code: "I.T.S", description: "Industrial Township" },
  { code: "M", description: "Municipality" },
  { code: "M.B", description: "Municipal Board" },
  { code: "M.C", description: "Municipal Committee" },
  { code: "M.Cl", description: "Municipal Council" },
  { code: "M.Corp", description: "Municipal Corporation/Corporation" },
  { code: "N.A", description: "Notified Area" },
  {
    code: "N.A.C",
    description: "Notified Area Committee / Notified Area Council",
  },
  { code: "N.P", description: "Nagar Panchayat" },
  { code: "N.T", description: "Notified Town" },
  { code: "N.T.A", description: "Notified Town Area" },
  { code: "S.T.C", description: "Small Town Committee" },
  { code: "T.C", description: "Town Committee / Town Area Committee" },
  { code: "T.M.C", description: "Town Municipal Council" },
  { code: "T.P", description: "Town Panchayat" },
  { code: "T.S", description: "Township" },
];

const isValidNumber = (val) =>
  val !== undefined &&
  val !== null &&
  !isNaN(val) &&
  val.toString().trim() !== "";

(async () => {
  try {
    await Promise.all([
      Abbreviation.deleteMany({}),
      State.deleteMany({}),
      District.deleteMany({}),
      City.deleteMany({}),
    ]);
    console.log("🌱 Seeding abbreviations...");
    const abbrevDocs = await Abbreviation.insertMany(ABBREVIATIONS);
    const abbrevMap = new Map(abbrevDocs.map((a) => [a.code, a._id]));

    const stateMap = new Map();
    const districtMap = new Map();
    const results = [];

    console.log("📥 Reading CSV...");
    fs.createReadStream("data.csv")
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        let cityCount = 0;

        for (const row of results) {
          const serialNoRaw = row["Sl. No."]?.trim();
          const city = row["City/Town"]?.trim();
          let status = row["Urban Status"]?.trim();
          const stateCodeRaw = row["State Code"]?.trim();
          const stateNameRaw = row["State/Union territory"]?.trim();
          const districtCodesRaw = row["District Code"]?.trim();
          const districtNamesRaw = row["District"]?.trim();

          if (
            !isValidNumber(serialNoRaw) ||
            !city ||
            !status ||
            !isValidNumber(stateCodeRaw) ||
            !stateNameRaw ||
            !districtCodesRaw ||
            !districtNamesRaw
          ) {
            console.warn("⚠️ Skipping invalid row:", row);
            continue;
          }

          status = status.replace("M.Crop", "M.Corp");

          const serialNo = parseInt(serialNoRaw);
          const stateCode = parseInt(stateCodeRaw);
          const stateName = stateNameRaw.replace("*", "").trim();

          const districtCodes = districtCodesRaw
            .split(/&|and/i)
            .map((s) => s.trim());
          const districtNames = districtNamesRaw
            .split(/&|and/i)
            .map((s) => s.trim());

          // Mismatch warning only if both arrays exist and lengths differ
          if (districtCodes.length !== districtNames.length) {
            if (!(districtCodes.length === 1 || districtNames.length === 1)) {
              console.warn("⚠️ Mismatched district codes/names:", row);
              continue;
            }
          }
          let stateId;
          if (stateMap.has(stateCode)) {
            stateId = stateMap.get(stateCode);
          } else {
            let stateDoc = await State.findOne({ code: stateCode });
            if (!stateDoc) {
              stateDoc = await State.create({
                code: stateCode,
                name: stateName,
                isUnionTerritory: stateNameRaw.includes("*"),
              });
            }
            stateMap.set(stateCode, stateDoc._id);
            stateId = stateDoc._id;
          }

          for (let i = 0; i < districtCodes.length; i++) {
            const distCode = parseInt(districtCodes[i]);
            const distName = districtNames[i];

            if (!isValidNumber(distCode) || !distName) continue;

            const distKey = `${distCode}-${distName}`;
            let districtId;

            if (districtMap.has(distKey)) {
              districtId = districtMap.get(distKey);
            } else {
              let distDoc = await District.findOne({
                code: distCode,
                name: distName,
              });
              if (!distDoc) {
                distDoc = await District.create({
                  code: distCode,
                  name: distName,
                  state: stateId,
                });
              }
              districtMap.set(distKey, distDoc._id);
              districtId = distDoc._id;
            }

            const uniqueSerial =
              districtCodes.length > 1
                ? parseInt(serialNoRaw + (i + 1))
                : serialNo;

            if (abbrevMap.has(status)) {
              await City.create({
                serialNo: uniqueSerial,
                name: city,
                urbanStatus: abbrevMap.get(status),
                district: districtId,
              });
              cityCount++;
            } else {
              console.warn(`⚠️ Skipping unknown abbreviation: ${status}`);
            }
          }
        }

        console.log(`✅ Seeding complete. Inserted ${cityCount} cities.`);
        mongoose.disconnect();
      });
  } catch (err) {
    console.error("❌ Error:", err);
    mongoose.disconnect();
  }
})();
