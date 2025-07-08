import { UnLoCodeFunctionsModel } from "../database/models/unLoCodeFunction";
import { UnLoCodeStatusModel } from "../database/models/unLoCodeStatus";
import mongoose from "mongoose";

// Port Status Data
const portStatuses: { code: string; description: string }[] = [
  {
    code: "AA",
    description: "Approved by competent national government agency",
  },
  { code: "AM", description: "Ambiguous / Missing definition" },
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
const locationFunctions: { code: string; name: string; description: string }[] =
  [
    {
      code: "1",
      name: "Port (Sea)",
      description:
        "Location functions as a maritime sea port handling cargo and passengers.",
    },
    {
      code: "2",
      name: "Rail Terminal",
      description:
        "Location serves as a railway terminal for the loading and unloading of goods or passengers.",
    },
    {
      code: "3",
      name: "Road Terminal",
      description:
        "Location functions as a road-based cargo or bus terminal for overland transportation.",
    },
    {
      code: "4",
      name: "Airport",
      description:
        "Location is an airport handling air freight and/or passenger services.",
    },
    {
      code: "5",
      name: "Postal Exchange Office",
      description:
        "Location is used as an international or domestic postal mail exchange center.",
    },
    {
      code: "6",
      name: "Inland Clearance Depot (ICD) / Dry Port",
      description:
        "Location functions as a dry port or inland terminal for customs clearance and intermodal transfers.",
    },
    {
      code: "7",
      name: "Fixed Transport Facility",
      description:
        "Permanent transport location like pipeline terminals or offshore oil platforms.",
    },
  ];

async function insertEnums(): Promise<void> {
  try {
    await mongoose.connect(
      "mongodb+srv://yakobyte:AU5ZldseqnrEtMUK@obaol-cluster.oq0ij.mongodb.net/ports"
    );

    for (const status of portStatuses) {
      const exists = await UnLoCodeStatusModel.findOne({ code: status.code });
      if (!exists) {
        await UnLoCodeStatusModel.create(status);
        console.log("✅ Inserted PortStatus:", status.code);
      } else {
        console.log("⏩ Skipped PortStatus:", status.code);
      }
    }

    for (const func of locationFunctions) {
      const exists = await UnLoCodeFunctionsModel.findOne({ code: func.code });
      if (!exists) {
        await UnLoCodeFunctionsModel.create(func);
        console.log("✅ Inserted LocationFunction:", func.code);
      } else {
        console.log("⏩ Skipped LocationFunction:", func.code);
      }
    }

    console.log("🎉 Enum insertion completed.");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Error inserting enums:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

insertEnums();
