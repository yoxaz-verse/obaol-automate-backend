import { Document } from "mongoose";

export interface ICommissionRule extends Document {
  name: string;
  isActive?: boolean;
  isDefault?: boolean;
  poolPercent: number;
  closerPercent: number;
  portfolioPercent: number;
  leadershipL1Percent: number;
  leadershipL2Percent: number;
  leadershipL3PoolPercent: number;
  leadershipL3MaxEachPercent: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
