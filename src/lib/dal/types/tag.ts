import type { PBRecord } from "../client.ts";

/**
 * Tag — a normalized, reusable post tag. Enables routes like /tags/{slug}.
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

/** Raw PocketBase record for `tags` (before mapping). */
export interface TagRecord extends PBRecord {
  name?: unknown;
  slug?: unknown;
}