import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { createAdmin, createAssociate } from "./helpers/authFixtures";

const api = request(app);
const tokenFor = (user: any, role: string) => generateJWTToken({ ...user.toObject(), role } as any, "1h");

describe("User exports", () => {
  it("exports every filtered associate in newest-created order without sensitive fields", async () => {
    const admin = await createAdmin();
    const older = await createAssociate({ name: "Export Match Older", email: "older-export@example.com" });
    const newer = await createAssociate({ name: "Export Match Newer", email: "newer-export@example.com" });
    await older.updateOne({ $set: { createdAt: new Date("2026-01-01T00:00:00.000Z") } });
    await newer.updateOne({ $set: { createdAt: new Date("2026-01-02T00:00:00.000Z") } });

    const response = await api
      .get("/api/v1/web/users/export")
      .set("Authorization", `Bearer ${tokenFor(admin, "Admin")}`)
      .query({ userType: "associate", format: "csv", search: "Export Match" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    const csv = response.text;
    expect(csv.indexOf("Export Match Newer")).toBeLessThan(csv.indexOf("Export Match Older"));
    expect(csv).not.toContain("Passw0rd!");
    expect(csv).not.toContain("loginLockedUntil");
  });

  it("returns a real xlsx workbook and rejects non-admin callers", async () => {
    const admin = await createAdmin();
    const associate = await createAssociate();

    const workbook = await api
      .get("/api/v1/web/users/export")
      .set("Authorization", `Bearer ${tokenFor(admin, "Admin")}`)
      .query({ userType: "admin", format: "xlsx" })
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(workbook.status).toBe(200);
    expect(workbook.headers["content-type"]).toContain("spreadsheetml.sheet");
    expect(Buffer.isBuffer(workbook.body)).toBe(true);

    const forbidden = await api
      .get("/api/v1/web/users/export")
      .set("Authorization", `Bearer ${tokenFor(associate, "Associate")}`)
      .query({ userType: "associate", format: "csv" });
    expect(forbidden.status).toBe(403);
  });
});
