import type { AppError } from './AppError.tsx';

// GraphQL error classifications (from `extensions.classification`) that mean the request
// itself was bad. For these, the server's message describes something the user can act on
// (e.g. "carpool trip is already expired at write time…"), so it is safe and useful to show
// verbatim. Anything else — INTERNAL_ERROR, NETWORK_ERROR, an unmapped fault — is a
// server/transport problem whose raw message is masked or unhelpful, so callers fall back to
// a generic, localized message instead.
const CLIENT_ERROR_CODES = new Set(['BAD_REQUEST', 'FORBIDDEN', 'UNAUTHORIZED', 'NOT_FOUND']);

export const isClientError = (error?: AppError): boolean =>
  !!error?.code && CLIENT_ERROR_CODES.has(error.code);

// The server's descriptive message for client errors; the caller's generic fallback otherwise.
export const userFacingMessage = (error: AppError, fallback: string): string =>
  (isClientError(error) && error.message) || fallback;
