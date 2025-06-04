import mongoose from "mongoose";

interface IState extends mongoose.Document {
  code: string;
  name?: string;
  isUnionTerritory: boolean;
  isDeleted: boolean;
}

const StateSchema = new mongoose.Schema(
  {
    code: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    isUnionTerritory: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const StateModel = mongoose.model<IState>("State", StateSchema);
