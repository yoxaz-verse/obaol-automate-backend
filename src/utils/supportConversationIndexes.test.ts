import { describe, expect, it, vi } from "vitest";
import { repairSupportConversationIndexes } from "./supportConversationIndexes";

describe("repairSupportConversationIndexes", () => {
  it("finds and removes only the legacy one-open-conversation index", async () => {
    const collection = {
      indexes: vi.fn().mockResolvedValue([
        { name: "_id_", key: { _id: 1 }, unique: true },
        { name: "requesterId_1", key: { requesterId: 1 }, unique: true, partialFilterExpression: { isOpen: true } },
        { name: "requester_history", key: { requesterId: 1, lastMessageAt: -1 } },
      ]),
      dropIndex: vi.fn(),
    };

    const dryRun = await repairSupportConversationIndexes(collection, false);
    expect(dryRun.legacyIndexes).toEqual(["requesterId_1"]);
    expect(collection.dropIndex).not.toHaveBeenCalled();

    const applied = await repairSupportConversationIndexes(collection, true);
    expect(applied.droppedIndexes).toEqual(["requesterId_1"]);
    expect(collection.dropIndex).toHaveBeenCalledWith("requesterId_1");
  });
});
