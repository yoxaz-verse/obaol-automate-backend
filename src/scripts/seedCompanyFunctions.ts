import dotenv from "dotenv";
import mongoose from "mongoose";
import { seedCompanyFunctions } from "../seeds/companyFunctions.seed";

dotenv.config();

(async () => {
  try {
    const uri = process.env.MONGODB_URI as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);
    await seedCompanyFunctions();
    console.log("Company functions seed completed.");
  } catch (error: any) {
    console.error("Company functions seed failed:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
