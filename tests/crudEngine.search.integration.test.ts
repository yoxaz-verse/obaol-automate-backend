import { CrudEngine } from "../src/core/engine/crud.engine";
import { AdminModel } from "../src/database/models/admin";
import { OperatorModel } from "../src/database/models/operator";
import { StateModel } from "../src/database/models/state";

describe("CrudEngine search hardening", () => {
  it("does not throw for operators search when related entity has numeric searchable fields", async () => {
    const state = await StateModel.create({
      code: 91,
      name: "Maharashtra",
    });

    await OperatorModel.create({
      name: "Asha Operator",
      email: "asha.operator@example.com",
      phone: "9999999999",
      password: "Passw0rd!",
      address: "Pune",
      state: state._id,
      role: "operator",
    });

    const engine = new CrudEngine(OperatorModel as any, "operators");
    const req = { params: { entity: "operators" }, query: { search: "a" } } as any;

    const result = await engine.findAll(req, { page: 1, limit: 25 }, { search: "a", page: 1, limit: 25 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
  });

  it("does not throw for numeric search text on operators", async () => {
    const state = await StateModel.create({
      code: 91,
      name: "Karnataka",
    });

    await OperatorModel.create({
      name: "Ravi Operator",
      email: "ravi.operator@example.com",
      phone: "8888888888",
      password: "Passw0rd!",
      address: "Bengaluru",
      state: state._id,
      role: "operator",
    });

    const engine = new CrudEngine(OperatorModel as any, "operators");
    const req = { params: { entity: "operators" }, query: { search: "91" } } as any;

    const result = await engine.findAll(req, { page: 1, limit: 25 }, { search: "91", page: 1, limit: 25 });
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.currentPage).toBe(1);
  });

  it("keeps normal search working for unaffected entities (admins)", async () => {
    await AdminModel.create({
      name: "Admin Alpha",
      email: "admin.alpha@example.com",
      password: "Passw0rd!",
      role: "admin",
    });

    const engine = new CrudEngine(AdminModel as any, "admins");
    const req = { params: { entity: "admins" }, query: { search: "alpha" } } as any;

    const result = await engine.findAll(req, { page: 1, limit: 25 }, { search: "alpha", page: 1, limit: 25 });
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(String(result.data[0]?.name || "").toLowerCase()).toContain("alpha");
  });
});
