import mongoose from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { NotificationModel } from "../src/database/models/notification";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { createAssociate, createOperator } from "./helpers/authFixtures";
import { sendApprovalNotificationEmail } from "../src/utils/mailer";

vi.mock("../src/utils/mailer", () => ({
  sendApprovalNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const api = request(app);

const adminId = new mongoose.Types.ObjectId();
const adminToken = () =>
  generateJWTToken(
    {
      _id: adminId,
      email: "admin@example.com",
      role: "Admin",
    } as any,
    "1h"
  );

const approve = (path: string) =>
  api
    .patch(path)
    .set("Authorization", `Bearer ${adminToken()}`)
    .send({ action: "APPROVE", notes: "Approved for tests." });

describe("Approval notifications", () => {
  beforeEach(() => {
    vi.mocked(sendApprovalNotificationEmail).mockClear();
  });

  it("sends approval email and dashboard notification for associate approval", async () => {
    const associate = await createAssociate({
      name: "Pending Associate",
      email: "pending.associate@example.com",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
      isActive: false,
    });

    const res = await approve(`/api/v1/web/approvals/associates/${associate._id}`);

    expect(res.status).toBe(200);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "pending.associate@example.com",
        approvedName: "Pending Associate",
        accountEmail: "pending.associate@example.com",
        roleLabel: "Associate",
        loginPath: "/auth",
      })
    );

    const notification = await NotificationModel.findOne({ recipientUserId: associate._id }).lean();
    expect(notification).toMatchObject({
      recipientRole: "Associate",
      type: "APPROVAL_APPROVED",
      title: "Approval confirmed",
      entityType: "APPROVAL",
      priority: "high",
    });
  });

  it("sends approval email and dashboard notification for operator approval", async () => {
    const operator = await createOperator({
      name: "Pending Operator",
      email: "pending.operator@example.com",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
      isActive: false,
    });

    const res = await approve(`/api/v1/web/approvals/operators/${operator._id}`);

    expect(res.status).toBe(200);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "pending.operator@example.com",
        approvedName: "Pending Operator",
        accountEmail: "pending.operator@example.com",
        roleLabel: "Operator",
        loginPath: "/auth/operator",
      })
    );

    const notification = await NotificationModel.findOne({ recipientUserId: operator._id }).lean();
    expect(notification).toMatchObject({
      recipientRole: "Operator",
      type: "APPROVAL_APPROVED",
      entityType: "APPROVAL",
    });
  });

  it("sends company approval emails to company and supervisor with one supervisor dashboard notification", async () => {
    const supervisor = await createAssociate({
      name: "Supervisor Associate",
      email: "supervisor@example.com",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
    });
    const company = await AssociateCompanyModel.create({
      name: "Pending Company",
      email: "company@example.com",
      phone: "+919999000003",
      phoneSecondary: "+919999000004",
      registrationStatus: "PENDING_REVIEW",
      isApproved: false,
      supervisor: supervisor._id,
    });

    const res = await approve(`/api/v1/web/approvals/companies/${company._id}`);

    expect(res.status).toBe(200);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledTimes(2);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "company@example.com",
        approvedName: "Pending Company",
        accountEmail: "company@example.com",
        roleLabel: "Associate Company",
        loginPath: "/auth",
      })
    );
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: "supervisor@example.com",
        approvedName: "Pending Company",
        accountEmail: "company@example.com",
        roleLabel: "Associate Company",
        loginPath: "/auth",
      })
    );

    const notifications = await NotificationModel.find({ recipientUserId: supervisor._id }).lean();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      recipientRole: "Associate",
      type: "APPROVAL_APPROVED",
      entityType: "APPROVAL",
    });
  });

  it("dedupes company approval emails when company and supervisor emails match", async () => {
    const supervisor = await createAssociate({
      email: "same@example.com",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
    });
    const company = await AssociateCompanyModel.create({
      name: "Same Email Company",
      email: "same@example.com",
      phone: "+919999000005",
      phoneSecondary: "+919999000006",
      registrationStatus: "PENDING_REVIEW",
      isApproved: false,
      supervisor: supervisor._id,
    });

    const res = await approve(`/api/v1/web/approvals/companies/${company._id}`);

    expect(res.status).toBe(200);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledTimes(1);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: "same@example.com" })
    );
  });

  it("sends approval emails for bulk-approved associates and companies", async () => {
    const associate = await createAssociate({
      name: "Bulk Associate",
      email: "bulk.associate@example.com",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
    });
    const supervisor = await createAssociate({
      name: "Bulk Supervisor",
      email: "bulk.supervisor@example.com",
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
    });
    await AssociateCompanyModel.create({
      name: "Bulk Company",
      email: "bulk.company@example.com",
      phone: "+919999000007",
      phoneSecondary: "+919999000008",
      registrationStatus: "PENDING_REVIEW",
      isApproved: false,
      supervisor: supervisor._id,
    });

    const res = await api
      .post("/api/v1/web/approvals/bulk-approve-existing")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ notes: "Bulk approved." });

    expect(res.status).toBe(200);
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: "bulk.associate@example.com", roleLabel: "Associate" })
    );
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: "bulk.company@example.com", roleLabel: "Associate Company" })
    );
    expect(sendApprovalNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ toEmail: "bulk.supervisor@example.com", roleLabel: "Associate Company" })
    );

    const associateNotification = await NotificationModel.findOne({ recipientUserId: associate._id }).lean();
    const supervisorNotification = await NotificationModel.findOne({ recipientUserId: supervisor._id }).lean();
    expect(associateNotification?.type).toBe("APPROVAL_APPROVED");
    expect(supervisorNotification?.type).toBe("APPROVAL_APPROVED");
  });

  it("does not send approval emails for reject actions", async () => {
    const associate = await createAssociate({
      registrationStatus: "PENDING_REVIEW",
      onboardingComplete: true,
    });

    const res = await api
      .patch(`/api/v1/web/approvals/associates/${associate._id}`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ action: "REJECT", notes: "Rejected for tests." });

    expect(res.status).toBe(200);
    expect(sendApprovalNotificationEmail).not.toHaveBeenCalled();
  });
});
