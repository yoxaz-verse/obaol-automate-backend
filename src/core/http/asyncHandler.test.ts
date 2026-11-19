import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { asyncHandler } from "./asyncHandler";

describe("asyncHandler", () => {
  it("forwards rejected controllers to Express error middleware", async () => {
    const app = express();
    const failure = new Error("approval write failed");
    const errorMiddleware = vi.fn((error, _req, res, _next) => {
      res.status(500).json({ success: false, message: error.message, requestId: "request-123" });
    });

    app.patch("/approval", asyncHandler(async () => {
      throw failure;
    }));
    app.use(errorMiddleware);

    const response = await request(app).patch("/approval").send({ action: "APPROVE" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: "approval write failed", requestId: "request-123" });
    expect(errorMiddleware).toHaveBeenCalledOnce();
    expect(errorMiddleware.mock.calls[0][0]).toBe(failure);
  });

  it("does not invoke error middleware for a successful controller", async () => {
    const app = express();
    const errorMiddleware = vi.fn((_error, _req, res, _next) => res.sendStatus(500));

    app.patch("/approval", asyncHandler(async (_req, res) => {
      res.status(200).json({ success: true });
    }));
    app.use(errorMiddleware);

    const response = await request(app).patch("/approval").send({ action: "APPROVE" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(errorMiddleware).not.toHaveBeenCalled();
  });
});
