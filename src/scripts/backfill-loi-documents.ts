import dotenv from "dotenv";
import mongoose, { Types } from "mongoose";
import { InquiryModel } from "../database/models/enquiry";
import { TradeDocumentModel } from "../database/models/tradeDocument";
import { TradeDocumentController } from "../controllers/tradeDocumentController";

dotenv.config();

async function run() {
  try {
    const uri = (process.env.MONGODB_URI || process.env.MONGO_URI) as string;
    if (!uri) throw new Error("MONGODB_URI is missing.");
    await mongoose.connect(uri);

    const controller = new TradeDocumentController();
    const enquiries = await InquiryModel.find({
      isDeleted: { $ne: true },
      loiSubmittedAt: { $exists: true, $ne: null },
    }).select("_id");

    let created = 0;
    for (const enquiry of enquiries) {
      const enquiryId = new Types.ObjectId(String(enquiry._id));
      const existing = await TradeDocumentModel.findOne({
        enquiryId,
        type: "LOI",
        isDeleted: { $ne: true },
      }).select("_id");
      if (existing) continue;
      const doc = await controller.autoCreateLoiForInquiry(enquiryId);
      if (doc) created += 1;
    }

    console.log(`LOI documents created: ${created}`);
  } catch (error: any) {
    console.error("Failed to backfill LOI documents:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
