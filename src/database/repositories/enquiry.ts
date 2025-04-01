import { Request } from "express";
import {
  IEnquiry,
  ICreateEnquiry,
  IUpdateEnquiry,
} from "../../interfaces/enquiry";
import { logError } from "../../utils/errorLogger"; // or wherever your logError is
import { IPagination } from "@interfaces/pagination"; // same style as your code
import { EnquiryModel } from "../../database/models/enquiry";

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
      // For example, we do a normal find with skip/limit
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

      const enquiries = enquiriesDoc.map((doc) => doc.toObject() as IEnquiry);

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
      const newEnquiry = await EnquiryModel.create(enquiryData);
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
