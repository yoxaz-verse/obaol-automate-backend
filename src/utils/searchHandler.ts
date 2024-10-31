import { Request } from "express";

export const searchHandler = (req: Request): string => {
  const { search } = req.query;
  return search ? String(search) : "";
};
