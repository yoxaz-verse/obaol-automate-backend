import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 5000;
export const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://yoxaz:3hoZTHvJcbPkUkyL@italy-activity.kk3db.mongodb.net/activity-tracking";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const JWT_EXPIRE = process.env.JWT_EXPIRE || "1d";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh";
export const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "10d";
