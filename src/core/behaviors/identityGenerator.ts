export class IdentityGenerator {
    /**
     * Formats a location's custom ID based on province and sequence number.
     * Format: MG-{PROVINCE}-{SEQUENCE}
     */
    static formatLocationId(province: string, sequence: number): string {
        const provinceKey = province.toUpperCase().trim();
        const sequenceNumber = sequence.toString().padStart(5, "0");
        return `MG-${provinceKey}-${sequenceNumber}`;
    }
}
