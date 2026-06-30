import mongoose from "mongoose";
import dotenv from "dotenv";
import { AssociateModel } from "../database/models/associate";

dotenv.config();

const run = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required.");
  await mongoose.connect(mongoUri);
  const result = await AssociateModel.updateMany(
    { tradeMode: { $nin: ["BUY", "SELL", "BOTH"] } },
    { $set: { tradeMode: "BOTH" } }
  );
  console.log(`Backfilled trade mode for ${result.modifiedCount} associates.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
