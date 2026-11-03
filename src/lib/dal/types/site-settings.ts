import type { PBRecord } from "../client.ts";

/** Social media links: a map of platform name → URL. */
export interface SocialLinks {
  [platform: string]: string | null;
}

/** Hero / banner configuration (promo or upcoming-event mode). */
export interface Hero {
  titulo?: string;
  slug?: string;
  /** Public image URL for promo mode. */
  imagen?: string;
  subtitulo?: string;
  /** Event mode fields: */
  fecha?: string;
  ubicacion?: string;
  fechaEvento?: string;
}

/** Additional SEO / Open Graph / Twitter metadata. */
export interface Seo {
  ogImage?: string;
  twitterCard?: string;
  keywords?: string;
  [key: string]: unknown;
}

/** A single navigation menu entry. */
export interface NavigationItem {
  label: string;
  href: string;
  isActive?: boolean;
}

/** Optional next literature inventory announcement configured by site admins. */
export interface LiteratureInventory {
  /** Local calendar date in YYYY-MM-DD format. */
  date: string;
  /** Optional local time in HH:mm format. */
  time: string | null;
  /** Current participating districts; Área Norte is represented separately. */
  districts: number[];
  areaNorte: boolean;
}

/** Weekly literature sales hours, with ISO weekdays (Monday=1, Sunday=7). */
export interface LiteratureSalesSchedule {
  days: number[];
  startTime: string;
  endTime: string;
}

/** Operational settings for literature; each section may be left unconfigured. */
export interface LiteratureSettings {
  nextInventory: LiteratureInventory | null;
  salesSchedule: LiteratureSalesSchedule | null;
}

/**
 * SiteSettings — global site configuration (singleton, one record).
 * Maps the 5 JSON fields (socialLinks, hero, seo, navigation) plus scalars.
 */
export interface SiteSettings {
  id: string;
  siteName: string;
  description: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  mapEmbedUrl: string | null;
  /** Public logo URL; null when absent. */
  logoUrl: string | null;
  socialLinks: SocialLinks;
  hero: Hero | null;
  seo: Seo;
  navigation: NavigationItem[];
  literature: LiteratureSettings | null;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `site_settings` (before mapping). */
export interface SiteSettingsRecord extends PBRecord {
  siteName?: unknown;
  description?: unknown;
  addressLine?: unknown;
  phone?: unknown;
  email?: unknown;
  mapEmbedUrl?: unknown;
  logo?: unknown;
  socialLinks?: unknown;
  hero?: unknown;
  seo?: unknown;
  navigation?: unknown;
  literature?: unknown;
}
