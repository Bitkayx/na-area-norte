import type { Category } from "./category.ts";
import type { PBRecord } from "../client.ts";

/**
 * Literature — a catalog item (book/product). `code` is nullable and not
 * unique because generic family codes may be shared. Stock is optional; the
 * migrated V1 quantity is mapped to stock, defaulting to 1 when absent. Total
 * is derived and never stored in PocketBase.
 */
export interface Literature {
  id: string;
  code: string | null;
  title: string;
  price: number;
  stock?: number;
  total: number;
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
  stock?: unknown;
  isActive?: unknown;
  category?: unknown;
}
