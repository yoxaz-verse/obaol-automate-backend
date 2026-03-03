
import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/AnalyticsService";

export const getEnquiryTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await AnalyticsService.getEnquiryTrends();
        res.sendFormatted(data, "Enquiry trends retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 5;
        const data = await AnalyticsService.getTopProducts(limit);
        res.sendFormatted(data, "Top products retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getSystemMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await AnalyticsService.getSystemMetrics();
        res.sendFormatted(data, "System metrics retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getAssociateMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const associateId = (req.user as any)?.id;
        if (!associateId) {
            return res.status(400).json({ status: 400, message: "User is not an associate" });
        }
        const data = await AnalyticsService.getAssociateMetrics(associateId);
        res.sendFormatted(data, "Associate metrics retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getEmployeeMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = String((req.user as any)?.role || "");
        const employeeId = String((req.user as any)?.id || "");
        if (!employeeId || (role !== "Employee" && role !== "Admin")) {
            return res.status(400).json({ status: 400, message: "User is not an employee" });
        }
        const data = await AnalyticsService.getEmployeeMetrics(employeeId);
        res.sendFormatted(data, "Employee metrics retrieved successfully");
    } catch (error) {
        next(error);
    }
};
