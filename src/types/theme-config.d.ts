import type { ThemeOptions } from '@mui/material/styles';

export interface ThemeConfig extends ThemeOptions {
  logoUrl: string;
  //add your own custom additions here.
}

declare module '@mui/material/styles' {
  interface Theme {
    /** URL from your config.json */
    logoUrl: string;
    // add more custom fields here later, e.g. faviconUrl: string
  }
  interface ThemeOptions {
    /** Optional at creation time */
    logoUrl?: string;
    // and faviconUrl?: string, etc.
  }
}
