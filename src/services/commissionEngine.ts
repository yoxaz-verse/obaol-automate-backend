import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CommissionModel } from "../database/models/commission";
import { CommissionRuleModel } from "../database/models/commissionRule";
import { OrderModel } from "../database/models/order";
import { OperatorHierarchyService } from "./operatorHierarchy.service";

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
    closerPercent: Number(activeRule.closerPercent ?? DEFAULT_RULE.closerPercent),
    portfolioPercent: Number(activeRule.portfolioPercent ?? DEFAULT_RULE.portfolioPercent),
    leadershipL1Percent: Number(activeRule.leadershipL1Percent ?? DEFAULT_RULE.leadershipL1Percent),
    leadershipL2Percent: Number(activeRule.leadershipL2Percent ?? DEFAULT_RULE.leadershipL2Percent),
    leadershipL3PoolPercent: Number(activeRule.leadershipL3PoolPercent ?? DEFAULT_RULE.leadershipL3PoolPercent),
    leadershipL3MaxEachPercent: Number(activeRule.leadershipL3MaxEachPercent ?? DEFAULT_RULE.leadershipL3MaxEachPercent),
  };
};

export class CommissionEngine {
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
