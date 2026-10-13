import { describe, expect, it, vi } from "vitest";
import { validateEntity } from "../src/middlewares/validateEntity";

describe("generic enquiry route guard", () => {
  it.each(["GET", "POST", "PUT", "PATCH", "DELETE"])(
    "blocks %s access to the legacy enquiries entity",
    (method) => {
      const req = { method, params: { entity: "enquiries" } } as any;
      const json = vi.fn();
      const status = vi.fn(() => ({ json }));
      const next = vi.fn();

      validateEntity(req, { status } as any, next);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
      expect(next).not.toHaveBeenCalled();
    }
  );

  it("keeps ordinary registered entities available to generic CRUD", () => {
    const next = vi.fn();
    validateEntity(
      { params: { entity: "categories" } } as any,
      { status: vi.fn() } as any,
      next
    );
    expect(next).toHaveBeenCalledOnce();
  });
});
