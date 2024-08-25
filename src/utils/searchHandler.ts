import { Request } from "express";

export const searchHandler = (req: Request) => {
  const search = req.query.search ? (req.query.search as string) : "";
  return search;
};
