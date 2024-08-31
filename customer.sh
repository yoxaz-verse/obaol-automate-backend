#!/bin/bash

# Create model
cat <<EOT > src/database/models/customer.ts
import mongoose from "mongoose";

interface ICustomer extends mongoose.Document {
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
}

const CustomerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    name: { type: String, required: true },
    password: { type: String, required: true }
  },
  { timestamps: true }
);

export const CustomerModel = mongoose.model<ICustomer>("Customer", CustomerSchema);
EOT

# Create repository
cat <<EOT > src/database/repositories/customer.ts
import { Request } from "express";
import { CustomerModel } from "../models/customer";
import { ICustomer, ICreateCustomer, IUpdateCustomer } from "../../interfaces/customer";
import { logError } from "../../utils/errorLogger";
import { IPagination } from "../../interfaces/pagination";

class CustomerRepository {
  public async getCustomers(
    req: Request,
    pagination: IPagination,
    search: string
  ): Promise<{
    data: ICustomer[];
    totalCount: number;
    currentPage: number;
    totalPages?: number;
  }> {
    try {
      let query: any = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
      const customers = await CustomerModel.find(query)
        .limit(pagination.limit)
        .skip((pagination.page - 1) * pagination.limit)
        .lean();

      const totalCount = await CustomerModel.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pagination.limit);
      return {
        data: customers,
        totalCount,
        currentPage: pagination.page,
        totalPages,
      };
    } catch (error) {
      await logError(error, req, "CustomerRepository-getCustomers");
      throw error;
    }
  }

  public async getCustomerById(req: Request, id: string): Promise<ICustomer> {
    try {
      const customer = await CustomerModel.findById(id).lean();
      if (!customer || customer.isDeleted) {
        throw new Error("Customer not found");
      }
      return customer;
    } catch (error) {
      await logError(error, req, "CustomerRepository-getCustomerById");
      throw error;
    }
  }

  public async createCustomer(
    req: Request,
    customerData: ICreateCustomer
  ): Promise<ICustomer> {
    try {
      const newCustomer = await CustomerModel.create(customerData);
      return newCustomer.toObject();
    } catch (error) {
      await logError(error, req, "CustomerRepository-createCustomer");
      throw error;
    }
  }

  public async updateCustomer(
    req: Request,
    id: string,
    customerData: Partial<IUpdateCustomer>
  ): Promise<ICustomer> {
    try {
      const updatedCustomer = await CustomerModel.findByIdAndUpdate(id, customerData, {
        new: true,
      });
      if (!updatedCustomer || updatedCustomer.isDeleted) {
        throw new Error("Failed to update customer");
      }
      return updatedCustomer.toObject();
    } catch (error) {
      await logError(error, req, "CustomerRepository-updateCustomer");
      throw error;
    }
  }

  public async deleteCustomer(req: Request, id: string): Promise<ICustomer> {
    try {
      const deletedCustomer = await CustomerModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true }
      );
      if (!deletedCustomer) {
        throw new Error("Failed to delete customer");
      }
      return deletedCustomer.toObject();
    } catch (error) {
      await logError(error, req, "CustomerRepository-deleteCustomer");
      throw error;
    }
  }
}

export default CustomerRepository;
EOT

# Create service
cat <<EOT > src/services/customer.ts
import { Request, Response } from "express";
import CustomerRepository from "../database/repositories/customer";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";

class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  public async getCustomers(req: Request, res: Response) {
    try {
      const pagination = paginationHandler(req);
      const search = searchHandler(req);
      const customers = await this.customerRepository.getCustomers(
        req,
        pagination,
        search
      );
      res.sendArrayFormatted(customers, "Customers retrieved successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-getCustomers");
      res.sendError(error, "Customers retrieval failed");
    }
  }

  public async getCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await this.customerRepository.getCustomerById(req, id);
      res.sendFormatted(customer, "Customer retrieved successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-getCustomer");
      res.sendError(error, "Customer retrieval failed");
    }
  }

  public async createCustomer(req: Request, res: Response) {
    try {
      const customerData = req.body;
      const newCustomer = await this.customerRepository.createCustomer(req, customerData);
      res.sendFormatted(newCustomer, "Customer created successfully", 201);
    } catch (error) {
      await logError(error, req, "CustomerService-createCustomer");
      res.sendError(error, "Customer creation failed");
    }
  }

  public async updateCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customerData = req.body;
      const updatedCustomer = await this.customerRepository.updateCustomer(
        req,
        id,
        customerData
      );
      res.sendFormatted(updatedCustomer, "Customer updated successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-updateCustomer");
      res.sendError(error, "Customer update failed");
    }
  }

  public async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deletedCustomer = await this.customerRepository.deleteCustomer(req, id);
      res.sendFormatted(deletedCustomer, "Customer deleted successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-deleteCustomer");
      res.sendError(error, "Customer deletion failed");
    }
  }
}

export default CustomerService;
EOT

# Create middleware
cat <<EOT > src/middlewares/customer.ts
import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/errorLogger";

class CustomerMiddleware {
  public async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email || !name || !password) {
        res.sendError(
          "ValidationError: Email, Name, and Password must be provided",
          "Email, Name, and Password must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerCreate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;
      if (!email && !name && !password) {
        res.sendError(
          "ValidationError: Email, Name, and Password must be provided",
          "Email, Name, and Password must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerUpdate");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerDelete");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }

  public async getCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!id) {
        res.sendError(
          "ValidationError: ID must be provided",
          "ID must be provided",
          400
        );
        return;
      }
      next();
    } catch (error) {
      await logError(error, req, "Middleware-CustomerGet");
      res.sendError(error, "An unexpected error occurred", 500);
    }
  }
}

export default CustomerMiddleware;
EOT

# Create interface
cat <<EOT > src/interfaces/customer.ts
export interface ICustomer {
  _id: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  name: string;
  password: string;
}

export interface ICreateCustomer {
  email: string;
  isActive?: boolean; 
  isDeleted?: boolean;
  name: string;
  password: string;
}

export interface IUpdateCustomer {
  email?: string;
  isActive?: boolean;
  isDeleted?: boolean;
  name?: string;
  password?: string;
}
EOT

# Create routes
cat <<EOT > src/routes/customerRoute.ts
import { Router } from "express";
import CustomerService from "../services/customer";
import CustomerMiddleware from "../middlewares/customer";

const router = Router();
const customerService = new CustomerService();
const customerMiddleware = new CustomerMiddleware();

router.get(
  "/",
  customerService.getCustomers.bind(customerService)
);
router.get(
  "/:id",
  customerMiddleware.getCustomer.bind(customerMiddleware),
  customerService.getCustomer.bind(customerService)
);
router.post(
  "/",
  customerMiddleware.createCustomer.bind(customerMiddleware),
  customerService.createCustomer.bind(customerService)
);
router.patch(
  "/:id",
  customerMiddleware.updateCustomer.bind(customerMiddleware),
  customerService.updateCustomer.bind(customerService)
);
router.delete(
  "/:id",
  customerMiddleware.deleteCustomer.bind(customerMiddleware),
  customerService.deleteCustomer.bind(customerService)
);

export default router;
EOT

echo "Customer module generated successfully."
