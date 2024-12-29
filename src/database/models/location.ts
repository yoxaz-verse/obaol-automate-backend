import mongoose from "mongoose";
import { ILocation } from "../../interfaces/location";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    customId: { type: String, unique: true },
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String },
    isNearAnotherLocation: { type: Boolean, default: false },
    latitude: { type: String },
    longitude: { type: String },
    map: { type: String, required: true },
    nation: { type: String, required: true },
    owner: { type: String, required: true },
    province: { type: String, required: true },
    street: { type: String },
    region: { type: String, required: true },
    locationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationType",
      required: true,
    },
    locationManagers: [
      {
        manager: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "LocationManager",
          required: true,
        },
        code: { type: String, required: true }, // Code specific to this location
      },
    ],
  },
  { timestamps: true }
);

// Custom ID generator
LocationSchema.pre<ILocation>("save", async function (next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!this.customId) {
      const provinceKey = this.province.toUpperCase();

      const counter = await LocationCounterModel.findOneAndUpdate(
        { provinceKey },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true, session }
      );

      if (!counter) {
        throw new Error(
          `Failed to update sequence for province: ${provinceKey}`
        );
      }

      const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0");
      this.customId = `MG-${provinceKey}-${sequenceNumber}`;
      console.log(`Generated customId: ${this.customId}`);
    }
    await session.commitTransaction();
    next();
  } catch (error) {
    await session.abortTransaction();
    console.error("Transaction Error in pre-save hook:", error);
    next();
  } finally {
    session.endSession();
  }
});

const LocationCounterSchema = new mongoose.Schema({
  provinceKey: { type: String, unique: true }, // Province name as the unique key
  sequenceValue: { type: Number, default: 0 }, // Incrementing sequence number
});

export const LocationCounterModel = mongoose.model(
  "LocationCounter",
  LocationCounterSchema
);

export const LocationModel = mongoose.model<ILocation>(
  "Location",
  LocationSchema
);
