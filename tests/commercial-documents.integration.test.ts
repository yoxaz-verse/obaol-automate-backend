import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { createAssociate } from "./helpers/authFixtures";
import { CommercialDocumentModel as Document } from "../src/database/models/commercialDocument";
import { sendTradeDocumentEmail } from "../src/utils/mailer";

vi.mock("../src/utils/mailer", () => ({ sendTradeDocumentEmail: vi.fn().mockResolvedValue(undefined) }));
const api = request(app), base = "/api/v1/web/commercial-documents";
async function issuer() {
  const company = await AssociateCompanyModel.create({ name: `Issuer ${new mongoose.Types.ObjectId()}`, email: `${new mongoose.Types.ObjectId()}@example.com`, phone: "+919999100001", phoneSecondary: "+919999100002", address: "12 Market Road", registrationStatus: "APPROVED", isApproved: true });
  const associate = await createAssociate({ associateCompany: company._id });
  const token = jwt.sign({ id: String(associate._id), email: associate.email, role: "Associate" }, process.env.JWT_SECRET as string);
  return { company, token };
}
async function customer(token: string) {
  const result = await api.post(`${base}/customers`).set("Authorization", `Bearer ${token}`).send({ name: "Buyer Ltd", contactName: "Buyer Person", email: "buyer@example.com", billingAddress: "44 Buyer Road" });
  expect(result.status).toBe(201); return result.body.data._id;
}
const payload = (customerId: string, type = "QUOTATION") => ({ type, customerId, items: [{ description: "Cardamom", quantity: 2, unit: "KG", unitPrice: 100, taxRate: 5 }], currency: "INR", issueDate: "2026-09-14" });

describe("company commercial documents", () => {
  it("isolates customers and documents and computes amounts on the server", async () => {
    const a = await issuer(), b = await issuer(), customerId = await customer(a.token);
    const denied = await api.post(base).set("Authorization", `Bearer ${b.token}`).send(payload(customerId));
    expect(denied.status).toBe(404);
    const one = await api.post(base).set("Authorization", `Bearer ${a.token}`).send({ ...payload(customerId), total: 1, subtotal: 1 });
    const two = await api.post(base).set("Authorization", `Bearer ${a.token}`).send(payload(customerId));
    expect(one.status).toBe(201); expect(one.body.data.total).toBe(210);
    expect(two.body.data.number).not.toBe(one.body.data.number);
    expect((await api.get(`${base}/${one.body.data._id}`).set("Authorization", `Bearer ${b.token}`)).status).toBe(404);
    expect((await api.get(base).set("Authorization", `Bearer ${b.token}`)).body.data).toHaveLength(0);
  });

  it("verifies quote acceptance, preserves sent versions, converts to invoice and tracks payment", async () => {
    const a = await issuer(), customerId = await customer(a.token);
    const created = await api.post(base).set("Authorization", `Bearer ${a.token}`).send(payload(customerId));
    const id = created.body.data._id;
    const sent = await api.post(`${base}/${id}/send`).set("Authorization", `Bearer ${a.token}`).send({});
    expect(sent.status).toBe(200);
    expect((await api.patch(`${base}/${id}`).set("Authorization", `Bearer ${a.token}`).send(payload(customerId))).status).toBe(409);
    const token = String(sent.body.shareUrl).split("/").pop();
    expect((await api.post(`${base}/share/${token}/code`).send({})).status).toBe(200);
    const mail = vi.mocked(sendTradeDocumentEmail).mock.calls.at(-1);
    const code = String(mail?.[3]).match(/code is (\d{6})/)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    expect((await api.post(`${base}/share/${token}/decision`).send({ decision: "ACCEPTED", code: "000000" })).status).toBe(403);
    expect((await api.post(`${base}/share/${token}/decision`).send({ decision: "ACCEPTED", code })).status).toBe(200);
    expect((await api.get(`${base}/share/${token}`)).status).toBe(200);
    const invoice = await api.post(`${base}/${id}/to-invoice`).set("Authorization", `Bearer ${a.token}`).send({});
    expect(invoice.status).toBe(201); expect(invoice.body.data.type).toBe("INVOICE");
    const invoiceId = invoice.body.data._id;
    expect((await api.post(`${base}/${invoiceId}/send`).set("Authorization", `Bearer ${a.token}`).send({})).status).toBe(200);
    const paid = await api.post(`${base}/${invoiceId}/payment`).set("Authorization", `Bearer ${a.token}`).send({ status: "PAID", reference: "BANK-1" });
    expect(paid.body.data.paymentStatus).toBe("PAID");
    const invoiceRevision = await api.post(`${base}/${invoiceId}/revise`).set("Authorization", `Bearer ${a.token}`).send({});
    expect(invoiceRevision.status).toBe(201); expect(invoiceRevision.body.data.revision).toBe(2);
    expect((await api.get(`${base}/${id}/revisions`).set("Authorization", `Bearer ${a.token}`)).body.data).toHaveLength(1);
    const revised = await api.post(`${base}/${id}/revise`).set("Authorization", `Bearer ${a.token}`).send({});
    expect(revised.status).toBe(201); expect(revised.body.data.revision).toBe(2);
    expect((await Document.findById(id))?.status).toBe("ACCEPTED");
    expect((await api.get(`${base}/${id}/revisions`).set("Authorization", `Bearer ${a.token}`)).body.data).toHaveLength(2);
    expect((await api.get(`${base}/share/${token}`)).status).toBe(404);
  });
  it("rejects expired and revoked links", async () => {
    const a = await issuer(), customerId = await customer(a.token);
    const created = await api.post(base).set("Authorization", `Bearer ${a.token}`).send(payload(customerId));
    const id = created.body.data._id;
    const sent = await api.post(`${base}/${id}/send`).set("Authorization", `Bearer ${a.token}`).send({});
    const token = String(sent.body.shareUrl).split("/").pop();
    await Document.findByIdAndUpdate(id, { shareExpiresAt: new Date(Date.now() - 1000) });
    expect((await api.get(`${base}/share/${token}`)).status).toBe(404);
    await Document.findByIdAndUpdate(id, { shareExpiresAt: new Date(Date.now() + 86400000) });
    expect((await api.post(`${base}/${id}/revoke`).set("Authorization", `Bearer ${a.token}`).send({})).status).toBe(200);
    expect((await api.get(`${base}/share/${token}`)).status).toBe(404);
  });
});
