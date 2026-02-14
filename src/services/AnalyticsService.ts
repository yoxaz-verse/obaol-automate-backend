import { EnquiryModel } from "../database/models/enquiry";
import { VariantRateModel } from "../database/models/variantRate";
import { AssociateModel } from "../database/models/associate";
import mongoose from "mongoose";

export class AnalyticsService {

    /**
     * Get enquiry trends for the last 30 days
     */
    static async getEnquiryTrends() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const trends = await EnquiryModel.aggregate([
            {
                $match: { createdAt: { $gte: thirtyDaysAgo } }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return trends;
    }

    /**
     * Get top performing products based on enquiry volume
     */
    static async getTopProducts(limit = 5) {
        const topProducts = await EnquiryModel.aggregate([
            {
                $group: {
                    _id: "$productVariant",
                    enquiryCount: { $sum: 1 }
                }
            },
            { $sort: { enquiryCount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: "product-variants", // Ensure this collection name matches MongoDB
                    localField: "_id",
                    foreignField: "_id",
                    as: "variantDetails"
                }
            },
            { $unwind: "$variantDetails" },
            {
                $project: {
                    name: "$variantDetails.name", // Adjust field based on ProductVariant schema
                    enquiryCount: 1
                }
            }
        ]);

        return topProducts;
    }

    /**
     * Get overall system health metrics
     */
    static async getSystemMetrics() {
        const [
            totalEnquiries,
            totalLiveRates,
            totalAssociates
        ] = await Promise.all([
            EnquiryModel.countDocuments(),
            VariantRateModel.countDocuments({ isLive: true }),
            AssociateModel.countDocuments()
        ]);

        // Calculate growth (simple day-over-day for now, can be expanded)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const newEnquiriesToday = await EnquiryModel.countDocuments({
            createdAt: { $gte: yesterday }
        });

        return {
            totalEnquiries,
            newEnquiriesToday,
            totalLiveRates,
            totalAssociates
        };
    }
}
