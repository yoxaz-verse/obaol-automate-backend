import { Request } from "express";

export const searchHandler = (req: Request): string => {
  //     distance_km = Router.getDistance(origin, port_coord)
  // inland_cost = distance_km * rate_per_km

  // distances = Router.matrix(origin, [port1, port2, …])
  // nearest_port = argmin(distances)

  // const insurance_cost = (value + freight) × insurance_rate
  
  // CIF_per_ton = inland_cost_per_ton + ocean_cost_per_ton + insurance_cost_per_ton.

//   CIF_per_TEUnit = inland_cost + ocean_cost + insurance_cost  (per TEU or FEU as applicable).

  const { search } = req.query;
  return search ? String(search) : "";
};
