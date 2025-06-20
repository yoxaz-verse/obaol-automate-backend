import { Request } from "express";
import { AssociateCompanyModel } from "../models/associateCompany";
import {
  IAssociateCompany,
  ICreateAssociateCompany,
  IUpdateAssociateCompany,
} from "../../interfaces/associateCompany";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class AssociateCompanyRepository {
  public async getAssociateCompanies(
    req: Request,
    pagination: IPagination,
    query: any
  ): Promise<{
    data: IAssociateCompany[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      const associateCompaniesDoc = await AssociateCompanyModel.find(query)
        .populate("state division companyType district")
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit);

      const associateCompanies = associateCompaniesDoc.map(
        (doc) => doc.toObject() as any
      );

      const totalCount = await AssociateCompanyModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: associateCompanies,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(
        error,
        req,
        "AssociateCompanyRepository-getAssociateCompanies"
      );
      throw error;
    }
  }

  public async getAssociateCompanyById(
    req: Request,
    id: string
  ): Promise<IAssociateCompany> {
    try {
      const associateCompanyDoc = await AssociateCompanyModel.findOne({
        _id: id,
      });

      if (!associateCompanyDoc) {
        throw new Error("Associate Company not found");
      }

      return associateCompanyDoc.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "AssociateCompanyRepository-getAssociateCompanyById"
      );
      throw error;
    }
  }

  public async createAssociateCompany(
    req: Request,
    associateCompanyData: ICreateAssociateCompany
  ): Promise<IAssociateCompany> {
    try {
      const newAssociateCompany = await AssociateCompanyModel.create(
        associateCompanyData
      );
      return newAssociateCompany.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "AssociateCompanyRepository-createAssociateCompany"
      );
      throw error;
    }
  }

  public async updateAssociateCompany(
    req: Request,
    id: string,
    associateCompanyData: Partial<IUpdateAssociateCompany>
  ): Promise<IAssociateCompany> {
    try {
      const updatedAssociateCompany =
        await AssociateCompanyModel.findOneAndUpdate(
          { _id: id },
          associateCompanyData,
          { new: true }
        );
      if (!updatedAssociateCompany) {
        throw new Error("Failed to update Associate Company");
      }
      return updatedAssociateCompany.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "AssociateCompanyRepository-updateAssociateCompany"
      );
      throw error;
    }
  }

  public async deleteAssociateCompany(
    req: Request,
    id: string
  ): Promise<IAssociateCompany> {
    try {
      console.log("id", id);

      const deletedAssociateCompany =
        await AssociateCompanyModel.findByIdAndDelete(id);

      if (!deletedAssociateCompany) {
        throw new Error("Associate Company not found or already deleted");
      }

      return deletedAssociateCompany.toObject() as any;
    } catch (error) {
      await logError(
        error,
        req,
        "AssociateCompanyRepository-deleteAssociateCompany"
      );
      throw error;
    }
  }
}

export default AssociateCompanyRepository;
