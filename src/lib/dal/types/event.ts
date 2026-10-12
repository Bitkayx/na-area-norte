import type { Location } from "./location.ts";
import type { Post } from "./post.ts";
import type { PBRecord } from "../client.ts";

export type EventType =
  | "encuentro"
  | "mave"
  | "congreso"
  | "asamblea"
  | "invitacion"
  | "otro";

export type EventStatus = "active" | "cancelled" | "archived";

/**
 * Event — an independent domain entity (separate from Post) allowing
 * date/location/status queries. Modeled but NOT yet populated.
 */
export interface Event {
  id: string;
  title: string;
  slug: string;
  type: EventType | null;
  startDate: Date | null;
  endDate: Date | null;
  location: Location | null;
  organizerName: string | null;
  description: string | null;
  program: string | null;
  /** Public image URL; null when absent. */
  imageUrl: string | null;
  status: EventStatus;
  /** PB record id of the related Post, if any (traceability). */
  postRefId: string | null;
  /** Populated only when requested with `expand=postRef`. */
  postRef?: Post;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `events` (before mapping). */
export interface EventRecord extends PBRecord {
  title?: unknown;
  slug?: unknown;
  type?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  location?: unknown;
  organizerName?: unknown;
  description?: unknown;
  program?: unknown;
  image?: unknown;
  status?: unknown;
  postRef?: unknown;
}