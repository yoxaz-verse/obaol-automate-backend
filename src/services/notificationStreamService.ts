import { Response } from "express";
import { createClient, type RedisClientType } from "redis";

type StreamClient = {
  id: string;
  response: Response;
  heartbeat: NodeJS.Timeout;
};

class NotificationStreamService {
  private clients = new Map<string, Map<string, StreamClient>>();
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private readonly channel = "obaol:realtime:user-events";

  async connect() {
    const url = String(process.env.REDIS_URL || "").trim();
    if (!url) {
      console.warn("[realtime] REDIS_URL is not configured; SSE delivery is process-local.");
      return;
    }
    const publisher = createClient({ url });
    const subscriber = publisher.duplicate();
    publisher.on("error", (error) => console.error("[realtime] Redis publisher error:", error.message));
    subscriber.on("error", (error) => console.error("[realtime] Redis subscriber error:", error.message));
    try {
      await Promise.all([publisher.connect(), subscriber.connect()]);
      await subscriber.subscribe(this.channel, (raw) => {
        try {
          const message = JSON.parse(raw);
          this.publishLocal(String(message.userId || ""), String(message.event || "workflow-update"), message.data);
        } catch (error: any) {
          console.error("[realtime] Invalid Redis event:", error?.message || error);
        }
      });
      this.publisher = publisher as RedisClientType;
      this.subscriber = subscriber as RedisClientType;
      console.log("[realtime] Redis pub/sub connected.");
    } catch (error: any) {
      console.error("[realtime] Redis unavailable; using process-local SSE:", error?.message || error);
      await Promise.allSettled([
        subscriber.isOpen ? subscriber.disconnect() : Promise.resolve(),
        publisher.isOpen ? publisher.disconnect() : Promise.resolve(),
      ]);
    }
  }

  async disconnect() {
    await Promise.allSettled([
      this.subscriber?.quit() || Promise.resolve(),
      this.publisher?.quit() || Promise.resolve(),
    ]);
    this.subscriber = null;
    this.publisher = null;
  }

  subscribe(userId: string, response: Response) {
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const heartbeat = setInterval(() => {
      response.write(`event: heartbeat\ndata: {}\n\n`);
    }, 20_000);
    heartbeat.unref();

    const userClients = this.clients.get(userId) || new Map<string, StreamClient>();
    userClients.set(clientId, { id: clientId, response, heartbeat });
    this.clients.set(userId, userClients);
    response.write(`event: connected\ndata: {}\n\n`);
    response.write(`event: sync-required\ndata: {"reason":"connected"}\n\n`);

    return () => {
      clearInterval(heartbeat);
      const current = this.clients.get(userId);
      current?.delete(clientId);
      if (!current?.size) this.clients.delete(userId);
    };
  }

  publish(notification: any) {
    const userId = String(notification?.recipientUserId || "");
    if (!userId) return;
    void this.publishToUser(userId, "notification", notification?.toObject ? notification.toObject() : notification)
      .catch((error) => console.error("[realtime] Notification delivery failed:", error?.message || error));
  }

  async publishToUser(userId: string, event: string, data: any) {
    if (!userId) return;
    if (this.publisher?.isReady) {
      await this.publisher.publish(this.channel, JSON.stringify({ userId, event, data }));
      return;
    }
    this.publishLocal(userId, event, data);
  }

  private publishLocal(userId: string, event: string, data: any) {
    if (!userId) return;
    const payload = JSON.stringify(data);
    this.clients.get(userId)?.forEach(({ response }) => {
      response.write(`event: ${event}\ndata: ${payload}\n\n`);
    });
  }
}

export const notificationStreamService = new NotificationStreamService();
