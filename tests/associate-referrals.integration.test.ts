import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import { AssociateCompanyModel } from "../src/database/models/associateCompany";
import { AssociateReferralEarningModel } from "../src/database/models/associateReferralEarning";
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
