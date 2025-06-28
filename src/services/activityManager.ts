// src/services/InventoryManager.ts

import { Request, Response } from "express";
import InventoryManagerRepository from "../database/repositories/inventoryManager";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { hashPassword } from "../utils/passwordUtils";
import { buildDynamicQuery } from "../utils/buildDynamicQuery";

class InventoryManagerService {
  private inventoryManagerRepository: InventoryManagerRepository;

  constructor() {
    this.inventoryManagerRepository = new InventoryManagerRepository();
  }

  public async getInventoryManagers(req: Request, res: Response) {
    try {
      const { page, limit, ...filters } = req.query;
      const pagination = paginationHandler(req);
      const dynamicQuery = buildDynamicQuery(filters);
      const inventoryManagers =
        await this.inventoryManagerRepository.getInventoryManagers(
          req,
          pagination,
          dynamicQuery
        );
      res.sendArrayFormatted(
        inventoryManagers,
        "Customers retrieved successfully"
      );
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerService-getInventoryManagers"
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async getInventoryManagerById(req: Request, res: Response) {
    try {
      const inventoryManager =
        await this.inventoryManagerRepository.getInventoryManagerById(
          req,
          req.params.id
        );
      res.json(inventoryManager);
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerService-getInventoryManagerById"
      );
      res.status(404).json({ error: error });
    }
  }

  public async createInventoryManager(req: Request, res: Response) {
    try {
      // Hash password
      req.body.password = await hashPassword(req.body.password);
      const newInventoryManager =
        await this.inventoryManagerRepository.createInventoryManager(
          req,
          req.body
        );
      res.status(201).json(newInventoryManager);
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerService-createInventoryManager"
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  }

  public async updateInventoryManager(req: Request, res: Response) {
    try {
      if (req.body.password) {
        req.body.password = await hashPassword(req.body.password);
      }

      const updatedInventoryManager =
        await this.inventoryManagerRepository.updateInventoryManager(
          req,
          req.params.id,
          req.body
        );

      res.json(updatedInventoryManager);
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerService-updateInventoryManager"
      );
      res.status(404).json({ error: error });
    }
  }

  public async deleteInventoryManager(req: Request, res: Response) {
    try {
      const deletedInventoryManager =
        await this.inventoryManagerRepository.deleteInventoryManager(
          req,
          req.params.id
        );
      res.json(deletedInventoryManager);
    } catch (error) {
      await logError(
        error,
        req,
        "InventoryManagerService-deleteInventoryManager"
      );
      res.status(404).json({ error: error });
    }
  }
}

export default InventoryManagerService;
