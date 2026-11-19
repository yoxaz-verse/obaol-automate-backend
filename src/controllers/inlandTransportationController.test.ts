import { describe, expect, it } from "vitest";
import { coarseCoordinate, complianceValid, maskRegistration, publicVehicle } from "./inlandTransportationController";

describe("public truck privacy", () => {
  it("masks registration and rounds exact coordinates to a coarse grid", () => {
    const row: any = publicVehicle({ _id: "507f1f77bcf86cd799439011", registrationNumber: "KL 07 AB 1234", publicAlias: "Green Hauler 12", manufacturer: "Tata", model: "Prima", vehicleType: "Truck", capacity: 20, capacityUnit: "MT", ownership: "OWNED", status: "AVAILABLE", supportedCargo: [], companyId: { _id: "507f1f77bcf86cd799439012", name: "Carrier" }, baseLocation: { city: "Kochi" }, latestPosition: { latitude: 9.93123, longitude: 76.2673, recordedAt: new Date() } }, { contactPhone: "123" });
    expect(row.registrationSuffix).toBe("••••1234");
    expect(row).not.toHaveProperty("registrationNumber");
    expect(row.approximateLocation).toMatchObject({ latitude: coarseCoordinate(9.93123), longitude: coarseCoordinate(76.2673) });
    expect(row.approximateLocation.latitude).not.toBe(9.93123);
  });
  it("requires at least one compliance date and rejects any expired supplied date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(complianceValid({}, now)).toBe(false);
    expect(complianceValid({ compliance: { insuranceExpiresAt: "2027-01-01" } }, now)).toBe(true);
    expect(complianceValid({ compliance: { insuranceExpiresAt: "2027-01-01", permitExpiresAt: "2025-01-01" } }, now)).toBe(false);
  });
  it("keeps a public truck displayable when its approximate location is unavailable", () => {
    const row: any = publicVehicle({ _id: "507f1f77bcf86cd799439011", registrationNumber: "KL 07 AB 1234", publicAlias: "Green Hauler 12", vehicleType: "Truck", capacity: 20, capacityUnit: "MT", status: "AVAILABLE", companyId: { _id: "507f1f77bcf86cd799439012", name: "Carrier" } }, {});
    expect(row.publicAlias).toBe("Green Hauler 12");
    expect(row.approximateLocation).toBeNull();
  });
});
