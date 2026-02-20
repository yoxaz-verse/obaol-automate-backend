/**
 * Inquiry State Machine
 * Enforces deterministic state transitions for inquiry lifecycle
 */

export enum InquiryStatus {
    NEW = "NEW",
    CONTACTED = "CONTACTED",
    IN_DISCUSSION = "IN_DISCUSSION",
    QUOTE_REQUIRED = "QUOTE_REQUIRED",
    CLOSED = "CLOSED",
    CANCELLED = "CANCELLED"
}

/**
 * Allowed state transitions
 * Each key represents the current state, and the value is an array of allowed next states
 */
const STATE_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
    [InquiryStatus.NEW]: [InquiryStatus.CONTACTED, InquiryStatus.CANCELLED],
    [InquiryStatus.CONTACTED]: [InquiryStatus.IN_DISCUSSION, InquiryStatus.CANCELLED],
    [InquiryStatus.IN_DISCUSSION]: [
        InquiryStatus.QUOTE_REQUIRED,
        InquiryStatus.CLOSED,
        InquiryStatus.CANCELLED
    ],
    [InquiryStatus.QUOTE_REQUIRED]: [InquiryStatus.CLOSED, InquiryStatus.CANCELLED],
    [InquiryStatus.CLOSED]: [], // Terminal state
    [InquiryStatus.CANCELLED]: [] // Terminal state
};

/**
 * Validates if a state transition is allowed
 * @param currentState - Current inquiry status
 * @param nextState - Desired next status
 * @returns true if transition is valid, false otherwise
 */
export function validateInquiryTransition(
    currentState: InquiryStatus,
    nextState: InquiryStatus
): boolean {
    // Allow staying in the same state (no-op)
    if (currentState === nextState) {
        return true;
    }

    const allowedTransitions = STATE_TRANSITIONS[currentState];
    return allowedTransitions.includes(nextState);
}

/**
 * Gets allowed next states for a given current state
 * @param currentState - Current inquiry status
 * @returns Array of allowed next states
 */
export function getAllowedTransitions(currentState: InquiryStatus): InquiryStatus[] {
    return STATE_TRANSITIONS[currentState] || [];
}

/**
 * Validates if a status string is a valid InquiryStatus
 * @param status - Status string to validate
 * @returns true if valid, false otherwise
 */
export function isValidInquiryStatus(status: string): status is InquiryStatus {
    return Object.values(InquiryStatus).includes(status as InquiryStatus);
}

/**
 * Error class for invalid state transitions
 */
export class InvalidTransitionError extends Error {
    constructor(currentState: InquiryStatus, nextState: InquiryStatus) {
        super(
            `Invalid inquiry state transition: ${currentState} → ${nextState}. ` +
            `Allowed transitions from ${currentState}: ${STATE_TRANSITIONS[currentState].join(", ")}`
        );
        this.name = "InvalidTransitionError";
    }
}
