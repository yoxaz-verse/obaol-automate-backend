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
