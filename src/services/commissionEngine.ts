import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CommissionModel } from "../database/models/commission";
import { CommissionRuleModel } from "../database/models/commissionRule";
import { OrderModel } from "../database/models/order";
import { InquiryModel } from "../database/models/enquiry";
import { AssociateReferralEarningModel } from "../database/models/associateReferralEarning";
import { AssociateReferralService, indiaMonthWindow } from "./associateReferral.service";
import { OperatorHierarchyService } from "./operatorHierarchy.service";
import { AssociateReferralActivityModel } from "../database/models/associateReferralActivity";

type PayoutRow = {
  operatorId: mongoose.Types.ObjectId;
  type: "closer" | "portfolio" | "leadership" | "procurement" | "handler";
  level: number | null;
  percent: number;
  amount: number;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const isCompletedStatus = (status: unknown) => String(status || "").trim().toUpperCase() === "COMPLETED";

const DEFAULT_RULE = {
  poolPercent: 30,
  procurementPercent: 10,
  handlerPercent: 10,
  associateReferralPercent: 10,
  closerPercent: 40,
  portfolioPercent: 30,
  leadershipL1Percent: 12,
  leadershipL2Percent: 8,
  leadershipL3PoolPercent: 10,
  leadershipL3MaxEachPercent: 5,
};

const resolveCommissionRule = async () => {
  const defaultRule = await CommissionRuleModel.findOne({ isDefault: true, isActive: { $ne: false } }).lean();
  const activeRule =
    defaultRule ||
    (await CommissionRuleModel.findOne({ isActive: { $ne: false } }).sort({ updatedAt: -1, createdAt: -1 }).lean());
  if (!activeRule) return DEFAULT_RULE;
  return {
    poolPercent: Number(activeRule.poolPercent ?? DEFAULT_RULE.poolPercent),
    procurementPercent: Number(activeRule.procurementPercent ?? DEFAULT_RULE.procurementPercent),
    handlerPercent: Number(activeRule.handlerPercent ?? DEFAULT_RULE.handlerPercent),
    associateReferralPercent: Number((activeRule as any).associateReferralPercent ?? DEFAULT_RULE.associateReferralPercent),
    closerPercent: Number(activeRule.closerPercent ?? DEFAULT_RULE.closerPercent),
    portfolioPercent: Number(activeRule.portfolioPercent ?? DEFAULT_RULE.portfolioPercent),
    leadershipL1Percent: Number(activeRule.leadershipL1Percent ?? DEFAULT_RULE.leadershipL1Percent),
    leadershipL2Percent: Number(activeRule.leadershipL2Percent ?? DEFAULT_RULE.leadershipL2Percent),
    leadershipL3PoolPercent: Number(activeRule.leadershipL3PoolPercent ?? DEFAULT_RULE.leadershipL3PoolPercent),
    leadershipL3MaxEachPercent: Number(activeRule.leadershipL3MaxEachPercent ?? DEFAULT_RULE.leadershipL3MaxEachPercent),
  };
};

export class CommissionEngine {
  static async processAssociateReferralCommission(orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) throw Object.assign(new Error("Invalid orderId."), { status: 400 });
    const order: any = await OrderModel.findById(orderId)
      .select("_id enquiry status profit participantCompanyIds associateReferralProcessedAt updatedAt")
      .lean();
    if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
    if (!isCompletedStatus(order.status)) return { success: true, skipped: true, reason: "ORDER_NOT_COMPLETED" };
    if (order.associateReferralProcessedAt) return { success: true, skipped: true, reason: "ALREADY_PROCESSED" };
    const profit = Number(order.profit);
    if (!Number.isFinite(profit)) throw Object.assign(new Error("Completed order requires numeric profit."), { status: 400 });

    let participantCompanyIds = Array.isArray(order.participantCompanyIds) ? order.participantCompanyIds : [];
    if (!participantCompanyIds.length && order.enquiry) {
      const inquiry = await InquiryModel.findById(order.enquiry)
        .select("buyerAssociateId sellerAssociateId mediatorAssociateId")
        .lean();
      participantCompanyIds = await AssociateReferralService.getParticipantCompanyIds(inquiry);
      if (participantCompanyIds.length) {
        await OrderModel.updateOne({ _id: order._id }, { $set: { participantCompanyIds } });
      }
    }

    const completedAt = order.updatedAt || new Date();
    await Promise.all(participantCompanyIds.map((companyId: mongoose.Types.ObjectId) =>
      AssociateReferralService.recordCompanyActivity(companyId, "ORDER_COMPLETED", order._id, completedAt)
    ));
    const monthWindow = indiaMonthWindow(completedAt);
    const activeCompanyIds = participantCompanyIds.length
      ? await AssociateReferralActivityModel.distinct("companyId", {
          companyId: { $in: participantCompanyIds },
          occurredAt: { $gte: monthWindow.start, $lte: completedAt },
        })
      : [];

    const companies: any[] = activeCompanyIds.length
      ? await AssociateCompanyModel.find({
          _id: { $in: activeCompanyIds },
          referredByCompanyId: { $ne: null },
        }).select("_id referredByCompanyId").lean()
      : [];

    const grouped = new Map<string, string[]>();
    for (const company of companies) {
      const referrerId = String(company.referredByCompanyId || "");
      if (!referrerId) continue;
      const ids = grouped.get(referrerId) || [];
      ids.push(String(company._id));
      grouped.set(referrerId, ids);
    }

    const rule = await resolveCommissionRule();
    const poolPercent = Number(rule.associateReferralPercent || 0);
    const poolCents = Math.max(0, Math.round(profit * (poolPercent / 100) * 100));
    const recipients = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (poolCents > 0 && recipients.length > 0) {
      const baseCents = Math.floor(poolCents / recipients.length);
      let remainder = poolCents - baseCents * recipients.length;
      await AssociateReferralEarningModel.bulkWrite(recipients.map(([referrerCompanyId, referredCompanyIds]) => {
        const amountCents = baseCents + (remainder-- > 0 ? 1 : 0);
        return {
          updateOne: {
            filter: { orderId: order._id, referrerCompanyId: new mongoose.Types.ObjectId(referrerCompanyId) },
            update: { $setOnInsert: {
              orderId: order._id,
              referrerCompanyId: new mongoose.Types.ObjectId(referrerCompanyId),
              referredCompanyIds: referredCompanyIds.map((id) => new mongoose.Types.ObjectId(id)),
              profitBasis: round2(profit), poolPercent, poolAmount: poolCents / 100,
              recipientCount: recipients.length, amount: amountCents / 100, status: "EARNED" as const,
            } },
            upsert: true,
          },
        };
      }), { ordered: false });
    }

    await OrderModel.updateOne(
      { _id: order._id, associateReferralProcessedAt: null },
      { $set: { associateReferralProcessedAt: new Date() } }
    );
    return { success: true, skipped: false, poolAmount: poolCents / 100, recipientCount: recipients.length };
  }

  static async processTradeCommission(orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const err: any = new Error("Invalid orderId.");
      err.status = 400;
      throw err;
    }

    const order = await OrderModel.findById(orderId)
      .select("_id status profit closedByOperator associateCompanyId commissionProcessedAt procurementOperatorId handlerOperatorId handlerBuyerRating handlerSellerRating")
      .lean();

    if (!order) {
      const err: any = new Error("Order not found.");
      err.status = 404;
      throw err;
    }

    if (!isCompletedStatus((order as any).status)) {
      return { success: true, skipped: true, reason: "ORDER_NOT_COMPLETED" };
    }

    if ((order as any).commissionProcessedAt) {
      return { success: true, skipped: true, reason: "ALREADY_PROCESSED" };
    }

    const profit = Number((order as any).profit);
    const closedByOperator = (order as any).closedByOperator;
    const associateCompanyId = (order as any).associateCompanyId;
    const procurementOperatorId = (order as any).procurementOperatorId;
    const handlerOperatorId = (order as any).handlerOperatorId;
    const handlerBuyerRating = Number((order as any).handlerBuyerRating || 0);
    const handlerSellerRating = Number((order as any).handlerSellerRating || 0);

    if (!Number.isFinite(profit)) {
      const err: any = new Error("Completed order requires numeric profit.");
      err.status = 400;
      throw err;
    }
    if (!closedByOperator) {
      const err: any = new Error("Completed order requires closedByOperator.");
      err.status = 400;
      throw err;
    }
    if (!associateCompanyId) {
      const err: any = new Error("Completed order requires associateCompanyId.");
      err.status = 400;
      throw err;
    }

    const supplierCompany = await AssociateCompanyModel.findById(associateCompanyId)
      .select("_id assignedOperator")
      .lean();
    const portfolioOwner = (supplierCompany as any)?.assignedOperator;

    if (!portfolioOwner) {
      const err: any = new Error("Supplier company has no assigned operator.");
      err.status = 400;
      throw err;
    }

    const rule = await resolveCommissionRule();
    const commissionPool = round2(profit * (rule.poolPercent / 100));
    if (commissionPool <= 0) {
      await OrderModel.updateOne(
        { _id: orderId, commissionProcessedAt: null },
        { $set: { commissionProcessedAt: new Date() } }
      );
      return { success: true, skipped: true, reason: "ZERO_POOL" };
    }

    const payouts: PayoutRow[] = [];

    payouts.push({
      operatorId: new mongoose.Types.ObjectId(String(closedByOperator)),
      type: "closer",
      level: null,
      percent: rule.closerPercent,
      amount: round2(commissionPool * (rule.closerPercent / 100)),
    });

    payouts.push({
      operatorId: new mongoose.Types.ObjectId(String(portfolioOwner)),
      type: "portfolio",
      level: null,
      percent: rule.portfolioPercent,
      amount: round2(commissionPool * (rule.portfolioPercent / 100)),
    });

    if (procurementOperatorId && Number(rule.procurementPercent) > 0) {
      payouts.push({
        operatorId: new mongoose.Types.ObjectId(String(procurementOperatorId)),
        type: "procurement",
        level: null,
        percent: Number(rule.procurementPercent),
        amount: round2(profit * (Number(rule.procurementPercent) / 100)),
      });
    }

    if (handlerOperatorId && Number(rule.handlerPercent) > 0) {
      const handlerScore = Math.max(0, handlerBuyerRating + handlerSellerRating);
      const handlerEffectivePercent = Math.min(Number(rule.handlerPercent), handlerScore);
      if (handlerEffectivePercent > 0) {
        payouts.push({
          operatorId: new mongoose.Types.ObjectId(String(handlerOperatorId)),
          type: "handler",
          level: null,
          percent: round2(handlerEffectivePercent),
          amount: round2(profit * (handlerEffectivePercent / 100)),
        });
      }
    }

    const leadershipChain = await OperatorHierarchyService.getLeadershipChain(String(portfolioOwner));
    if (leadershipChain.length > 0) {
      const l1 = leadershipChain.find((node) => Number(node.level) === 1);
      const l2 = leadershipChain.find((node) => Number(node.level) === 2);
      const l3Plus = leadershipChain.filter((node) => Number(node.level) >= 3);

      if (l1) {
        payouts.push({
          operatorId: new mongoose.Types.ObjectId(String(l1._id)),
          type: "leadership",
          level: 1,
          percent: rule.leadershipL1Percent,
          amount: round2(commissionPool * (rule.leadershipL1Percent / 100)),
        });
      }

      if (l2) {
        payouts.push({
          operatorId: new mongoose.Types.ObjectId(String(l2._id)),
          type: "leadership",
          level: 2,
          percent: rule.leadershipL2Percent,
          amount: round2(commissionPool * (rule.leadershipL2Percent / 100)),
        });
      }

      if (l3Plus.length > 0) {
        const eachPercent = Math.min(rule.leadershipL3PoolPercent / l3Plus.length, rule.leadershipL3MaxEachPercent);
        for (const node of l3Plus) {
          payouts.push({
            operatorId: new mongoose.Types.ObjectId(String(node._id)),
            type: "leadership",
            level: Number(node.level || null),
            percent: round2(eachPercent),
            amount: round2(commissionPool * (eachPercent / 100)),
          });
        }
      }
    }

    const normalizedRows = payouts.filter((row) => row.amount > 0);
    if (normalizedRows.length > 0) {
      await CommissionModel.bulkWrite(
        normalizedRows.map((row) => ({
          updateOne: {
            filter: {
              dealId: new mongoose.Types.ObjectId(orderId),
              operatorId: row.operatorId,
              type: row.type,
              level: row.level,
            },
            update: {
              $setOnInsert: {
                dealId: new mongoose.Types.ObjectId(orderId),
                operatorId: row.operatorId,
                type: row.type,
                level: row.level,
                percent: row.percent,
                amount: row.amount,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    }

    await OrderModel.updateOne(
      { _id: orderId, commissionProcessedAt: null },
      { $set: { commissionProcessedAt: new Date() } }
    );

    return {
      success: true,
      skipped: false,
      commissionPool,
      payouts: normalizedRows,
    };
  }
}
