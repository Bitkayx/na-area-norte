import type { Tag } from "./tag.ts";
import type { Event } from "./event.ts";
import type { PBRecord } from "../client.ts";

export type PostStatus = "published" | "draft" | "archived";

/**
 * Post — a communication/news item published by Área Norte.
 */
export interface Post {
  id: string;
  title: string;
  slug: string;
  description: string;
  author: string | null;
  pubDate: Date | null;
  /** Public cover URL; null when absent. */
  coverUrl: string | null;
  /** Body content (editor / Markdown). */
  body: string | null;
  status: PostStatus;
  /** PB record ids of the related tags (M2M). */
  tagIds: string[];
  /** Populated tags when requested with `expand=tags`. */
  tags: Tag[];
  /** PB record id of the related event, if any. */
  eventId: string | null;
  /** Populated only when requested with `expand=event`. */
  event?: Event;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `posts` (before mapping). */
export interface PostRecord extends PBRecord {
  title?: unknown;
  slug?: unknown;
  description?: unknown;
  author?: unknown;
  pubDate?: unknown;
  cover?: unknown;
  body?: unknown;
  status?: unknown;
  tags?: unknown;
  event?: unknown;
}