import { Request } from "express";
import {
  IAssociate,
  ICreateAssociate,
  IUpdateAssociate,
} from "../../interfaces/associate";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";
import { AssociateModel } from "../../database/models/associate";

class AssociateRepository {
  public async getAssociates(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: IAssociate[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      const associatesDoc = await AssociateModel.find(query)
        .populate("associateCompany") // Assuming you want to join with the AssociateCompany collection
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const associates = associatesDoc.map(
        (doc: any) => doc.toObject() as IAssociate
      );

      const totalCount = await AssociateModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: associates,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "AssociateRepository-getAssociates");
      throw error;
    }
  }
  public async getAssociatesByCompanyId(
    req: Request,
    companyId: string,
    pagination: IPagination
  ): Promise<{
    data: IAssociate[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      // Basic filter: associates not "deleted," belonging to that company
      const query = {
        associateCompany: companyId,
        isDeleted: false,
      };

      const associatesDoc = await AssociateModel.find(query, {
        _id: 1,
        name: 1,
      })
        .populate("associateCompany")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const associates = associatesDoc.map(
        (doc: any) => doc.toObject() as IAssociate
      );

      const totalCount = await AssociateModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: associates,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(
        error,
        req,
        "AssociateRepository-getAssociatesByCompanyId"
      );
      throw error;
    }
  }

  public async getAssociateById(req: Request, id: string): Promise<IAssociate> {
    try {
      const associateDoc = await AssociateModel.findOne({
        _id: id,
        isDeleted: false,
      }).populate("associateCompany");

      if (!associateDoc) {
        throw new Error("Associate not found");
      }

      return associateDoc.toObject() as any;
    } catch (error) {
      await logError(error, req, "AssociateRepository-getAssociateById");
      throw error;
    }
  }

  public async createAssociate(
    req: Request,
    associateData: ICreateAssociate
  ): Promise<IAssociate> {
    try {
      const newAssociate = await AssociateModel.create(associateData);
      return newAssociate.toObject() as any;
    } catch (error) {
      await logError(error, req, "AssociateRepository-createAssociate");
      throw error;
    }
  }

  public async updateAssociate(
    req: Request,
    id: string,
    associateData: Partial<IUpdateAssociate>
  ): Promise<IAssociate> {
    try {
      const updatedAssociate = await AssociateModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        associateData,
        { new: true }
      );
      if (!updatedAssociate) {
        throw new Error("Failed to update associate");
      }
      return updatedAssociate.toObject() as any;
    } catch (error) {
      await logError(error, req, "AssociateRepository-updateAssociate");
      throw error;
    }
  }

  public async deleteAssociate(req: Request, id: string): Promise<IAssociate> {
    try {
      const deletedAssociate = await AssociateModel.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true },
        { new: true }
      );
      if (!deletedAssociate) {
        throw new Error("Failed to delete associate");
      }
      return deletedAssociate.toObject() as any;
    } catch (error) {
      await logError(error, req, "AssociateRepository-deleteAssociate");
      throw error;
    }
  }
}

export default AssociateRepository;
