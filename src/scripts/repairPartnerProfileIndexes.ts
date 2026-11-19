import dotenv from "dotenv";
import mongoose from "mongoose";
import { repairPartnerProfileIndexes } from "../utils/partnerProfileIndexes";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(uri);
  try {
    const reports = await repairPartnerProfileIndexes(mongoose.connection, apply);
    console.log(JSON.stringify(reports, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Partner profile index repair failed:", error?.message || error);
  process.exitCode = 1;
});
