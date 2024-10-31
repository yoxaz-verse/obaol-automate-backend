import { Request } from "express";

export interface IPagination {
  page: number;
  limit: number;
}

export const paginationHandler = (req: Request): IPagination => {
  let { page, limit } = req.query;

  let pageNumber = parseInt(page as string, 10);
  let limitNumber = parseInt(limit as string, 10);

  if (isNaN(pageNumber) || pageNumber < 1) {
    pageNumber = 1;
  }

  if (isNaN(limitNumber) || limitNumber < 1) {
    limitNumber = 10;
  }

  return { page: pageNumber, limit: limitNumber };
};
