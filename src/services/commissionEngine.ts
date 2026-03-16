import mongoose from "mongoose";
import { AssociateCompanyModel } from "../database/models/associateCompany";
import { CommissionModel } from "../database/models/commission";
import { OrderModel } from "../database/models/order";
import { OperatorHierarchyService } from "./operatorHierarchy.service";

type PayoutRow = {
  operatorId: mongoose.Types.ObjectId;
  type: "closer" | "portfolio" | "leadership";
  level: number | null;
  percent: number;
  amount: number;
};

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const isCompletedStatus = (status: unknown) => String(status || "").trim().toUpperCase() === "COMPLETED";

export class CommissionEngine {
  static async processTradeCommission(orderId: string) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      const err: any = new Error("Invalid orderId.");
      err.status = 400;
      throw err;
    }

    const order = await OrderModel.findById(orderId)
      .select("_id status profit closedByOperator associateCompanyId commissionProcessedAt")
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

    const commissionPool = round2(profit * 0.3);
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
      percent: 40,
      amount: round2(commissionPool * 0.4),
    });

    payouts.push({
      operatorId: new mongoose.Types.ObjectId(String(portfolioOwner)),
      type: "portfolio",
      level: null,
      percent: 30,
      amount: round2(commissionPool * 0.3),
    });

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
          percent: 12,
          amount: round2(commissionPool * 0.12),
        });
      }

      if (l2) {
        payouts.push({
          operatorId: new mongoose.Types.ObjectId(String(l2._id)),
          type: "leadership",
          level: 2,
          percent: 8,
          amount: round2(commissionPool * 0.08),
        });
      }

      if (l3Plus.length > 0) {
        const eachPercent = Math.min(10 / l3Plus.length, 5);
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
