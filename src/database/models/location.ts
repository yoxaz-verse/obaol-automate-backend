import { ILocation } from "../../interfaces/location";
import mongoose from "mongoose";

const LocationSchema = new mongoose.Schema<ILocation>(
  {
    customId: { type: String, unique: true }, // Ensure uniqueness
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
    locationManager: [
      { type: mongoose.Schema.Types.ObjectId, ref: "LocationManager" },
    ],
    locationType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LocationType",
      required: true,
    },
  },
  { timestamps: true }
);

// Custom ID generator
LocationSchema.pre<ILocation>("save", async function (next) {
  if (!this.customId && this.isNew) {
    const provinceKey = this.province.toUpperCase(); // Convert province name to uppercase for consistency

    // Find or create a sequence value for the provinceKey
    const counter = await LocationCounterModel.findOneAndUpdate(
      { provinceKey },
      { $inc: { sequenceValue: 1 } }, // Increment the sequence value
      { new: true, upsert: true } // Create if it doesn't exist
    );

    const sequenceNumber = counter.sequenceValue.toString().padStart(5, "0"); // Pad sequence to 5 digits
    this.customId = `MG-${provinceKey}-${sequenceNumber}`; // Construct the customId
  }
  next();
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
