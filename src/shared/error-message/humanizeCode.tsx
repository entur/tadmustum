export const humanizeCode = (code: string) =>
  code.charAt(0).toUpperCase() + code.slice(1).toLowerCase().replace(/_/g, ' ');
