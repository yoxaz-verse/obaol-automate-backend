import { Request, Response } from "express";
import AssociateRepository from "../database/repositories/associate";
import { logError } from "../utils/errorLogger";
import { hashPassword } from "../utils/passwordUtils";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class AssociateService {
  private associateRepository: AssociateRepository;

  constructor() {
    this.associateRepository = new AssociateRepository();
  }

  public async getAssociates(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const associates = await this.associateRepository.getAssociates(
        req,
        pagination,
        search
      );
      res.json({
        data: associates,
        message: "Associates retrieved successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateService-getAssociates");
      res.status(500).send("Associates retrieval failed");
    }
  }

  public async getAssociate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const associate = await this.associateRepository.getAssociateById(
        req,
        id
      );
      res.json(associate);
    } catch (error) {
      logError(error, req, "AssociateService-getAssociate");
      res.status(404).send("Associate not found");
    }
  }

  public async createAssociate(req: Request, res: Response) {
    try {
      const associateData = req.body;
      associateData.password = await hashPassword(associateData.password);
      const newAssociate = await this.associateRepository.createAssociate(
        req,
        associateData
      );
      res.status(201).json({
        data: newAssociate,
        message: "Associate created successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateService-createAssociate");
      res.status(500).send("Associate creation failed");
    }
  }

  public async updateAssociate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const associateData = req.body;
      if (associateData.password) {
        associateData.password = await hashPassword(associateData.password);
      }
      const updatedAssociate = await this.associateRepository.updateAssociate(
        req,
        id,
        associateData
      );
      res.json({
        data: updatedAssociate,
        message: "Associate updated successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateService-updateAssociate");
      res.status(500).send("Associate update failed");
    }
  }

  public async deleteAssociate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedAssociate = await this.associateRepository.deleteAssociate(
        req,
        id
      );
      res.json({
        data: deletedAssociate,
        message: "Associate deleted successfully",
      });
    } catch (error) {
      logError(error, req, "AssociateService-deleteAssociate");
      res.status(500).send("Associate deletion failed");
    }
  }
}

export default AssociateService;
