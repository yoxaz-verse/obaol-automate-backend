import { IncotermModel } from "../database/models/incoterm";

const DEFAULT_INCOTERMS = [
    { code: "EXW", name: "Ex Works" },
    { code: "FCA", name: "Free Carrier" },
    { code: "CPT", name: "Carriage Paid To" },
    { code: "CIP", name: "Carriage and Insurance Paid To" },
    { code: "DAP", name: "Delivered at Place" },
    { code: "DDP", name: "Delivered Duty Paid" },
    { code: "FOB", name: "Free on Board" },
    { code: "CFR", name: "Cost and Freight" },
    { code: "CIF", name: "Cost, Insurance and Freight" },
];

export const seedIncoterms = async () => {
    const existing = await IncotermModel.countDocuments();
    if (existing > 0) return;
    await IncotermModel.insertMany(DEFAULT_INCOTERMS);
};
