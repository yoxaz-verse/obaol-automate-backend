import { Response } from "express";

type StreamClient = {
  id: string;
  response: Response;
  heartbeat: NodeJS.Timeout;
};

class NotificationStreamService {
  private clients = new Map<string, Map<string, StreamClient>>();

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
    const payload = JSON.stringify(notification?.toObject ? notification.toObject() : notification);
    this.clients.get(userId)?.forEach(({ response }) => {
      response.write(`event: notification\ndata: ${payload}\n\n`);
    });
  }
}

export const notificationStreamService = new NotificationStreamService();
