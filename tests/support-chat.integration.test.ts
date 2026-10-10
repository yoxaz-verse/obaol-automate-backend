import request from "supertest";
import app from "../src/app";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { CustomerSupportAgentModel } from "../src/database/models/customerSupportAgent";
import { SupportConversationModel } from "../src/database/models/supportConversation";
import { createAdmin, createAssociate, createCustomerSupportAgent } from "./helpers/authFixtures";

const api = request(app);
const tokenFor = (user: any, role: string) => generateJWTToken({ ...user.toObject(), role } as any, "1h");

describe("Customer support chat", () => {
  it("returns field-level errors for invalid and duplicate support-agent accounts", async () => {
    const admin = await createAdmin();
    const token = tokenFor(admin, "Admin");
    const invalid = await api.post("/api/v1/web/customer-support-agents")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", email: "not-an-email", password: "short" });
    expect(invalid.status).toBe(400);
    expect(invalid.body?.errors).toEqual({
      name: "Name is required.",
      email: "Enter a valid email address.",
      password: "Password must contain at least 8 characters.",
    });

    const associate = await createAssociate();
    const crossRole = await api.post("/api/v1/web/customer-support-agents")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Help Agent", email: associate.email, password: "Passw0rd!" });
    expect(crossRole.status).toBe(409);
    expect(crossRole.body?.errors?.email).toContain("another OBAOL account");

    const created = await api.post("/api/v1/web/customer-support-agents")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Help Agent", email: "visible-errors@example.com", password: "Passw0rd!" });
    expect(created.status).toBe(201);
    const duplicate = await api.post("/api/v1/web/customer-support-agents")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Another Agent", email: "visible-errors@example.com", password: "Passw0rd!" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body?.errors?.email).toContain("already uses this email");

    const credentialReset = await api.patch(`/api/v1/web/customer-support-agents/${created.body.data._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ password: "short" });
    expect(credentialReset.status).toBe(400);
    expect(credentialReset.body?.errors?.password).toContain("at least 8 characters");
  });

  it("lets an admin create a support agent that can sign in and report presence", async () => {
    const admin = await createAdmin();
    const created = await api.post("/api/v1/web/customer-support-agents")
      .set("Authorization", `Bearer ${tokenFor(admin, "Admin")}`)
      .send({ name: "Help Agent", email: "help@example.com", phone: "+919999111222", password: "Passw0rd!" });
    expect(created.status).toBe(201);
    expect(created.body?.data).not.toHaveProperty("password");

    const login = await api.post("/api/v1/web/login").send({ email: "help@example.com", password: "Passw0rd!", role: "CustomerSupport" });
    expect(login.status).toBe(200);
    expect(login.body?.user?.role).toBe("CustomerSupport");

    const agent = await CustomerSupportAgentModel.findOne({ email: "help@example.com" });
    const ping = await api.post("/api/v1/web/presence/ping")
      .set("Authorization", `Bearer ${tokenFor(agent, "CustomerSupport")}`)
      .send({});
    expect(ping.status).toBe(200);
    expect((await CustomerSupportAgentModel.findById(agent!._id).lean())?.lastSeenAt).toBeTruthy();
  });

  it("queues one open conversation, atomically claims it, and enforces participant access", async () => {
    await SupportConversationModel.syncIndexes();
    const requester = await createAssociate();
    const stranger = await createAssociate();
    const agent = await createCustomerSupportAgent({ isAvailable: true, lastSeenAt: new Date() });
    const requesterToken = tokenFor(requester, "Associate");
    const agentToken = tokenFor(agent, "CustomerSupport");

    const created = await api.post("/api/v1/web/support/conversations")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ subject: "Order help", message: "Please help with my order." });
    expect(created.status).toBe(201);
    const id = created.body?.data?._id;

    const duplicate = await api.post("/api/v1/web/support/conversations")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ subject: "Another", message: "Second request" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body?.data?._id).toBe(id);

    const [firstClaim, secondClaim] = await Promise.all([
      api.post(`/api/v1/web/support/conversations/${id}/claim`).set("Authorization", `Bearer ${agentToken}`).send({}),
      api.post(`/api/v1/web/support/conversations/${id}/claim`).set("Authorization", `Bearer ${agentToken}`).send({}),
    ]);
    expect([firstClaim.status, secondClaim.status].sort()).toEqual([200, 409]);

    const strangerMessages = await api.get(`/api/v1/web/support/conversations/${id}/messages`)
      .set("Authorization", `Bearer ${tokenFor(stranger, "Associate")}`);
    expect(strangerMessages.status).toBe(403);

    const reply = await api.post(`/api/v1/web/support/conversations/${id}/messages`)
      .set("Authorization", `Bearer ${agentToken}`).send({ body: "I am checking this now." });
    expect(reply.status).toBe(201);

    const resolved = await api.post(`/api/v1/web/support/conversations/${id}/resolve`)
      .set("Authorization", `Bearer ${requesterToken}`).send({});
    expect(resolved.status).toBe(200);
    expect(resolved.body?.data?.status).toBe("RESOLVED");

    const reopened = await api.post(`/api/v1/web/support/conversations/${id}/reopen`)
      .set("Authorization", `Bearer ${requesterToken}`).send({});
    expect(reopened.status).toBe(200);
    expect(reopened.body?.data?.status).toBe("WAITING");
  });

  it("limits an agent to three chats and requeues stale assignments", async () => {
    const agent = await createCustomerSupportAgent({ isAvailable: true, lastSeenAt: new Date() });
    const agentToken = tokenFor(agent, "CustomerSupport");
    const conversations: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      const requester = await createAssociate();
      const response = await api.post("/api/v1/web/support/conversations")
        .set("Authorization", `Bearer ${tokenFor(requester, "Associate")}`)
        .send({ subject: `Help ${index}`, message: `Message ${index}` });
      conversations.push(response.body?.data?._id);
    }
    for (const id of conversations.slice(0, 3)) {
      expect((await api.post(`/api/v1/web/support/conversations/${id}/claim`).set("Authorization", `Bearer ${agentToken}`).send({})).status).toBe(200);
    }
    expect((await api.post(`/api/v1/web/support/conversations/${conversations[3]}/claim`).set("Authorization", `Bearer ${agentToken}`).send({})).status).toBe(409);

    await CustomerSupportAgentModel.updateOne({ _id: agent._id }, { $set: { isAvailable: false, availabilityUpdatedAt: new Date() } });
    const availability = await api.get("/api/v1/web/support/availability").set("Authorization", `Bearer ${agentToken}`);
    expect(availability.body?.data).toMatchObject({ online: false, availableAgentCount: 0, onlineAgentCount: 1 });
    expect(await SupportConversationModel.countDocuments({ assignedAgent: agent._id, status: "ACTIVE" })).toBe(0);
    expect(await SupportConversationModel.countDocuments({ status: "WAITING" })).toBe(4);
  });
});
