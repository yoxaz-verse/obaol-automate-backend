export class TimeCalculations {
    /**
     * Calculates the duration in hours between two dates.
     * Throws error if endTime is before startTime.
     */
    static calculateDurationHours(startTime: Date, endTime: Date): number {
        if (endTime < startTime) {
            throw new Error("End time must be after start time");
        }
        return Math.abs(endTime.getTime() - startTime.getTime()) / 36e5;
    }

    /**
     * Updates the 'lastLiveAt' timestamp based on the 'isLive' status change.
     * Returns the new timestamp or null if no update is needed.
     */
    static determineLastLiveAt(
        isLive: boolean,
        currentLastLiveAt: Date | null
    ): Date | null {
        if (isLive && !currentLastLiveAt) {
            return new Date();
        }
        return null;
    }
}
