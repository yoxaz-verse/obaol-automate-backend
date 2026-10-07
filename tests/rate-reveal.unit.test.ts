import { describe, expect, it } from "vitest";
import { RateRevealEventModel } from "../src/database/models/rateRevealEvent";
import { InquiryModel } from "../src/database/models/enquiry";

describe("rate reveal persistence contracts", () => {
  it("deduplicates a viewer's reveal within one listing session", () => {
    const indexes = RateRevealEventModel.schema.indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      expect.arrayContaining([
        { variantRate: 1, viewerId: 1, sessionId: 1 },
        expect.objectContaining({ unique: true }),
      ]),
    ]));
  });

  it("stores past-listing reconfirmation metadata on enquiries", () => {
    expect(InquiryModel.schema.path("sourceListingWasPast")).toBeTruthy();
    expect(InquiryModel.schema.path("pricingConfirmationRequired")).toBeTruthy();
    expect(InquiryModel.schema.path("historicalListedPrice")).toBeTruthy();
    expect(InquiryModel.schema.path("sourceProductVariantId")).toBeTruthy();
  });
});
