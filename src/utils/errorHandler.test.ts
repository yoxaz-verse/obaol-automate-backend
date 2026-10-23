import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("./errorLogger", () => ({ logError: vi.fn().mockResolvedValue(undefined) }));

import { errorHandler } from "./errorHandler";
import { AppError, badRequest, forbidden } from "../core/errors/AppError";

const response = () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { res: { status } as unknown as Response, status, json };
};

describe("API error sanitization", () => {
  it("preserves the stable AppError contract and request identifier", async () => {
    const { res, status, json } = response();
    const req = { requestId: "request-123", originalUrl: "/api/v1/web/inquiries", method: "POST", body: {}, params: {}, query: {} } as Request;
    await errorHandler(badRequest("Please correct the highlighted fields.", { quantity: "Quantity is required." }), req, res, vi.fn());
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      errors: { quantity: "Quantity is required." },
      requestId: "request-123",
    });
  });

  it("retains authorization status and code", async () => {
    const { res, status, json } = response();
    const req = { requestId: "request-456", originalUrl: "/api/v1/web/inquiries/1", method: "PATCH", body: {}, params: {}, query: {} } as Request;
    await errorHandler(forbidden(), req, res, vi.fn());
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: "FORBIDDEN", requestId: "request-456" }));
  });

  it("marks only client errors as operational", () => {
    expect(forbidden().operational).toBe(true);
    expect(new AppError("Provider failed", { statusCode: 502 }).operational).toBe(false);
  });

  it("hides legacy lab index details behind an actionable service error", async () => {
    const { res, status, json } = response();
    const req = { originalUrl: "/api/v1/web/lab-profiles/mine", method: "POST", body: {}, params: {}, query: {} } as Request;
    await errorHandler({ code: 11000, message: "E11000 duplicate key error collection: obaol.labprofiles index: companyId_1 dup key: { companyId: ObjectId('secret') }" }, req, res, vi.fn());
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "LAB_PROFILE_INDEX_MIGRATION_REQUIRED" }));
    expect(JSON.stringify(json.mock.calls)).not.toContain("ObjectId");
    expect(JSON.stringify(json.mock.calls)).not.toContain("labprofiles");
  });

  it("returns a generic conflict for other duplicate resources", async () => {
    const { res, status, json } = response();
    const req = { originalUrl: "/api/v1/web/companies", method: "POST", body: {}, params: {}, query: {} } as Request;
    await errorHandler({ code: 11000, message: "E11000 duplicate key error index: email_1 dup key" }, req, res, vi.fn());
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: "DUPLICATE_RESOURCE", message: "A record with these details already exists." }));
  });
});
