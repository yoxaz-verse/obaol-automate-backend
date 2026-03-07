import mongoose from "mongoose";
import { Request, Response } from "express";
import { EmployeeModel } from "../database/models/employee";
import { CommissionModel } from "../database/models/commission";
import { EmployeeHierarchyService } from "../services/employeeHierarchy.service";

const forbidden = (res: Response) =>
    res.status(403).json({ success: false, message: "You are not allowed to access this employee resource." });

const isAdmin = (role: string) => role === "admin";
const isEmployeeActor = (role: string) => role === "employee" || role === "team";

const normalizeRole = (value: unknown) => String(value || "").trim().toLowerCase();

const canAccessEmployeeResource = async (req: Request, targetEmployeeId: string): Promise<boolean> => {
    const actorId = String((req as any)?.user?.id || "");
    const roleLower = normalizeRole((req as any)?.user?.role);

    if (!actorId) return false;
    if (isAdmin(roleLower)) return true;
    if (!isEmployeeActor(roleLower)) return false;
    if (actorId === targetEmployeeId) return true;

    return EmployeeHierarchyService.isInDownline(actorId, targetEmployeeId);
};

export class EmployeeHierarchyController {
    static async getLeadershipChain(req: Request, res: Response) {
        try {
            const employeeId = String(req.params.employeeId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return res.status(400).json({ success: false, message: "Invalid employeeId." });
            }

            const hasAccess = await canAccessEmployeeResource(req, employeeId);
            if (!hasAccess) return forbidden(res);

            const employee = await EmployeeModel.findOne({ _id: employeeId, isDeleted: { $ne: true } })
                .select("_id name email mentorEmployee")
                .populate("mentorEmployee", "name email")
                .lean();
            if (!employee) {
                return res.status(404).json({ success: false, message: "Employee not found." });
            }

            const leadershipChain = await EmployeeHierarchyService.getLeadershipChain(employeeId);
            const mentor: any = (employee as any).mentorEmployee;

            return res.json({
                success: true,
                data: {
                    employee: {
                        employeeId: String((employee as any)._id),
                        name: (employee as any).name,
                        email: (employee as any).email,
                    },
                    mentor: mentor
                        ? {
                            employeeId: String(mentor._id),
                            name: mentor.name,
                            email: mentor.email,
                        }
                        : null,
                    leadershipChain: leadershipChain.map((row: any) => ({
                        employeeId: String(row._id),
                        name: row.name,
                        level: Number(row.level || 0),
                    })),
                    depthCount: leadershipChain.length,
                },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to fetch leadership chain." });
        }
    }

    static async getTeam(req: Request, res: Response) {
        try {
            const employeeId = String(req.params.employeeId || "").trim();
            if (!mongoose.Types.ObjectId.isValid(employeeId)) {
                return res.status(400).json({ success: false, message: "Invalid employeeId." });
            }

            const hasAccess = await canAccessEmployeeResource(req, employeeId);
            if (!hasAccess) return forbidden(res);

            const manager = await EmployeeModel.findOne({ _id: employeeId, isDeleted: { $ne: true } })
                .select("_id name email mentorEmployee")
                .populate("mentorEmployee", "name email")
                .lean();
            if (!manager) {
                return res.status(404).json({ success: false, message: "Employee not found." });
            }

            const managerObjectId = new mongoose.Types.ObjectId(employeeId);
            const directReports = await EmployeeModel.find({
                mentorEmployee: managerObjectId,
                isDeleted: { $ne: true },
            })
                .select("_id name email mentorEmployee")
                .populate("mentorEmployee", "name email")
                .lean();

            const directReportIds = directReports.map((row: any) => row._id).filter(Boolean);

            let teamSizeByEmployee = new Map<string, number>();
            if (directReportIds.length) {
                const graphRows = await EmployeeModel.aggregate([
                    { $match: { _id: { $in: directReportIds } } },
                    {
                        $graphLookup: {
                            from: "employees",
                            startWith: "$_id",
                            connectFromField: "_id",
                            connectToField: "mentorEmployee",
                            as: "downline",
                            restrictSearchWithMatch: { isDeleted: { $ne: true } },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            teamSize: { $size: "$downline" },
                        },
                    },
                ]);

                teamSizeByEmployee = new Map<string, number>(
                    graphRows.map((row: any) => [String(row._id), Number(row.teamSize || 0)])
                );
            }

            let commissionByEmployee = new Map<string, number>();
            if (directReportIds.length) {
                const commissionRows = await CommissionModel.aggregate([
                    { $match: { employeeId: { $in: directReportIds } } },
                    {
                        $group: {
                            _id: "$employeeId",
                            totalCommission: { $sum: "$amount" },
                        },
                    },
                ]);
                commissionByEmployee = new Map<string, number>(
                    commissionRows.map((row: any) => [String(row._id), Number(row.totalCommission || 0)])
                );
            }

            return res.json({
                success: true,
                data: {
                    manager: {
                        employeeId: String((manager as any)._id),
                        name: (manager as any).name,
                    },
                    directTeam: directReports.map((row: any) => {
                        const mentor = row.mentorEmployee as any;
                        return {
                            employeeId: String(row._id),
                            name: row.name,
                            mentorEmployee: mentor
                                ? {
                                    employeeId: String(mentor._id),
                                    name: mentor.name,
                                }
                                : null,
                            teamSize: Number(teamSizeByEmployee.get(String(row._id)) || 0),
                            totalCommission: Math.round((Number(commissionByEmployee.get(String(row._id)) || 0) + Number.EPSILON) * 100) / 100,
                        };
                    }),
                },
            });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error?.message || "Failed to fetch team hierarchy." });
        }
    }
}

