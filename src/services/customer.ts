import { Request, Response } from "express";
import CustomerRepository from "../database/repositories/customer";
import { logError } from "../utils/errorLogger";
import { paginationHandler } from "../utils/paginationHandler";
import { searchHandler } from "../utils/searchHandler";
import { hashPassword } from "../utils/passwordUtils";

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
      res.json(customer);
    } catch (error) {
      await logError(error, req, "CustomerService-getCustomer");
      res.sendError(error, "Customer retrieval failed");
    }
  }
  public async createCustomer(req: Request, res: Response) {
    try {
      // Hash password
      const customerData = req.body;
      customerData.password = await hashPassword(customerData.password);
      const newCustomer = await this.customerRepository.createCustomer(
        req,
        customerData
      );
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
      // Hash password
      if (customerData.password) {
        customerData.password = await hashPassword(customerData.password);
      }
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
      const deletedCustomer = await this.customerRepository.deleteCustomer(
        req,
        id
      );
      res.sendFormatted(deletedCustomer, "Customer deleted successfully");
    } catch (error) {
      await logError(error, req, "CustomerService-deleteCustomer");
      res.sendError(error, "Customer deletion failed");
    }
  }
}

export default CustomerService;
