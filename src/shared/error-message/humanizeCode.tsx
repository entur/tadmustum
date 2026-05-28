// Human-readable labels for error codes that the default title-casing
// wouldn't convey clearly. Server-side codes come from GraphQL extensions —
// `FORBIDDEN` is Spring Security's mapping for @PreAuthorize denials.
const FRIENDLY_LABELS: Record<string, string> = {
  FORBIDDEN: 'Permission denied',
  UNAUTHORIZED: 'Not signed in',
  ACCESS_DENIED: 'Permission denied',
};

export const humanizeCode = (code: string) =>
  FRIENDLY_LABELS[code] ??
  code.charAt(0).toUpperCase() + code.slice(1).toLowerCase().replace(/_/g, ' ');
