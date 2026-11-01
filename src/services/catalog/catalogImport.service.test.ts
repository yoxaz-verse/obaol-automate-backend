import * as XLSX from "xlsx";
import { CATALOG_IMPORT_HEADERS, createCatalogTemplate, parseCatalogWorkbook } from "./catalogImport.service";

const workbookBuffer = (rows: Record<string, unknown>[]) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Catalog");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

describe("catalog Excel import contract", () => {
  it("parses the flat hierarchy format", () => {
    const rows = parseCatalogWorkbook(workbookBuffer([{ Category: "Agri", Subcategory: "Spices", Product: "Pepper", Variant: "Grade A" }]));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ Category: "Agri", Product: "Pepper" });
  });

  it("rejects a workbook missing required columns", () => {
    expect(() => parseCatalogWorkbook(workbookBuffer([{ Category: "Agri", Product: "Pepper" }]))).toThrow(/Missing required columns/);
  });

  it("creates a readable template containing every supported header", () => {
    const workbook = XLSX.read(createCatalogTemplate(), { type: "buffer" });
    const header = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })[0].map(String);
    expect(header).toEqual(expect.arrayContaining(CATALOG_IMPORT_HEADERS));
  });
});
