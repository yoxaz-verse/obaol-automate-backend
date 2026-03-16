import mongoose from "mongoose";
import { OperatorModel } from "../database/models/operator";

type HierarchyNode = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  mentorOperator?: mongoose.Types.ObjectId | null;
  depth?: number;
  level?: number;
};

export class OperatorHierarchyService {
  static isValidOperatorId(operatorId: string) {
    return mongoose.Types.ObjectId.isValid(operatorId);
  }

  static async getOperatorBasic(operatorId: string) {
    if (!this.isValidOperatorId(operatorId)) return null;
    return OperatorModel.findById(operatorId)
      .select("_id name email mentorOperator isDeleted")
      .lean();
  }

  static async getLeadershipChain(operatorId: string): Promise<HierarchyNode[]> {
    if (!this.isValidOperatorId(operatorId)) return [];
    const rootId = new mongoose.Types.ObjectId(operatorId);

    const rows = await OperatorModel.aggregate([
      { $match: { _id: rootId } },
      {
        $graphLookup: {
          from: "operators",
          startWith: "$mentorOperator",
          connectFromField: "mentorOperator",
          connectToField: "_id",
          as: "leadershipChain",
          depthField: "depth",
          restrictSearchWithMatch: { isDeleted: { $ne: true } },
        },
      },
      {
        $project: {
          leadershipChain: {
            $map: {
              input: "$leadershipChain",
              as: "node",
              in: {
                _id: "$$node._id",
                name: "$$node.name",
                email: "$$node.email",
                mentorOperator: "$$node.mentorOperator",
                depth: "$$node.depth",
              },
            },
          },
        },
      },
    ]);

    const raw = Array.isArray(rows) && rows.length ? rows[0].leadershipChain || [] : [];
    return raw
      .sort((a: HierarchyNode, b: HierarchyNode) => Number(a.depth || 0) - Number(b.depth || 0))
      .map((node: HierarchyNode) => ({
        ...node,
        level: Number(node.depth || 0) + 1,
      }));
  }

  static async getDownline(operatorId: string): Promise<HierarchyNode[]> {
    if (!this.isValidOperatorId(operatorId)) return [];
    const rootId = new mongoose.Types.ObjectId(operatorId);

    const rows = await OperatorModel.aggregate([
      { $match: { _id: rootId } },
      {
        $graphLookup: {
          from: "operators",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "mentorOperator",
          as: "downline",
          depthField: "depth",
          restrictSearchWithMatch: { isDeleted: { $ne: true } },
        },
      },
      {
        $project: {
          downline: {
            $map: {
              input: "$downline",
              as: "node",
              in: {
                _id: "$$node._id",
                name: "$$node.name",
                email: "$$node.email",
                mentorOperator: "$$node.mentorOperator",
                depth: "$$node.depth",
              },
            },
          },
        },
      },
    ]);

    const raw = Array.isArray(rows) && rows.length ? rows[0].downline || [] : [];
    return raw
      .sort((a: HierarchyNode, b: HierarchyNode) => Number(a.depth || 0) - Number(b.depth || 0))
      .map((node: HierarchyNode) => ({
        ...node,
        level: Number(node.depth || 0) + 1,
      }));
  }

  static async getDownlineIds(operatorId: string): Promise<string[]> {
    const nodes = await this.getDownline(operatorId);
    return nodes.map((node) => String(node._id));
  }

  static async isInDownline(managerId: string, candidateOperatorId: string): Promise<boolean> {
    if (!this.isValidOperatorId(managerId) || !this.isValidOperatorId(candidateOperatorId)) {
      return false;
    }
    const downlineIds = await this.getDownlineIds(managerId);
    return downlineIds.includes(String(candidateOperatorId));
  }
}
