import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 5000;
export const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/activity-tracking";
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const JWT_EXPIRE = process.env.JWT_EXPIRE || "1d";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh";
export const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || "10d";
export const GOOGLE_EMAIL = process.env.GOOGLE_EMAIL || "";
export const GOOGLE_PASS = process.env.GOOGLE_PASS || "";
export const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "accessToken";
export const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "refreshToken";
export const CLIENT_ACCESS_TOKEN_SECRET =
  process.env.CLIENT_ACCESS_TOKEN_SECRET || "client accessToken";
export const CLIENT_REFRESH_TOKEN_SECRET =
  process.env.CLIENT_REFRESH_TOKEN_SECRET || "client refreshToken";
export const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com";
export const SUPER_ADMIN_PASSWORD =
  process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin12345";
export const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || "Super Admin";
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const AWS_REGION = process.env.AWS_REGION || "";
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";
export const SENDER_PHONE: string | undefined = process.env.SENDER_PHONE;
export const TWILIO_ACCOUNT_SID: string | undefined =
  process.env.TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN: string | undefined =
  process.env.TWILIO_AUTH_TOKEN;
