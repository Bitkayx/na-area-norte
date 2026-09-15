import type { Category } from "./category.ts";
import type { PBRecord } from "../client.ts";

/**
 * Literature — a catalog item (book/product). `code` is nullable and NOT
 * unique until duplicate/generic codes are resolved by human review; `total`
 * from V1 is derived and MUST NOT be migrated.
 */
export interface Literature {
  id: string;
  code: string | null;
  title: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  /** Populated only when requested with `expand=category`. */
  category?: Category;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `literature` (before mapping). */
export interface LiteratureRecord extends PBRecord {
  code?: unknown;
  title?: unknown;
  price?: unknown;
  isActive?: unknown;
  category?: unknown;
}