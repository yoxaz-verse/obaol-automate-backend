const mongoose = require("mongoose");

// PortStatus Schema
const portStatusSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const PortStatus = mongoose.model("PortStatus", portStatusSchema);

// LocationFunction Schema
const locationFunctionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);
const LocationFunction = mongoose.model(
  "LocationFunction",
  locationFunctionSchema
);

// Port Status Data
const portStatuses = [
  {
    code: "AA",
    description: "Approved by competent national government agency",
  },
  { code: "AC", description: "Approved by Customs Authority" },
  { code: "AF", description: "Approved by other official body" },
  { code: "AI", description: "Approval initiated" },
  { code: "AS", description: "Assigned – not fully validated" },
  { code: "RL", description: "Recognized location – not officially approved" },
  { code: "RQ", description: "Request under consideration" },
  { code: "UR", description: "Under review" },
  { code: "RR", description: "Request for removal" },
  { code: "RN", description: "Registered (not yet active)" },
  { code: "QQ", description: "Questionable data" },
  { code: "XX", description: "Removed from publication" },
];

// Location Function Data
const locationFunctions = [
  { name: "1", description: "Port (Sea)" },
  { name: "2", description: "Rail terminal" },
  { name: "3", description: "Road terminal" },
  { name: "4", description: "Airport" },
  { name: "5", description: "Postal exchange office" },
  { name: "6", description: "Inland clearance depot (ICD)/Dry port" },
  {
    name: "7",
    description:
      "Fixed transport function (e.g., oil platform, pipeline terminal)",
  },
];

// Insert function
async function insertEnums() {
  try {
    await mongoose.connect(
      "mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/ports"
    );

    for (const status of portStatuses) {
      const exists = await PortStatus.findOne({ code: status.code });
      if (!exists) {
        await PortStatus.create(status);
        console.log("✅ Inserted PortStatus:", status.code);
      } else {
        console.log("⏩ Skipped PortStatus:", status.code);
      }
    }

    for (const func of locationFunctions) {
      const exists = await LocationFunction.findOne({ name: func.name });
      if (!exists) {
        await LocationFunction.create(func);
        console.log("✅ Inserted LocationFunction:", func.name);
      } else {
        console.log("⏩ Skipped LocationFunction:", func.name);
      }
    }

    console.log("🎉 Enum insertion completed.");
    mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error inserting enums:", err);
    mongoose.disconnect();
  }
}

insertEnums();
