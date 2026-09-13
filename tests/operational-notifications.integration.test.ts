import mongoose from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { InventoryModel } from "../src/database/models/inventory";
import { InquiryModel } from "../src/database/models/enquiry";
import { NotificationModel } from "../src/database/models/notification";
import { OrderModel } from "../src/database/models/order";
import { ProductModel } from "../src/database/models/product";
import { ProductVariantModel } from "../src/database/models/productVariant";
import { notificationService } from "../src/services/notificationService";
import { operationalNotificationService } from "../src/services/operationalNotificationService";
import { NotificationEntityTypes, NotificationTypes } from "../src/constants/notificationTypes";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { sendOperationalNotificationEmail } from "../src/utils/mailer";

vi.mock("../src/utils/mailer", () => ({
  sendOperationalNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendApprovalNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const api = request(app);

const adminId = new mongoose.Types.ObjectId();
const adminToken = () =>
  generateJWTToken({ _id: adminId, email: "admin@example.com", role: "Admin" } as any, "1h");

const createProductFixture = async () => {
  const product = await ProductModel.create({
    name: `Product ${new mongoose.Types.ObjectId().toHexString()}`,
    description: "Test product",
    subCategory: new mongoose.Types.ObjectId(),
  });
  const variant = await ProductVariantModel.create({
    name: `Variant ${new mongoose.Types.ObjectId().toHexString()}`,
    description: "Test variant",
    product: product._id,
  });
  return { product, variant };
};

const createCompanyFixture = async () => {
  const owner = await createAssociate({ email: `owner.${new mongoose.Types.ObjectId().toHexString()}@example.com` });
  const supervisor = await createAssociate({ email: `supervisor.${new mongoose.Types.ObjectId().toHexString()}@example.com` });
  const operator = await createOperator({ email: `operator.${new mongoose.Types.ObjectId().toHexString()}@example.com` });
  const company = await AssociateCompanyModel.create({
    name: `Company ${new mongoose.Types.ObjectId().toHexString()}`,
    email: `company.${new mongoose.Types.ObjectId().toHexString()}@example.com`,
    phone: "+919999100001",
    phoneSecondary: "+919999100002",
    registrationStatus: "APPROVED",
    isApproved: true,
    supervisor: supervisor._id,
    assignedOperator: operator._id,
  });
  await owner.updateOne({ $set: { associateCompany: company._id, hasCompany: true } });
  return { owner, supervisor, operator, company };
};

describe("Operational notifications", () => {
  beforeEach(() => {
    vi.mocked(sendOperationalNotificationEmail).mockClear();
  });

  it("creates in-app and email notifications when inventory is created", async () => {
    const { product, variant } = await createProductFixture();
    const { owner, supervisor, operator, company } = await createCompanyFixture();

    const res = await api
      .post("/api/v1/web/inventories")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        product: product._id,
        productVariant: variant._id,
        associate: owner._id,
        associateCompany: company._id,
        quantity: 40,
        unit: "MT",
        warehouseName: "Test Warehouse",
      });

    expect(res.status).toBe(201);
    const notifications = await NotificationModel.find({ type: NotificationTypes.INVENTORY_CREATED }).lean();
    const recipients = notifications.map((row: any) => String(row.recipientUserId));
    expect(recipients).toEqual(expect.arrayContaining([String(owner._id), String(supervisor._id), String(operator._id)]));
    expect(sendOperationalNotificationEmail).toHaveBeenCalledTimes(3);
  });

  it("creates inventory reserved notification when a reservation is created", async () => {
    const { product, variant } = await createProductFixture();
    const { owner, company } = await createCompanyFixture();
    const buyer = await createAssociate();
    const inventory = await InventoryModel.create({
      product: product._id,
      productVariant: variant._id,
      associate: owner._id,
      associateCompany: company._id,
      quantity: 20,
      unit: "MT",
    });
    const inquiry = await InquiryModel.create({
      productId: product._id,
      quantity: 5,
      buyerAssociateId: buyer._id,
      sellerAssociateId: owner._id,
      createdBy: buyer._id,
    });

    const res = await api
      .post("/api/v1/web/inventory-reservations")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({
        inventoryId: inventory._id,
        enquiryId: inquiry._id,
        quantity: 5,
      });

    expect(res.status).toBe(201);
    const notification = await NotificationModel.findOne({ type: NotificationTypes.INVENTORY_RESERVED }).lean();
    expect(notification).toMatchObject({
      entityType: NotificationEntityTypes.INVENTORY,
      route: "/dashboard/inventory",
    });
    expect(sendOperationalNotificationEmail).toHaveBeenCalled();
  });

  it("notifies related order users when status changes", async () => {
    const { product } = await createProductFixture();
    const buyer = await createAssociate();
    const seller = await createAssociate();
    const inquiry = await InquiryModel.create({
      productId: product._id,
      quantity: 5,
      buyerAssociateId: buyer._id,
      sellerAssociateId: seller._id,
      createdBy: buyer._id,
    });
    const order = await OrderModel.create({
      enquiry: inquiry._id,
      status: "Procuring",
      workflowStage: "ORDER_CREATED",
    });

    const res = await api
      .patch(`/api/v1/web/orders/${order._id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ status: "Quality Check" });

    expect(res.status).toBe(200);
    const notification = await NotificationModel.findOne({ type: NotificationTypes.ORDER_STATUS_CHANGED }).lean();
    expect(notification).toMatchObject({
      entityType: NotificationEntityTypes.ORDER,
      route: `/dashboard/orders/${order._id}`,
    });
  });

  it("dispatches bid notifications with emails and without the actor recipient", async () => {
    const actor = await createAssociate({ email: "actor@example.com" });
    const other = await createAssociate({ email: "other@example.com" });
    const recipients = new Map<string, "Associate">([
      [String(actor._id), "Associate"],
      [String(other._id), "Associate"],
    ]);

    const result = await operationalNotificationService.dispatch({
      recipientMap: recipients,
      actorId: String(actor._id),
      type: NotificationTypes.BID_SUBMITTED,
      title: "Bid submitted",
      message: "PROCUREMENT bid has been submitted.",
      entityType: NotificationEntityTypes.INQUIRY,
      entityId: new mongoose.Types.ObjectId(),
      route: "/dashboard/execution-enquiries",
      payload: { executionType: "PROCUREMENT" },
      priority: "medium",
      moduleLabel: "Bidding",
    });

    expect(result.notificationCount).toBe(1);
    expect(result.emailCount).toBe(1);
    expect(sendOperationalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: "other@example.com", moduleLabel: "Bidding" })
    );
  });
});
