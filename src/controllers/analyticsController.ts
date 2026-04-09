
import { Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/AnalyticsService";
import { AssociateModel } from "../database/models/associate";

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

export const getOperatorMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = String((req.user as any)?.role || "");
        const roleLower = role.toLowerCase();
        const operatorId = String((req.user as any)?.id || "");
        if (!operatorId || (roleLower !== "operator" && roleLower !== "admin")) {
            return res.status(400).json({ status: 400, message: "User is not an operator" });
        }
        const data = await AnalyticsService.getOperatorMetrics(operatorId);
        res.sendFormatted(data, "Operator metrics retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getCompanyFunctionMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = String((req.user as any)?.role || "");
        const roleLower = role.toLowerCase();
        let companyId = "";

        if (roleLower === "admin") {
            companyId = String(req.query.companyId || "").trim();
            if (!companyId) {
                return res.status(400).json({ status: 400, message: "companyId is required for admin requests." });
            }
        } else if (roleLower === "associate") {
            const associateId = String((req.user as any)?.id || "");
            if (!associateId) {
                return res.status(400).json({ status: 400, message: "Associate not found." });
            }
            const associate = await AssociateModel.findById(associateId).select("associateCompany");
            companyId = String(associate?.associateCompany || "");
            if (!companyId) {
                return res.status(400).json({ status: 400, message: "Associate company is not linked." });
            }
        } else {
            return res.status(403).json({ status: 403, message: "Not authorized to access company function metrics." });
        }

        const data = await AnalyticsService.getCompanyFunctionMetrics(companyId);
        res.sendFormatted(data, "Company function metrics retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getCompanyFunctionComponents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = String((req.user as any)?.role || "");
        const roleLower = role.toLowerCase();
        let companyId = "";

        if (roleLower === "admin") {
            companyId = String(req.query.companyId || "").trim();
            if (!companyId) {
                return res.status(400).json({ status: 400, message: "companyId is required for admin requests." });
            }
        } else if (roleLower === "associate") {
            const associateId = String((req.user as any)?.id || "");
            if (!associateId) {
                return res.status(400).json({ status: 400, message: "Associate not found." });
            }
            const associate = await AssociateModel.findById(associateId).select("associateCompany");
            companyId = String(associate?.associateCompany || "");
            if (!companyId) {
                return res.status(400).json({ status: 400, message: "Associate company is not linked." });
            }
        } else {
            return res.status(403).json({ status: 403, message: "Not authorized to access company function components." });
        }

        const data = await AnalyticsService.getCompanyFunctionComponents(companyId);
        res.sendFormatted(data, "Company function components retrieved successfully");
    } catch (error) {
        next(error);
    }
};

export const getGlobalCompanyFunctionComponents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const role = String((req.user as any)?.role || "");
        const roleLower = role.toLowerCase();
        if (roleLower !== "admin") {
            return res.status(403).json({ status: 403, message: "Not authorized to access global function preview." });
        }
        const data = await AnalyticsService.getGlobalCompanyFunctionComponents();
        res.sendFormatted(data, "Global company function components retrieved successfully");
    } catch (error) {
        next(error);
    }
};
