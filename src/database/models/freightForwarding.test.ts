import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import { CustomsCaseModel, FreightFinanceModel, FreightShipmentModel } from "./freightForwarding";

const company = new Types.ObjectId();
const user = new Types.ObjectId();
const shipment = new Types.ObjectId();

describe("freight forwarding models", () => {
  it("accepts a canonical manual multimodal shipment", () => {
    const row = new FreightShipmentModel({
      reference: "FRT-TEST-001", ownerCompany: company, createdBy: user,
      source: "MANUAL_OFFLINE", workflowMode: "LEGACY", modes: ["OCEAN", "ROAD"],
      origin: { name: "Nhava Sheva", type: "PORT", country: "India" },
      destination: { name: "Jebel Ali", type: "PORT", country: "UAE" },
    });
    expect(row.validateSync()).toBeUndefined();
    expect(row.status).toBe("DRAFT");
  });

  it("rejects unsupported transport modes", () => {
    const row = new FreightShipmentModel({ reference: "FRT-TEST-002", ownerCompany: company, createdBy: user, source: "IMPORTED", modes: ["SPACE"] });
    expect(row.validateSync()?.errors["modes.0"]).toBeTruthy();
  });

  it("validates India customs and freight finance enums", () => {
    const customs = new CustomsCaseModel({ shipment, ownerCompany: company, caseType: "IMPORT", declarationType: "BILL_OF_ENTRY" });
    const finance = new FreightFinanceModel({ shipment, ownerCompany: company, kind: "CUSTOMER_INVOICE", number: "INV-001" });
    expect(customs.validateSync()).toBeUndefined();
    expect(finance.validateSync()).toBeUndefined();
  });
});

