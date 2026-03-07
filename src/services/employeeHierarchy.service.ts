import mongoose from "mongoose";
import { EmployeeModel } from "../database/models/employee";

type HierarchyNode = {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  mentorEmployee?: mongoose.Types.ObjectId | null;
  depth?: number;
  level?: number;
};

export class EmployeeHierarchyService {
  static isValidEmployeeId(employeeId: string) {
    return mongoose.Types.ObjectId.isValid(employeeId);
  }

  static async getEmployeeBasic(employeeId: string) {
    if (!this.isValidEmployeeId(employeeId)) return null;
    return EmployeeModel.findById(employeeId)
      .select("_id name email mentorEmployee isDeleted")
      .lean();
  }

  static async getLeadershipChain(employeeId: string): Promise<HierarchyNode[]> {
    if (!this.isValidEmployeeId(employeeId)) return [];
    const rootId = new mongoose.Types.ObjectId(employeeId);

    const rows = await EmployeeModel.aggregate([
      { $match: { _id: rootId } },
      {
        $graphLookup: {
          from: "employees",
          startWith: "$mentorEmployee",
          connectFromField: "mentorEmployee",
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
                mentorEmployee: "$$node.mentorEmployee",
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

  static async getDownline(employeeId: string): Promise<HierarchyNode[]> {
    if (!this.isValidEmployeeId(employeeId)) return [];
    const rootId = new mongoose.Types.ObjectId(employeeId);

    const rows = await EmployeeModel.aggregate([
      { $match: { _id: rootId } },
      {
        $graphLookup: {
          from: "employees",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "mentorEmployee",
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
                mentorEmployee: "$$node.mentorEmployee",
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

  static async getDownlineIds(employeeId: string): Promise<string[]> {
    const nodes = await this.getDownline(employeeId);
    return nodes.map((node) => String(node._id));
  }

  static async isInDownline(managerId: string, candidateEmployeeId: string): Promise<boolean> {
    if (!this.isValidEmployeeId(managerId) || !this.isValidEmployeeId(candidateEmployeeId)) {
      return false;
    }
    const downlineIds = await this.getDownlineIds(managerId);
    return downlineIds.includes(String(candidateEmployeeId));
  }
}

