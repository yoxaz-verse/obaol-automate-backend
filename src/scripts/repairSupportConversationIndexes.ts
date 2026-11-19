import dotenv from "dotenv";
import mongoose from "mongoose";
import { repairSupportConversationIndexes } from "../utils/supportConversationIndexes";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || "";
  if (!uri) throw new Error("Missing Mongo connection string.");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(uri);
  try {
    const collection = mongoose.connection.collection("supportconversations");
    console.log(JSON.stringify(await repairSupportConversationIndexes(collection, apply), null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Support conversation index repair failed:", error?.message || error);
  process.exitCode = 1;
});
