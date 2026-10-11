import request from "supertest";
import app from "../src/app";
import { generateJWTToken } from "../src/utils/tokenUtils";
import { CustomerSupportAgentModel } from "../src/database/models/customerSupportAgent";
import { SupportConversationModel } from "../src/database/models/supportConversation";
import { NotificationModel } from "../src/database/models/notification";
import { SupportRatingModel } from "../src/database/models/supportRating";
import { createAdmin, createAssociate, createCustomerSupportAgent } from "./helpers/authFixtures";

const api = request(app);
const tokenFor = (user: any, role: string) => generateJWTToken({ ...user.toObject(), role } as any, "1h");

describe("Customer support chat", () => {
  it("accepts one requester rating and keeps agent reports anonymous", async () => {
    await SupportRatingModel.syncIndexes();
    const admin = await createAdmin();
    const requester = await createAssociate();
    const stranger = await createAssociate();
    const agent = await createCustomerSupportAgent();
    const conversation = await SupportConversationModel.create({
      requesterId: requester._id,
      requesterRole: "Associate",
      subject: "Rate this support",
      status: "ACTIVE",
      isOpen: true,
      assignedAgent: agent._id,
      claimedAt: new Date(),
    });
    const requesterToken = tokenFor(requester, "Associate");

    const beforeResolve = await api.post(`/api/v1/web/support/conversations/${conversation._id}/rating`)
      .set("Authorization", `Bearer ${requesterToken}`).send({ score: 5 });
    expect(beforeResolve.status).toBe(409);

    await SupportConversationModel.updateOne({ _id: conversation._id }, { $set: { status: "RESOLVED", isOpen: false, resolvedAt: new Date(), reopenUntil: new Date(Date.now() + 60_000) } });
    const invalid = await api.post(`/api/v1/web/support/conversations/${conversation._id}/rating`)
      .set("Authorization", `Bearer ${requesterToken}`).send({ score: 6, comment: "No" });
    expect(invalid.status).toBe(400);
    const forbidden = await api.post(`/api/v1/web/support/conversations/${conversation._id}/rating`)
      .set("Authorization", `Bearer ${tokenFor(stranger, "Associate")}`).send({ score: 5 });
    expect(forbidden.status).toBe(403);

    const submissions = await Promise.all([
      api.post(`/api/v1/web/support/conversations/${conversation._id}/rating`).set("Authorization", `Bearer ${requesterToken}`).send({ score: 5, comment: "Very helpful" }),
      api.post(`/api/v1/web/support/conversations/${conversation._id}/rating`).set("Authorization", `Bearer ${requesterToken}`).send({ score: 4, comment: "Also helpful" }),
    ]);
    expect(submissions.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await SupportRatingModel.countDocuments({ conversationId: conversation._id })).toBe(1);
    const savedRating = await SupportRatingModel.findOne({ conversationId: conversation._id }).lean();
    const savedScore = Number(savedRating?.score);

    const requesterList = await api.get("/api/v1/web/support/conversations").set("Authorization", `Bearer ${requesterToken}`);
    expect(requesterList.body.data[0].rating.score).toBe(savedScore);

    const mine = await api.get("/api/v1/web/support/ratings/me").set("Authorization", `Bearer ${tokenFor(agent, "CustomerSupport")}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.summary.averageScore).toBe(savedScore);
    expect(mine.body.data.summary.totalRatings).toBe(1);
    expect(mine.body.data.summary.distribution[String(savedScore)]).toBe(1);
    expect(mine.body.data.ratings[0]).not.toHaveProperty("requesterId");
    expect(mine.body.data.ratings[0]).not.toHaveProperty("conversationId");

    const adminReport = await api.get(`/api/v1/web/support/ratings?agentId=${agent._id}&score=${savedScore}`)
      .set("Authorization", `Bearer ${tokenFor(admin, "Admin")}`);
    expect(adminReport.status).toBe(200);
    expect(adminReport.body.data.ratings[0].requester).toMatchObject({ id: String(requester._id), email: requester.email });

    const reopened = await api.post(`/api/v1/web/support/conversations/${conversation._id}/reopen`)
      .set("Authorization", `Bearer ${requesterToken}`).send({});
    expect(reopened.status).toBe(200);
    expect(await SupportRatingModel.countDocuments({ conversationId: conversation._id })).toBe(1);
    expect(await NotificationModel.countDocuments({ recipientUserId: agent._id, type: "SUPPORT_RATING_RECEIVED" })).toBe(1);
  });

  it("rejects ratings for resolved conversations without an assigned agent", async () => {
    const requester = await createAssociate();
    const conversation = await SupportConversationModel.create({ requesterId: requester._id, requesterRole: "Associate", subject: "No assigned agent", status: "RESOLVED", isOpen: false, resolvedAt: new Date() });
    const response = await api.post(`/api/v1/web/support/conversations/${conversation._id}/rating`)
      .set("Authorization", `Bearer ${tokenFor(requester, "Associate")}`).send({ score: 3 });
    expect(response.status).toBe(409);
  });

  it("lets support create categories and notify only verified support participants", async () => {
    const admin = await createAdmin();
    const requester = await createAssociate();
    const stranger = await createAssociate();
    const agent = await createCustomerSupportAgent();
    const adminToken = tokenFor(admin, "Admin");
    const agentToken = tokenFor(agent, "CustomerSupport");

    await SupportConversationModel.create({ requesterId: requester._id, requesterRole: "Associate", subject: "Account help" });

    const category = await api.post("/api/v1/web/notification-categories")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ name: "Support update", description: "Updates from the support team" });
    expect(category.status).toBe(201);

    const duplicate = await api.post("/api/v1/web/notification-categories")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ name: " support UPDATE " });
    expect(duplicate.status).toBe(409);

    const forbiddenEdit = await api.patch(`/api/v1/web/notification-categories/${category.body.data._id}`)
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ name: "Renamed" });
    expect(forbiddenEdit.status).toBe(403);

    const participants = await api.get("/api/v1/web/notifications/support-participants")
      .set("Authorization", `Bearer ${agentToken}`);
    expect(participants.status).toBe(200);
    expect(participants.body.data.map((row: any) => row.id)).toContain(String(requester._id));
    expect(participants.body.data.map((row: any) => row.id)).not.toContain(String(stranger._id));

    const forged = await api.post("/api/v1/web/notifications/broadcast")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ title: "Hello", message: "An update", recipientUserIds: [String(stranger._id)] });
    expect(forged.status).toBe(403);

    const sent = await api.post("/api/v1/web/notifications/broadcast")
      .set("Authorization", `Bearer ${agentToken}`)
      .send({ title: "Hello", message: "An update", recipientUserIds: [String(requester._id)], categoryId: category.body.data._id });
    expect(sent.status).toBe(200);
    const notification = await NotificationModel.findOne({ recipientUserId: requester._id }).lean();
    expect(notification?.categoryName).toBe("Support update");

    const archived = await api.delete(`/api/v1/web/notification-categories/${category.body.data._id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.isActive).toBe(false);
    expect((await NotificationModel.findById(notification?._id).lean())?.categoryName).toBe("Support update");

    const restored = await api.patch(`/api/v1/web/notification-categories/${category.body.data._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Support update", description: "Updates from the support team", isActive: true });
    expect(restored.status).toBe(200);
    expect(restored.body.data.isActive).toBe(true);
  });

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
