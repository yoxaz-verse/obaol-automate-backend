import dotenv from "dotenv";
import mongoose from "mongoose";
import { cleanupAssociateOrphans, scanAssociateOrphans } from "../services/dataIntegrity.service";

dotenv.config();

async function run() {
  const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
  if (!uri) throw new Error("MONGODB_URI is missing.");
  await mongoose.connect(uri);
  const execute = process.argv.includes("--execute");
  if (!execute) {
    const entries = await scanAssociateOrphans();
    console.log(JSON.stringify({ mode: "dry-run", total: entries.reduce((sum, row) => sum + row.count, 0), entries }, null, 2));
    return;
  }
  const confirmationArg = process.argv.find((arg) => arg.startsWith("--confirmation="));
  const confirmation = confirmationArg?.slice("--confirmation=".length) || "";
  const result = await cleanupAssociateOrphans(confirmation);
  console.log(JSON.stringify({ mode: "execute", ...result }, null, 2));
}

run()
  .catch((error) => {
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
