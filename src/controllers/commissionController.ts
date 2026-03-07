import mongoose from "mongoose";
import { Request, Response } from "express";
import { CommissionModel } from "../database/models/commission";
import { EmployeeHierarchyService } from "../services/employeeHierarchy.service";
import { OrderModel } from "../database/models/order";

const round2 = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const completedOrderStatusRegex = /^completed$/i;

const forbidden = (res: Response) =>
    res.status(403).json({ success: false, message: "You are not allowed to access this employee resource." });

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();
const isAdmin = (role: string) => role === "admin";
const isEmployeeActor = (role: string) => role === "employee" || role === "team";

const canAccessEmployeeResource = async (req: Request, targetEmployeeId: string): Promise<boolean> => {
    const actorId = String((req as any)?.user?.id || "");
    const roleLower = normalizeRole((req as any)?.user?.role);

    if (!actorId) return false;
    if (isAdmin(roleLower)) return true;
    if (!isEmployeeActor(roleLower)) return false;
    if (actorId === targetEmployeeId) return true;

    return EmployeeHierarchyService.isInDownline(actorId, targetEmployeeId);
};

export class CommissionController {
    static async getEmployeeHistory(req: Request, res: Response) {
        try {
            const employeeId = String(req.params.employeeId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return res.status(400).json({ success: false, message: "Invalid employeeId." });
            }

            const hasAccess = await canAccessEmployeeResource(req, employeeId);
            if (!hasAccess) return forbidden(res);

            const page = Math.max(1, Number(req.query.page || 1));
            const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
            const skip = (page - 1) * limit;

            const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

            const [rows, totalCount] = await Promise.all([
                CommissionModel.find({ employeeId: employeeObjectId })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .select("dealId type level percent amount createdAt")
                    .lean(),
                CommissionModel.countDocuments({ employeeId: employeeObjectId }),
            ]);

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const endOfMonth = new Date(startOfMonth);
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);

            const [totalAgg, monthlyAgg, dealsClosed, teamSize] = await Promise.all([
                CommissionModel.aggregate([
                    { $match: { employeeId: employeeObjectId } },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
                CommissionModel.aggregate([
                    {
                        $match: {
                            employeeId: employeeObjectId,
                            createdAt: { $gte: startOfMonth, $lt: endOfMonth },
                        },
                    },
                    { $group: { _id: null, total: { $sum: "$amount" } } },
                ]),
                OrderModel.countDocuments({
                    closedByEmployee: employeeObjectId,
                    status: completedOrderStatusRegex,
                }),
                EmployeeHierarchyService.getDownlineIds(employeeId).then((ids) => ids.length),
            ]);

            const totalEarnings = round2(Number(totalAgg?.[0]?.total || 0));
            const monthlyEarnings = round2(Number(monthlyAgg?.[0]?.total || 0));
            const totalPages = Math.max(1, Math.ceil(totalCount / limit));

            return res.json({
                success: true,
                data: {
                    rows: rows.map((row: any) => ({
                        dealId: row.dealId,
                        type: row.type,
                        level: row.level ?? null,
                        percent: Number(row.percent || 0),
                        amount: round2(Number(row.amount || 0)),
                        createdAt: row.createdAt,
                    })),
                    pagination: {
                        page,
                        limit,
                        total: totalCount,
                        totalPages,
                    },
                    summary: {
                        totalEarnings,
                        monthlyEarnings,
                        dealsClosed,
                        teamSize,
                    },
                },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to fetch commission history." });
        }
    }
}

