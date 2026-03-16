import { Document, Types } from "mongoose";
import { TradeDocumentType } from "./tradeDocument";

export interface IDocumentSequence extends Document {
  companyId: Types.ObjectId;
  docType: TradeDocumentType;
  year: number;
  seq: number;
  createdAt: Date;
  updatedAt: Date;
}
