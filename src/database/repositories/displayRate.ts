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
  
      // If user is an Associate, filter by that user's company
      const userRole = req.user?.role;
      const userId = req.user?.id;
  
      if (userRole === "Associate" && userId) {
        // a) find the associate doc for this user, to get associateCompany
        const userAssociateDoc = await AssociateModel.findById(userId).select(
          "associateCompany"
        );
        if (!userAssociateDoc) {
          // If no doc, user might be invalid => force empty results
          query.associate = { $in: [] };
        } else {
          const companyId = userAssociateDoc.associateCompany;
  
          // b) find all associates referencing that same company
          const foundAssociates = await AssociateModel.find({
            associateCompany: companyId,
          }).select("_id");
          matchingAssociateIds = foundAssociates.map((a) => a._id);
  
          // c) Restrict displayedRate.associate to that set
          query.associate = { $in: matchingAssociateIds };
        }
      }
  
      // 1) Filter by variantRate.isLive = true
      const liveVariantRates = await VariantRateModel.find({ isLive: true }, "_id");
      const liveVariantRateIds = liveVariantRates.map((doc) => doc._id);
  
      // 2) Build DisplayedRate query
      // Combine with your existing query + variantRate in live set
      const displayedRateFilter: any = {
        ...query,
        variantRate: { $in: liveVariantRateIds },
      };
  
      // e.g. if we only want displayedRates for user’s company,
      // query.associate was already set => merges into displayedRateFilter
  
      // 3) Fetch DisplayedRate with .populate()
      const displayedRateDocs = await DisplayedRateModel.find(displayedRateFilter)
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
  
      // 4) Convert, do commission logic if not Admin/Associate
      const displayedRates = displayedRateDocs.map((doc) => {
        const displayedObj = doc.toObject() as IDisplayedRate;
        const variantRateDoc = displayedObj.variantRate as unknown as IVariantRate;
  
        const baseRate = variantRateDoc.rate ?? 0;
        const variantComm = variantRateDoc.commission ?? 0;
        const displayedComm = displayedObj.commission ?? 0;
  
        const rowAssociateId = doc.associate?._id?.toString();
        const userRole = req.user?.role;
        const userId = req.user?.id;
  
        // If the row’s associate == user => only add variantComm
        // else add both variantComm + displayedComm
        if (rowAssociateId === userId) {
          variantRateDoc.rate = baseRate + variantComm;
        } else {
          variantRateDoc.rate = baseRate + variantComm + displayedComm;
          // if the user is not Admin, we hide the 'commission' field
          if (userRole !== "Admin") {
            variantRateDoc.commission = 0;
          }
        }
  
        return displayedObj;
      });
  
      // 5) Count for pagination
      const totalCount = await DisplayedRateModel.countDocuments(displayedRateFilter);
      const totalPages = Math.ceil(totalCount / pagination.limit);
  
      // 6) Return
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
