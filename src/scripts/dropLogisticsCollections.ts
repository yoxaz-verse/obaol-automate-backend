import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const COLLECTIONS = [
  "logisticsquotes",
  "logisticsratemasters",
  "logisticschargerules",
  "logisticsproviderconfigs",
  "logisticsschedulecaches",
];

async function run() {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    if (!db) throw new Error("Mongo database handle unavailable.");

    for (const collectionName of COLLECTIONS) {
      const exists = await db
        .listCollections({ name: collectionName }, { nameOnly: true })
        .hasNext();

      if (!exists) {
        console.log(`skip: ${collectionName} (not found)`);
        continue;
      }

      await db.dropCollection(collectionName);
      console.log(`dropped: ${collectionName}`);
    }

    console.log("Logistics collection cleanup complete.");
  } catch (error: any) {
    console.error("Failed to drop logistics collections:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
