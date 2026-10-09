import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/core/hooks", () => ({ registerAllHooks: vi.fn() }));
vi.mock("../src/routes", () => ({ default: express.Router() }));

import app, { getReadinessStatus } from "../src/app";

describe("health endpoints", () => {
  it("reports the process as live without requiring MongoDB", async () => {
    const response = await request(app).get("/health/live");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("maps a disconnected MongoDB state to not ready", () => {
    expect(getReadinessStatus(0)).toEqual({
      ready: false,
      body: {
        status: "not_ready",
        dependencies: { mongodb: "disconnected" },
      },
    });
  });

  it("reports ready when MongoDB is connected", async () => {
    const response = await request(app).get("/health/ready");
    expect(response.status).toBe(200);
    expect(response.body.dependencies.mongodb).toBe("connected");
  });
});
