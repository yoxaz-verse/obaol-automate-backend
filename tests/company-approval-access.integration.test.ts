import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../src/app";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";

const api = request(app);
const cookieFor = (user: any, role = "Associate") => {
  const token = jwt.sign(
    { id: String(user._id), email: user.email, role },
    process.env.JWT_SECRET as string
  );
  return `auth_token=${token}`;
};

const createCompany = (overrides: Record<string, any> = {}) =>
  AssociateCompanyModel.create({
    name: `Approval Company ${new mongoose.Types.ObjectId().toHexString().slice(0, 6)}`,
    email: `approval.${new mongoose.Types.ObjectId().toHexString()}@example.com`,
    phone: "+919811111111",
    phoneSecondary: "+919822222222",
    registrationStatus: "PENDING_REVIEW",
    isApproved: false,
    ...overrides,
  });

describe("associate company approval access", () => {
  it("exposes the normalized pending company state while keeping reads available", async () => {
    const company = await createCompany();
    const associate = await createAssociate({ associateCompany: company._id });
    const cookie = cookieFor(associate);

    const session = await api.get("/api/v1/web/verify-token").set("Cookie", cookie);
    expect(session.status).toBe(200);
    expect(session.body.user.companyApproval).toMatchObject({
      companyId: String(company._id),
      companyName: company.name,
      status: "PENDING_REVIEW",
      isApproved: false,
      actionsAllowed: false,
    });

    expect((await api.get("/api/v1/web/catalog/hierarchy-options").set("Cookie", cookie)).status).not.toBe(403);
  });

  it("blocks direct business mutations with a stable error contract", async () => {
    const company = await createCompany({ reviewNotes: "Documents are under review." });
    const associate = await createAssociate({ associateCompany: company._id });

    const response = await api
      .post("/api/v1/web/catalog/add")
      .set("Cookie", cookieFor(associate))
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      code: "COMPANY_APPROVAL_REQUIRED",
      companyApproval: {
        status: "PENDING_REVIEW",
        actionsAllowed: false,
        reviewReason: "Documents are under review.",
      },
    });

    const genericCrudResponse = await api
      .post("/api/v1/web/products")
      .set("Cookie", cookieFor(associate))
      .send({ name: "Blocked product" });
    expect(genericCrudResponse.status).toBe(403);
    expect(genericCrudResponse.body.code).toBe("COMPANY_APPROVAL_REQUIRED");
  });

  it("treats a rejected or missing company as read-only", async () => {
    const rejectedCompany = await createCompany({
      registrationStatus: "REJECTED",
      reviewNotes: "Registration could not be verified.",
    });
    const rejectedAssociate = await createAssociate({ associateCompany: rejectedCompany._id });
    const missingCompanyAssociate = await createAssociate({ associateCompany: null });

    for (const associate of [rejectedAssociate, missingCompanyAssociate]) {
      const response = await api.post("/api/v1/web/catalog/add").set("Cookie", cookieFor(associate)).send({});
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("COMPANY_APPROVAL_REQUIRED");
    }
  });

  it("does not apply the associate company guard to operators", async () => {
    const operator = await createOperator();
    const response = await api
      .post("/api/v1/web/catalog/add")
      .set("Cookie", cookieFor(operator, "Operator"))
      .send({});
    expect(response.status).not.toBe(403);
  });

  it("allows approved-company mutations to reach the business controller", async () => {
    const company = await createCompany({ registrationStatus: "APPROVED", isApproved: true });
    const associate = await createAssociate({ associateCompany: company._id });
    const response = await api
      .post("/api/v1/web/catalog/add")
      .set("Cookie", cookieFor(associate))
      .send({});
    expect(response.body.code).not.toBe("COMPANY_APPROVAL_REQUIRED");
  });
});
