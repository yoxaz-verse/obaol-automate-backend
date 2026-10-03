import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const port = Number(process.env.E2E_BACKEND_PORT || 5001);
const runId = String(process.env.E2E_RUN_ID || `local-${Date.now()}`);
const password = String(process.env.E2E_PASSWORD || "FlowTest!234");

process.env.NODE_ENV = "test";
process.env.PORT = String(port);
process.env.BASE_URL = `http://127.0.0.1:${port}`;
process.env.JWT_SECRET = process.env.JWT_SECRET || "e2e-isolated-secret";
process.env.AUTH_LOGIN_RATE_LIMIT_MAX = "500";
process.env.RUN_STARTUP_SEEDS = "false";
process.env.SMTP_HOST = "smtp.test.local";
process.env.SMTP_PORT = "587";
process.env.SMTP_SECURE = "false";
process.env.SMTP_AUTH_PASSWORD = "test-password";
process.env.SMTP_AUTH_USER = "no-reply@auth.obaol.test";
process.env.SMTP_NOTIFY_USER = "no-reply@notify.obaol.test";
process.env.SMTP_SUPPORT_USER = "support@obaol.test";

const main = async () => {
const mongo = await MongoMemoryServer.create({ instance: { ip: "127.0.0.1" } });
process.env.MONGODB_URI = mongo.getUri();
await mongoose.connect(process.env.MONGODB_URI);

const [
  { default: app },
  { AssociateModel },
  { AssociateCompanyModel },
  { CompanyInterestProfileModel },
  { OperatorModel },
  { AdminModel },
] = await Promise.all([
  import("../src/app"),
  import("../src/database/models/associate"),
  import("../src/database/models/associateCompany"),
  import("../src/database/models/companyInterestProfile"),
  import("../src/database/models/operator"),
  import("../src/database/models/admin"),
]);

const makeCompany = async (name: string, suffix: string, capabilities: string[]) =>
  AssociateCompanyModel.create({
    name: `${name} ${runId}`,
    email: `${suffix}.${runId}@company.obaol.test`,
    phone: `+91910000${suffix.padStart(4, "0").slice(-4)}`,
    phoneSecondary: `+91920000${suffix.padStart(4, "0").slice(-4)}`,
    address: "Isolated E2E fixture",
    serviceCapabilities: capabilities,
    registrationStatus: "APPROVED",
    isApproved: true,
    tags: ["E2E", runId],
  });

const buyerCompany = await makeCompany("E2E Buyer", "1001", ["PROCUREMENT"]);
const sellerCompany = await makeCompany("E2E Seller", "1002", ["PROCUREMENT", "WAREHOUSING"]);
const serviceCompany = await makeCompany("E2E Service", "1003", ["TRANSPORTATION", "QUALITY_TESTING"]);

await Promise.all([
  CompanyInterestProfileModel.create({ associateCompanyId: buyerCompany._id, interests: ["PROCUREMENT"] }),
  CompanyInterestProfileModel.create({ associateCompanyId: sellerCompany._id, interests: ["PROCUREMENT", "WAREHOUSING"] }),
  CompanyInterestProfileModel.create({ associateCompanyId: serviceCompany._id, interests: ["TRANSPORTATION", "QUALITY_TESTING"] }),
]);

const associateFixture = (email: string, name: string, tradeMode: string, company: any, overrides: Record<string, unknown> = {}) => ({
  email,
  name,
  tradeMode,
  associateCompany: company?._id,
  hasCompany: Boolean(company),
  companyMode: company ? "existing" : "none",
  phone: `+91930000${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
  password,
  isActive: true,
  isEmailVerified: true,
  onboardingComplete: true,
  registrationStatus: "APPROVED",
  registrationSource: "ADMIN_CREATED",
  ...overrides,
});

await Promise.all([
  AssociateModel.create(associateFixture("buyer@e2e.obaol.test", "E2E Buyer", "BUY", buyerCompany)),
  AssociateModel.create(associateFixture("seller@e2e.obaol.test", "E2E Seller", "SELL", sellerCompany)),
  AssociateModel.create(associateFixture("both@e2e.obaol.test", "E2E Both", "BOTH", sellerCompany)),
  AssociateModel.create(associateFixture("service@e2e.obaol.test", "E2E Service", "SERVICE", serviceCompany)),
  AssociateModel.create(associateFixture("pending@e2e.obaol.test", "E2E Pending", "BUY", buyerCompany, { registrationStatus: "PENDING_REVIEW" })),
  AssociateModel.create(associateFixture("rejected@e2e.obaol.test", "E2E Rejected", "BUY", buyerCompany, { registrationStatus: "REJECTED", reviewNotes: "E2E rejection" })),
]);

const operator = await OperatorModel.create({
  name: "E2E Operator",
  email: "operator@e2e.obaol.test",
  phone: "+919400001001",
  password,
  address: "Isolated E2E fixture",
  role: "operator",
  onboardingComplete: true,
  registrationStatus: "APPROVED",
  isEmailVerified: true,
});
await OperatorModel.create({
  name: "E2E Team",
  email: "team@e2e.obaol.test",
  phone: "+919400001002",
  password,
  address: "Isolated E2E fixture",
  role: "team",
  mentorOperator: operator._id,
  onboardingComplete: true,
  registrationStatus: "APPROVED",
  isEmailVerified: true,
});
sellerCompany.assignedOperator = operator._id;
await sellerCompany.save();
await AdminModel.create({ name: "E2E Admin", email: "admin@e2e.obaol.test", password, isSuperAdmin: true });

const server = app.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ event: "e2e_backend_ready", port, runId }));
});

let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (mongoose.connection.db) await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await mongo.stop();
};

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => void close().finally(() => process.exit(0)));
}
};

void main().catch((error) => {
  console.error("E2E fixture server failed", error);
  process.exit(1);
});
