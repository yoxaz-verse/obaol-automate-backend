import { beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongo: MongoMemoryServer | null = null;

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
