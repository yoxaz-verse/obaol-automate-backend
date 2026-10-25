import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { createAssociate } from "./helpers/authFixtures";

const api = request(app);
const base = "/api/v1/web/trade-documents";

async function companyUser(label: string, referredByCompanyId?: mongoose.Types.ObjectId) {
  const company = await AssociateCompanyModel.create({ name: `${label} ${new mongoose.Types.ObjectId()}`, email: `${new mongoose.Types.ObjectId()}@example.com`, phone: "+919999100001", phoneSecondary: "+919999100002", address: "12 Market Road", registrationStatus: "APPROVED", isApproved: true, referredByCompanyId: referredByCompanyId || null });
  const associate = await createAssociate({ associateCompany: company._id });
  const token = jwt.sign({ id: String(associate._id), email: associate.email, role: "Associate" }, process.env.JWT_SECRET as string);
  return { company, associate, token };
}

describe("canonical standalone trade documents", () => {
  it("creates, issues, invites, accepts, converts, records partial payments and downloads PDF", async () => {
    const seller = await companyUser("Seller");
    const buyer = await companyUser("Buyer", seller.company._id);
    const customer = await api.post(`${base}/customers`).set("Authorization", `Bearer ${seller.token}`).send({ name: buyer.company.name, contactName: "Buyer Contact", email: buyer.company.email, billingAddress: buyer.company.address, linkedCompanyId: buyer.company._id });
    expect(customer.status).toBe(201);
    const quotation = await api.post(base).set("Authorization", `Bearer ${seller.token}`).send({ type: "QUOTATION", customerId: customer.body.data._id, currency: "INR", issueDate: "2026-10-23", validUntil: "2026-11-23", discountAmount: 10, items: [{ description: "Cardamom", quantity: 2, unit: "KG", unitPrice: 100, taxRate: 5 }], terms: "Net 15" });
    expect(quotation.status).toBe(201);
    expect(quotation.body.data.total).toBe(200);
    const id = quotation.body.data._id;
    expect((await api.post(`${base}/${id}/issue`).set("Authorization", `Bearer ${seller.token}`).send({})).status).toBe(200);
    const invitation = await api.post(`${base}/${id}/invite`).set("Authorization", `Bearer ${seller.token}`).send({});
    const inviteToken = String(invitation.body.inviteUrl).split("/").pop();
    const shared = await api.get(`${base}/share/${inviteToken}`);
    expect(shared.status).toBe(200);
    expect(shared.body.data).not.toHaveProperty("customerId");
    expect(shared.body.data).not.toHaveProperty("activityTimeline");
    expect(shared.body.data.buyer).not.toHaveProperty("companyId");
    const sharedPdf = await api.get(`${base}/share/${inviteToken}/pdf`);
    expect(sharedPdf.status).toBe(200);
    const activity = await api.get(`${base}/${id}`).set("Authorization", `Bearer ${seller.token}`);
    expect(activity.body.data.viewCount).toBe(1);
    expect(activity.body.data.downloadCount).toBe(1);
    expect(activity.body.data.activityTimeline.some((event: any) => event.action === "RECIPIENT_VIEWED")).toBe(true);
    expect(activity.body.data.activityTimeline.every((event: any) => !("actorId" in event))).toBe(true);
    const accepted = await api.post(`${base}/share/${inviteToken}/decision`).set("Authorization", `Bearer ${buyer.token}`).send({ decision: "ACCEPTED" });
    expect(accepted.body.data.status).toBe("ACCEPTED");
    const invoice = await api.post(`${base}/${id}/to-invoice`).set("Authorization", `Bearer ${seller.token}`).send({ dueDate: "2026-12-01" });
    expect(invoice.status).toBe(201);
    const duplicate = await api.post(`${base}/${id}/to-invoice`).set("Authorization", `Bearer ${seller.token}`).send({});
    expect(duplicate.body.data._id).toBe(invoice.body.data._id);
    const invoiceId = invoice.body.data._id;
    await api.post(`${base}/${invoiceId}/issue`).set("Authorization", `Bearer ${seller.token}`).send({});
    const payment = await api.post(`${base}/${invoiceId}/payments`).set("Authorization", `Bearer ${seller.token}`).send({ amount: 75, reference: "BANK-75" });
    expect(payment.body.data.paymentStatus).toBe("PARTIALLY_PAID");
    expect(payment.body.data.balanceDue).toBe(125);
    const pdf = await api.get(`${base}/${invoiceId}/pdf`).set("Authorization", `Bearer ${seller.token}`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect((await api.post(`${base}/${invoiceId}/email`).set("Authorization", `Bearer ${seller.token}`).send({})).status).toBe(410);
  });

  it("only exposes direct referrals and supports all Document Studio formats", async () => {
    const owner = await companyUser("Owner");
    const referred = await companyUser("Referred", owner.company._id);
    const unrelated = await companyUser("Unrelated");
    const directory = await api.get(`${base}/recipient-directory`).set("Authorization", `Bearer ${owner.token}`);
    expect(directory.body.data.map((row: any) => String(row.id))).toContain(String(referred.company._id));
    expect(directory.body.data.map((row: any) => String(row.id))).not.toContain(String(unrelated.company._id));
    expect(directory.body.data[0]).not.toHaveProperty("referralCode");
    const blocked = await api.post(`${base}/customers`).set("Authorization", `Bearer ${owner.token}`).send({ name: unrelated.company.name, contactName: "No", email: unrelated.company.email, billingAddress: unrelated.company.address, linkedCompanyId: unrelated.company._id });
    expect(blocked.status).toBe(400);
    const customer = await api.post(`${base}/customers`).set("Authorization", `Bearer ${owner.token}`).send({ name: referred.company.name, contactName: "Recipient", email: referred.company.email, billingAddress: referred.company.address, linkedCompanyId: referred.company._id });
    const common = { customerId: customer.body.data._id, items: [{ description: "Cardamom", quantity: 1, unit: "KG", unitPrice: 10, taxRate: 0 }] };
    for (const type of ["LOI", "QUOTATION", "PROFORMA_INVOICE", "INVOICE", "PURCHASE_ORDER", "SALES_CONTRACT"]) {
      expect((await api.post(base).set("Authorization", `Bearer ${owner.token}`).send({ ...common, type })).status).toBe(201);
    }
    expect((await api.post(base).set("Authorization", `Bearer ${owner.token}`).send({ type: "PACKING_LIST", customerId: common.customerId, documentData: { shipmentReference: "SHIP-1", packages: [{ description: "Spice cartons", packageType: "Carton", packageCount: 2, grossWeight: 22, netWeight: 20 }] } })).status).toBe(201);
    expect((await api.post(base).set("Authorization", `Bearer ${owner.token}`).send({ type: "QUALITY_CERTIFICATE", customerId: common.customerId, documentData: { commodity: "Cardamom", sampleId: "S-1", batchLot: "B-1", tests: [{ parameter: "Moisture", result: "8", unit: "%" }] } })).status).toBe(201);
  });

  it("keeps issued documents immutable and allows seller-recorded external decisions", async () => {
    const seller = await companyUser("Seller");
    const customer = await api.post(`${base}/customers`).set("Authorization", `Bearer ${seller.token}`).send({ name: "External Buyer", contactName: "Buyer", email: "external@example.com", billingAddress: "External Road" });
    const created = await api.post(base).set("Authorization", `Bearer ${seller.token}`).send({ type: "QUOTATION", customerId: customer.body.data._id, items: [{ description: "Pepper", quantity: 1, unit: "KG", unitPrice: 100, taxRate: 0 }] });
    const id = created.body.data._id;
    await api.post(`${base}/${id}/issue`).set("Authorization", `Bearer ${seller.token}`).send({});
    expect((await api.patch(`${base}/${id}`).set("Authorization", `Bearer ${seller.token}`).send({ items: [{ description: "Changed", quantity: 1, unit: "KG", unitPrice: 1 }] })).status).toBe(403);
    const decision = await api.post(`${base}/${id}/decision`).set("Authorization", `Bearer ${seller.token}`).send({ decision: "ACCEPTED", reference: "SIGNED-PDF-1", notes: "Signed copy held externally" });
    expect(decision.body.data.decisionSource).toBe("SELLER_RECORDED");
  });
});
