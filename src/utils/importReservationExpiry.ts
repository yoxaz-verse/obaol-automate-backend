export const IMPORT_RESERVATION_REVIEW_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

export const getImportReservationExpiryCutoff = (now = new Date()) =>
  new Date(now.getTime() - IMPORT_RESERVATION_REVIEW_WINDOW_MS);

export const isPendingImportReservationExpired = (
  reservation: { status?: unknown; reservationStatus?: unknown; updatedAt?: Date | string | null },
  now = new Date()
) => {
  const status = String(reservation.reservationStatus || reservation.status || "").toUpperCase();
  const updatedAt = reservation.updatedAt ? new Date(reservation.updatedAt) : null;
  return status === "PENDING" && !!updatedAt && !Number.isNaN(updatedAt.getTime()) && updatedAt <= getImportReservationExpiryCutoff(now);
};
