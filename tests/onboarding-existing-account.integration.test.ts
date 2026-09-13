import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import { AssociateModel } from "../src/database/models/associate";
import { createAssociate, createOperator } from "./helpers/authFixtures";

const api = request(app);
const start = (email: string, role: "Associate" | "Operator") =>
  api.post("/api/v1/web/auth/onboarding/start").send({ email, role });

describe("onboarding existing accounts", () => {
  it("starts onboarding for a new email", async () => {
    const email = `new.${new mongoose.Types.ObjectId().toHexString()}@example.com`;
    const response = await start(email, "Associate");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, user: { email, role: "Associate" } });
    expect(await AssociateModel.exists({ email })).toBeTruthy();
  });

  it("returns the matching role for a completed account", async () => {
    const associate = await createAssociate();
    const response = await start(associate.email, "Associate");

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ success: false, role: "Associate" });
    expect(await AssociateModel.exists({ _id: associate._id })).toBeTruthy();
  });

  it("preserves another role's recent draft and returns its role", async () => {
    const associate = await createAssociate({
      onboardingComplete: false,
      isEmailVerified: false,
      createdAt: new Date(),
    });
    const response = await start(associate.email, "Operator");

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ success: false, role: "Associate" });
    expect(await AssociateModel.exists({ _id: associate._id })).toBeTruthy();
  });

  it("returns Operator when registering an Associate with an Operator email", async () => {
    const operator = await createOperator();
    const response = await start(operator.email, "Associate");

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ success: false, role: "Operator" });
  });
});
