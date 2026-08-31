import { beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer | null = null;

process.env.AUTH_LOGIN_RATE_LIMIT_MAX = process.env.AUTH_LOGIN_RATE_LIMIT_MAX || "500";
process.env.AUTH_PASSKEY_RATE_LIMIT_MAX = process.env.AUTH_PASSKEY_RATE_LIMIT_MAX || "500";

beforeAll(async () => {
  process.env.MONGOMS_IP = "127.0.0.1";
  mongo = await MongoMemoryServer.create({
    instance: {
      ip: "127.0.0.1",
    },
  });
  const uri = mongo.getUri();
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.NODE_ENV = "test";
  process.env.BASE_URL = process.env.BASE_URL || "http://localhost:3000";
  process.env.SMTP_HOST = process.env.SMTP_HOST || "smtp.test.local";
  process.env.SMTP_PORT = process.env.SMTP_PORT || "587";
  process.env.SMTP_SECURE = process.env.SMTP_SECURE || "false";
  process.env.SMTP_AUTH_PASSWORD = process.env.SMTP_AUTH_PASSWORD || "test-password";
  process.env.SMTP_AUTH_USER = process.env.SMTP_AUTH_USER || "no-reply@auth.obaol.com";
  process.env.SMTP_NOTIFY_USER = process.env.SMTP_NOTIFY_USER || "no-reply@notify.obaol.com";
  process.env.SMTP_SUPPORT_USER = process.env.SMTP_SUPPORT_USER || "info@support.obaol.com";

  await mongoose.connect(uri);
});

beforeEach(async () => {
  if (!mongoose.connection.db) return;
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});
