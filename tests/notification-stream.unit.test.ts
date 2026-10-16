import { describe, expect, it, vi } from "vitest";
import { notificationStreamService } from "../src/services/notificationStreamService";
import request from "supertest";
import app from "../src/app";

describe("Notification stream service", () => {
  it("rejects unauthenticated stream connections", async () => {
    const response = await request(app).get("/api/v1/web/notifications/stream");
    expect(response.status).toBe(401);
  });

  it("publishes a notification only to connections for its recipient", () => {
    const sellerWrite = vi.fn();
    const otherWrite = vi.fn();
    const unsubscribeSeller = notificationStreamService.subscribe("seller-id", { write: sellerWrite } as any);
    const unsubscribeOther = notificationStreamService.subscribe("other-id", { write: otherWrite } as any);
    sellerWrite.mockClear();
    otherWrite.mockClear();

    notificationStreamService.publish({ _id: "notification-id", recipientUserId: "seller-id", title: "New enquiry received" });

    expect(sellerWrite).toHaveBeenCalledTimes(1);
    expect(sellerWrite.mock.calls[0][0]).toContain("event: notification");
    expect(sellerWrite.mock.calls[0][0]).toContain("notification-id");
    expect(otherWrite).not.toHaveBeenCalled();
    unsubscribeSeller();
    unsubscribeOther();
  });
});
