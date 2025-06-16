import { Request } from "express";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { EnquiryProcessStatusModel } from "../../database/models/enquiryProcessStatus";

class EnquiryProcessStatusRepository {
  public async getEnquiryProcessStatuss(
    req: Request,
    pagination: IPagination,
    query: any
  ) {
    try {
      const docs = await EnquiryProcessStatusModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);
      const totalCount = await EnquiryProcessStatusModel.countDocuments(query);
      return {
        data: docs.map((d) => d.toObject()),
        totalCount,
        currentPage: pagination.page,
        totalPages: Math.ceil(totalCount / pagination.limit),
      };
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusRepository-getEnquiry Process Status"
      );
      throw error;
    }
  }

  public async getEnquiryProcessStatusById(req: Request, id: string) {
    try {
      const doc = await EnquiryProcessStatusModel.findById(id);
      if (!doc) throw new Error("EnquiryProcessStatus not found");
      return doc.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusRepository-getEnquiryProcessStatusById"
      );
      throw error;
    }
  }

  public async createEnquiryProcessStatus(req: Request, data: any) {
    try {
      const created = await EnquiryProcessStatusModel.create(data);
      return created.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusRepository-createEnquiryProcessStatus"
      );
      throw error;
    }
  }

  public async updateEnquiryProcessStatus(req: Request, id: string, data: any) {
    try {
      const updated = await EnquiryProcessStatusModel.findByIdAndUpdate(
        id,
        data,
        { new: true }
      );
      if (!updated) throw new Error("Failed to update enquiryProcessStatus");
      return updated.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusRepository-updateEnquiryProcessStatus"
      );
      throw error;
    }
  }

  public async deleteEnquiryProcessStatus(req: Request, id: string) {
    try {
      const deleted = await EnquiryProcessStatusModel.findByIdAndDelete(id);
      if (!deleted) throw new Error("Failed to delete enquiryProcessStatus");
      return deleted.toObject();
    } catch (error) {
      logError(
        error,
        req,
        "EnquiryProcessStatusRepository-deleteEnquiryProcessStatus"
      );
      throw error;
    }
  }
}

export default EnquiryProcessStatusRepository;
