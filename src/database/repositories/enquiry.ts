import { Request } from "express";
import {
  IEnquiry,
  ICreateEnquiry,
  IUpdateEnquiry,
} from "../../interfaces/enquiry";
import { logError } from "../../utils/errorLogger"; // or wherever your logError is
import { IPagination } from "@interfaces/pagination"; // same style as your code
import { EnquiryModel } from "../../database/models/enquiry";
import { VariantRateModel } from "../../database/models/variantRate";
import { DisplayedRateModel } from "../../database/models/displayedRate";
import { Types } from "mongoose";
import { EnquiryProcessStatusModel } from "../../database/models/enquiryProcessStatus";

export class EnquiryRepository {
  public async getEnquiries(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IEnquiry[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const userRole = req.user?.role;
      const isAdmin = userRole === "Admin";

      const enquiriesDoc = await EnquiryModel.find(query)
        .populate({
          path: "productVariant",
          populate: { path: "product", select: "name" },
          select: "name product",
        })
        .populate({
          path: "productAssociate",
          populate: { path: "associateCompany", select: "name" },
          select: "name _id",
        })
        .populate("variantRate displayRate mediatorAssociate")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const enquiries = enquiriesDoc.map((doc) => {
        const enquiry = doc.toObject() as IEnquiry;

        const productAssociateId = enquiry.productAssociate?._id?.toString();

        if (productAssociateId !== req.user?.id && !isAdmin) {
          enquiry.rate = (enquiry.rate || 0) + (enquiry.commission || 0);
        }

        if (!isAdmin) {
          delete enquiry.commission;
          delete enquiry.mediatorCommission;
        }

        return enquiry;
      });

      const totalCount = await EnquiryModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: enquiries,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "EnquiryRepository-getEnquiries");
      throw error;
    }
  }

  public async getEnquiryById(req: Request, id: string): Promise<IEnquiry> {
    try {
      const enquiryDoc = await EnquiryModel.findById(id).populate(
        "variantRate displayRate productVariant mediatorAssociate productAssociate"
      );
      if (!enquiryDoc) {
        throw new Error("Enquiry not found");
      }
      return enquiryDoc.toObject() as IEnquiry;
    } catch (error) {
      await logError(error, req, "EnquiryRepository-getEnquiryById");
      throw error;
    }
  }

  public async createEnquiry(
    req: Request,
    enquiryData: ICreateEnquiry
  ): Promise<IEnquiry> {
    try {
      const {
        variantRate: variantRateId,
        displayRate: displayRateId,
        ...restData
      } = enquiryData;

      // 🎯 Fetch main rate (required)
      const variantRate = await VariantRateModel.findById(
        variantRateId
      ).populate("associate");
      if (!variantRate || !variantRate.associate) {
        throw new Error("Invalid variantRate or missing associate");
      }

      const productAssociate = variantRate.associate._id;
      const rate = variantRate.rate;
      const commission = variantRate.commission ?? 0;

      // 🔄 Optional: Fetch display rate if exists
      let mediatorAssociate: Types.ObjectId | null = null;
      let mediatorCommission = 0;

      if (displayRateId) {
        const displayRate = await VariantRateModel.findById(
          displayRateId
        ).populate("associate");
        if (displayRate && displayRate.associate) {
          mediatorAssociate = displayRate.associate._id;
          mediatorCommission = displayRate.commission ?? 0;
        }
      }

      // 🧾 Final payload
      const newEnquiry = await EnquiryModel.create({
        ...restData,
        variantRate: variantRateId,
        displayRate: displayRateId,
        productAssociate,
        mediatorAssociate,
        rate,
        commission,
        mediatorCommission,
      });

      return newEnquiry.toObject() as IEnquiry;
    } catch (error) {
      await logError(error, req, "EnquiryRepository-createEnquiry");
      throw error;
    }
  }

  public async updateEnquiry(
    req: Request,
    id: string,
    enquiryData: Partial<IUpdateEnquiry>
  ): Promise<IEnquiry> {
    try {
      // 🧠 Convert status name to ObjectId if it's a string
      if (enquiryData.status && typeof enquiryData.status === "string") {
        const statusDoc = await EnquiryProcessStatusModel.findOne({
          name: enquiryData.status,
        });

        if (!statusDoc) {
          throw new Error(`Invalid status name: ${enquiryData.status}`);
        }

        enquiryData.status = statusDoc._id;
      }

      const updatedDoc = await EnquiryModel.findByIdAndUpdate(id, enquiryData, {
        new: true,
      }).populate(
        "variantRate displayRate productVariant mediatorAssociate productAssociate"
      );

      if (!updatedDoc) {
        throw new Error("Failed to update Enquiry");
      }

      return updatedDoc.toObject() as IEnquiry;
    } catch (error) {
      await logError(error, req, "EnquiryRepository-updateEnquiry");
      throw error;
    }
  }

  public async deleteEnquiry(req: Request, id: string): Promise<IEnquiry> {
    try {
      const deletedDoc = await EnquiryModel.findByIdAndDelete(id);
      if (!deletedDoc) {
        throw new Error("Failed to delete Enquiry");
      }
      return deletedDoc.toObject() as IEnquiry;
    } catch (error) {
      await logError(error, req, "EnquiryRepository-deleteEnquiry");
      throw error;
    }
  }
}
