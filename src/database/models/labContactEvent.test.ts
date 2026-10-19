import { describe, expect, it } from "vitest";
import { LAB_CONTACT_CHANNELS, LabContactEventModel } from "./labContactEvent";
import { LabProfileModel } from "./labProfile";

describe("multi-lab persistence", () => {
  it("allows multiple lab profiles for one company", () => {
    const indexes = LabProfileModel.schema.indexes();
    expect(indexes.some(([fields, options]) => fields.companyId === 1 && options.unique === true)).toBe(false);
    expect(indexes.some(([fields]) => fields.companyId === 1 && fields.updatedAt === -1)).toBe(true);
  });

  it("deduplicates contact interest per lab, actor, role and channel", () => {
    expect(LAB_CONTACT_CHANNELS).toEqual(["PHONE", "WHATSAPP", "EMAIL"]);
    const indexes = LabContactEventModel.schema.indexes();
    expect(indexes.some(([fields, options]) => fields.labProfileId === 1 && fields.actorId === 1 && fields.actorRole === 1 && fields.channel === 1 && options.unique === true)).toBe(true);
  });
});
