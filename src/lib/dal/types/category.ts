import type { PBRecord } from "../client.ts";

/**
 * Category — normalization of the inventory categories (9 in V1).
 */
export interface Category {
  id: string;
  name: string;
  sort: number;
}

/** Raw PocketBase record for `categories` (before mapping). */
export interface CategoryRecord extends PBRecord {
  name?: unknown;
  sort?: unknown;
}