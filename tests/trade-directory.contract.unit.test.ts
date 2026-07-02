import { eligibleCoveragePipeline, groupedCommodityStages } from "../src/controllers/tradeDirectoryController";

describe("Associate Trade Directory contract", () => {
  it("requires live, non-demo, verified Associate and approved-company coverage", () => {
    const pipeline = JSON.stringify(eligibleCoveragePipeline());
    expect(pipeline).toContain('"isLive":true');
    expect(pipeline).toContain('"isDemo":{"$ne":true}');
    expect(pipeline).toContain('"associateDoc.registrationStatus":"APPROVED"');
    expect(pipeline).toContain('"associateDoc.isCompanyVerified":true');
    expect(pipeline).toContain('"companyDoc.registrationStatus":"APPROVED"');
    expect(pipeline).toContain('"companyDoc.isApproved":true');
  });

  it("returns aggregate coverage without rates or Associate identities", () => {
    const projection = JSON.stringify(groupedCommodityStages());
    expect(projection).toContain('"activeListingCount"');
    expect(projection).toContain('"activeAssociateCount"');
    expect(projection).toContain('"lastPublishedAt"');
    expect(projection).not.toContain('"rate"');
    expect(projection).not.toContain('"companyDoc"');
    expect(projection).not.toContain('"associateDoc"');
  });
});
