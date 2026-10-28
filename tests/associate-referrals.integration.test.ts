import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { AssociateReferralEarningModel } from "../src/database/models/associateReferralEarning";
import { AssociateReferralInvitationModel } from "../src/database/models/associateReferralInvitation";
import { CommissionRuleModel } from "../src/database/models/commissionRule";
import { OrderModel } from "../src/database/models/order";
import { AssociateReferralService } from "../src/services/associateReferral.service";
import { CommissionEngine } from "../src/services/commissionEngine";

const createCompany = (overrides: Record<string, any> = {}) => AssociateCompanyModel.create({
  name: `Company ${new mongoose.Types.ObjectId().toHexString()}`,
  email: `${new mongoose.Types.ObjectId().toHexString()}@example.com`,
  phone: "+919999100001",
  phoneSecondary: "+919999100002",
  registrationStatus: "APPROVED",
  isApproved: true,
  ...overrides,
});

describe("one-level associate referrals", () => {
  it("normalizes invitation destinations and rejects malformed values", () => {
    expect(AssociateReferralService.normalizeInvitationDestination("EMAIL", " Person@Example.COM ")).toBe("person@example.com");
    expect(AssociateReferralService.normalizeInvitationDestination("WHATSAPP", "+91 98765-43210")).toBe("+919876543210");
    expect(() => AssociateReferralService.normalizeInvitationDestination("EMAIL", "not-an-email")).toThrow("valid email");
    expect(() => AssociateReferralService.normalizeInvitationDestination("WHATSAPP", "9876543210")).toThrow("international country code");
  });

  it("creates idempotent personalized invitations and allows exactly one matching company claim", async () => {
    const referrer = await createCompany({ referralCode: "INVITE10" });
    const first = await AssociateReferralService.createInvitation({
      referrerCompanyId: String(referrer._id), recipientName: "Acme Foods", channel: "EMAIL",
      destination: "hello@acme.test", idempotencyKey: "request-1",
    });
    const retry = await AssociateReferralService.createInvitation({
      referrerCompanyId: String(referrer._id), recipientName: "Acme Foods", channel: "EMAIL",
      destination: "hello@acme.test", idempotencyKey: "request-1",
    });
    expect(String(first.invitation._id)).toBe(String(retry.invitation._id));
    expect(first.token).toBe(retry.token);
    expect(await AssociateReferralInvitationModel.countDocuments()).toBe(1);
    const publicRow: any = await AssociateReferralInvitationModel.findById(first.invitation._id).lean();
    expect(publicRow.tokenHash).toBeUndefined();

    const joined = await createCompany({ referredByCompanyId: referrer._id, referralCodeUsed: "INVITE10" });
    await AssociateReferralService.claimInvitation(first.token, referrer._id, joined._id);
    const saved: any = await AssociateReferralInvitationModel.findById(first.invitation._id).lean();
    expect(String(saved.joinedCompanyId)).toBe(String(joined._id));
    await expect(AssociateReferralService.claimInvitation(first.token, referrer._id, new mongoose.Types.ObjectId())).rejects.toThrow("already been used");
  });

  it("rejects an invitation token used with another company's referral code", async () => {
    const owner = await createCompany();
    const other = await createCompany();
    const { token } = await AssociateReferralService.createInvitation({
      referrerCompanyId: String(owner._id), recipientName: "Mismatch", channel: "LINK", idempotencyKey: "request-2",
    });
    await expect(AssociateReferralService.validateInvitation(token, other._id)).rejects.toThrow("does not match");
  });

  it("resolves company codes and activates only once after an approved qualifying activity", async () => {
    const referrer = await createCompany({ referralCode: "REFER123" });
    const referred = await createCompany({ referredByCompanyId: referrer._id, referralCodeUsed: "REFER123" });
    const resolved = await AssociateReferralService.resolveCode("refer123");
    expect(resolved.type).toBe("associate_company");

    const first = await AssociateReferralService.activateCompany(referred._id, "LIVE_SUPPLY", new mongoose.Types.ObjectId());
    const second = await AssociateReferralService.activateCompany(referred._id, "INQUIRY_CREATED", new mongoose.Types.ObjectId());
    expect(first).toBe(true);
    expect(second).toBe(false);
    const saved: any = await AssociateCompanyModel.findById(referred._id).lean();
    expect(saved.referralActivationEvent.type).toBe("LIVE_SUPPLY");
  });

  it("splits one 10% pool between unique referrers and remains idempotent", async () => {
    await CommissionRuleModel.create({
      name: "Default", isDefault: true, associateReferralPercent: 10,
      poolPercent: 30, procurementPercent: 10, handlerPercent: 10,
      closerPercent: 40, portfolioPercent: 30, leadershipL1Percent: 12,
      leadershipL2Percent: 8, leadershipL3PoolPercent: 10, leadershipL3MaxEachPercent: 5,
    });
    const referrerA = await createCompany();
    const referrerB = await createCompany();
    const referredA = await createCompany({ referredByCompanyId: referrerA._id, referralActivatedAt: new Date() });
    const referredB = await createCompany({ referredByCompanyId: referrerB._id, referralActivatedAt: new Date() });
    const order = await OrderModel.create({
      status: "COMPLETED", profit: 1000,
      participantCompanyIds: [referredA._id, referredB._id],
    });

    await CommissionEngine.processAssociateReferralCommission(String(order._id));
    await CommissionEngine.processAssociateReferralCommission(String(order._id));
    const rows: any[] = await AssociateReferralEarningModel.find({ orderId: order._id }).sort({ referrerCompanyId: 1 }).lean();
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.amount)).toEqual([50, 50]);
    expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(100);
  });

  it("credits one referrer once when several participants share it", async () => {
    const referrer = await createCompany();
    const referredA = await createCompany({ referredByCompanyId: referrer._id, referralActivatedAt: new Date() });
    const referredB = await createCompany({ referredByCompanyId: referrer._id, referralActivatedAt: new Date() });
    const order = await OrderModel.create({ status: "COMPLETED", profit: 999.99, participantCompanyIds: [referredA._id, referredB._id] });
    await CommissionEngine.processAssociateReferralCommission(String(order._id));
    const rows: any[] = await AssociateReferralEarningModel.find({ orderId: order._id }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(100);
    expect(rows[0].referredCompanyIds).toHaveLength(2);
  });

  it("does not pay inactive referrals and seals the order against retroactive rewards", async () => {
    const referrer = await createCompany();
    const referred = await createCompany({ referredByCompanyId: referrer._id, referralActivatedAt: null });
    const order = await OrderModel.create({ status: "COMPLETED", profit: 1000, participantCompanyIds: [referred._id] });
    await CommissionEngine.processAssociateReferralCommission(String(order._id));
    await AssociateCompanyModel.updateOne({ _id: referred._id }, { $set: { referralActivatedAt: new Date() } });
    await CommissionEngine.processAssociateReferralCommission(String(order._id));
    expect(await AssociateReferralEarningModel.countDocuments({ orderId: order._id })).toBe(0);
  });
});
