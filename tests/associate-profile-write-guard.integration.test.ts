import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app";
import { AssociateModel } from "../src/database/models/associate";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { createAssociate } from "./helpers/authFixtures";

const api = request(app);

const tokenFor = (id: mongoose.Types.ObjectId, role: string) =>
  generateJWTToken(
    {
      _id: id,
      email: `${role.toLowerCase()}@example.com`,
      role,
    } as any,
    "1h"
  );

describe("Associate profile update API guard", () => {
  it("rejects protected status fields from an associate without changing stored values", async () => {
    const associate = await createAssociate({
      isActive: true,
      isCompanyVerified: false,
      isEmailVerified: false,
      registrationStatus: "PENDING_REVIEW",
    });

    const response = await api
      .patch(`/api/v1/web/associates/${associate._id}`)
      .set("Authorization", `Bearer ${tokenFor(associate._id, "Associate")}`)
      .send({
        isActive: false,
        isCompanyVerified: true,
        isEmailVerified: true,
        registrationStatus: "APPROVED",
      });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("admin-controlled");

    const unchanged = await AssociateModel.findById(associate._id).lean();
    expect(unchanged).toMatchObject({
      isActive: true,
      isCompanyVerified: false,
      isEmailVerified: false,
      registrationStatus: "PENDING_REVIEW",
    });
  });

  it("allows an associate to update an ordinary profile field", async () => {
    const associate = await createAssociate();

    const response = await api
      .patch(`/api/v1/web/associates/${associate._id}`)
      .set("Authorization", `Bearer ${tokenFor(associate._id, "Associate")}`)
      .send({ phone: "+919876543210" });

    expect(response.status).toBe(200);
    expect(response.body.data.phone).toBe("+919876543210");
  });

  it("allows an admin to update protected status fields", async () => {
    const associate = await createAssociate({
      isActive: false,
      isCompanyVerified: false,
      registrationStatus: "PENDING_REVIEW",
    });
    const adminId = new mongoose.Types.ObjectId();

    const response = await api
      .patch(`/api/v1/web/associates/${associate._id}`)
      .set("Authorization", `Bearer ${tokenFor(adminId, "Admin")}`)
      .send({
        isActive: true,
        isCompanyVerified: true,
        registrationStatus: "APPROVED",
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      isActive: true,
      isCompanyVerified: true,
      registrationStatus: "APPROVED",
    });
  });
});
