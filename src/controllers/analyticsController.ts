
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
