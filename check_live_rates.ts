
import mongoose from "mongoose";
import { VariantRateModel } from "./src/database/models/variantRate";
import * as dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://obaol:Obaol123@obaol-automate.y70b8.mongodb.net/obaol-automate?retryWrites=true&w=majority";

async function checkLiveRates() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const count = await VariantRateModel.countDocuments({ isLive: true });
        console.log(`Total Live VariantRates: ${count}`);

        const allCount = await VariantRateModel.countDocuments({});
        console.log(`Total VariantRates (Any status): ${allCount}`);

        const sample = await VariantRateModel.findOne({ isLive: true }).populate("associate");
        if (sample) {
            console.log("Sample Live Rate:", JSON.stringify(sample, null, 2));
        } else {
            console.log("No live rates found to sample.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkLiveRates();
