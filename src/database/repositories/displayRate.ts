import { Request } from "express";
// Ensure correct path
import { logError } from "../../utils/errorLogger";
import { IPagination } from "@interfaces/pagination";
import { DisplayedRateModel } from "../models/displayedRate";
import {
  ICreateDisplayedRate,
  IDisplayedRate,
  IUpdateDisplayedRate,
} from "../../interfaces/displayedRate";
import { IVariantRate } from "../../interfaces/variantRate";
import { VariantRateModel } from "../../database/models/variantRate";
import { Types } from "mongoose";
import { AssociateCompanyModel } from "../../database/models/associateCompany";
import { AssociateModel } from "../../database/models/associate";

class DisplayedRateRepository {
  public async getDisplayedRates(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IDisplayedRate[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let matchingAssociateIds: Types.ObjectId[] = [];

      // -----------------------------------------
      // 1) Check if we have associateCompanyName
      // -----------------------------------------
      if (query.associateCompanyName) {
        const userRaw = query.associateCompanyName as string;
        const userNormalized = normalizeCompanyName(userRaw);

        // a) Aggregation pipeline on AssociateCompany
        //    We'll create a field 'normalizedName' and match that to userNormalized
        const matchingCompanies = await AssociateCompanyModel.aggregate([
          {
            $addFields: {
              normalizedName: {
                // a1) Convert DB name to lowercase
                $toLower: "$name",
              },
            },
          },
          {
            // a2) Replace all spaces with underscores in normalizedName
            // For older MongoDB versions, you might need $project or multiple steps
            $addFields: {
              normalizedName: {
                $replaceAll: {
                  input: "$normalizedName",
                  find: " ",
                  replacement: "_",
                },
              },
            },
          },
          {
            // a3) Now match
            $match: { normalizedName: userNormalized },
          },
        ]);

        // b) Extract their IDs
        const matchingCompanyIds = matchingCompanies.map((c) => c._id);

        // c) Find all Associates whose associateCompany is in that set
        if (matchingCompanyIds.length > 0) {
          const foundAssociates = await AssociateModel.find({
            associateCompany: { $in: matchingCompanyIds },
          }).select("_id");
          matchingAssociateIds = foundAssociates.map((a) => a._id);
        }

        // d) Remove the field from 'query' to avoid confusion in Mongoose
        delete query.associateCompanyName;
      }

      // -----------------------------------------
      // 2) Filter by variantRate.isLive = true
      // -----------------------------------------
      const liveVariantRates = await VariantRateModel.find(
        { isLive: true },
        "_id"
      );
      const liveVariantRateIds = liveVariantRates.map((doc) => doc._id);

      // -----------------------------------------
      // 3) Build DisplayedRate query
      // -----------------------------------------
      const displayedRateFilter: any = {
        ...query,
        variantRate: { $in: liveVariantRateIds },
      };

      if (matchingAssociateIds.length > 0) {
        displayedRateFilter.associate = { $in: matchingAssociateIds };
      }

      // -----------------------------------------
      // 4) Fetch DisplayedRate with .populate()
      // -----------------------------------------
      const displayedRateDocs = await DisplayedRateModel.find(
        displayedRateFilter
      )
        .populate({
          path: "variantRate",
          populate: {
            path: "productVariant",
            populate: {
              path: "product",
              select: "name",
            },
            select: "name product",
          },
        })
        .populate("associate")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      // -----------------------------------------
      // 5) Convert, do commission logic if not Admin/Associate
      // -----------------------------------------
      const displayedRates = displayedRateDocs.map((doc) => {
        const displayedObj = doc.toObject() as IDisplayedRate;
        const variantRateDoc =
          displayedObj.variantRate as unknown as IVariantRate;
        const associateId = doc.associate?._id?.toString();
        console.log(associateId);

        const userId = req.user?.id;
        const userRole = req.user?.role;
        const baseRate = variantRateDoc.rate || 0;
        const variantComm = variantRateDoc.commission || 0;
        const displayedComm = displayedObj.commission || 0;
        if (associateId === userId) {
          variantRateDoc.rate = baseRate + variantComm;
        } else {
          variantRateDoc.rate = baseRate + variantComm + displayedComm;
          if (userRole !== "Admin") {
            variantRateDoc.commission = 0;
          }
        }

        return displayedObj;
      });
      // Adjust the rate if user is NOT Admin and also NOT the associate

      // -----------------------------------------
      // 6) Count for pagination
      // -----------------------------------------
      const totalCount = await DisplayedRateModel.countDocuments(
        displayedRateFilter
      );
      const totalPages = Math.ceil(totalCount / pagination.limit);

      // -----------------------------------------
      // 7) Return
      // -----------------------------------------
      return {
        data: displayedRates,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-getDisplayedRates");
      throw error;
    }
  }

  public async getDisplayedRateById(
    req: Request,
    id: string
  ): Promise<IDisplayedRate> {
    try {
      const displayedRate = await DisplayedRateModel.findById(id).populate(
        "variantRate associate"
      );

      if (!displayedRate) {
        throw new Error("Displayed Rate not found");
      }

      return displayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(
        error,
        req,
        "DisplayedRateRepository-getDisplayedRateById"
      );
      throw error;
    }
  }

  public async createDisplayedRate(
    req: Request,
    displayedRateData: ICreateDisplayedRate
  ): Promise<IDisplayedRate> {
    try {
      const newDisplayedRate = await DisplayedRateModel.create(
        displayedRateData
      );
      return newDisplayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-createDisplayedRate");
      throw error;
    }
  }

  public async updateDisplayedRate(
    req: Request,
    id: string,
    displayedRateData: Partial<IUpdateDisplayedRate>
  ): Promise<IDisplayedRate> {
    try {
      const updatedDisplayedRate = await DisplayedRateModel.findByIdAndUpdate(
        id,
        displayedRateData,
        { new: true }
      ).populate("variantRate associate");
      if (!updatedDisplayedRate) {
        throw new Error("Failed to update Displayed Rate");
      }
      return updatedDisplayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-updateDisplayedRate");
      throw error;
    }
  }

  public async deleteDisplayedRate(
    req: Request,
    id: string
  ): Promise<IDisplayedRate> {
    try {
      const deletedDisplayedRate = await DisplayedRateModel.findByIdAndDelete(
        id
      );
      if (!deletedDisplayedRate) {
        throw new Error("Failed to delete Displayed Rate");
      }
      return deletedDisplayedRate.toObject() as IDisplayedRate;
    } catch (error) {
      await logError(error, req, "DisplayedRateRepository-deleteDisplayedRate");
      throw error;
    }
  }
}

export default DisplayedRateRepository;

/*
 * Normalizes a string by trimming, lowercasing, and converting spaces to underscores.
 */

function normalizeCompanyName(original: string): string {
  return original.trim().toLowerCase().replace(/\s+/g, "_");
}
