import mongoose from "mongoose";

const SequenceSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
});

export const SequenceModel = mongoose.model("Sequence", SequenceSchema);
