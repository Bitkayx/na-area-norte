import type { Event, EventRecord } from "../types/event.ts";
import type { PostRecord } from "../types/post.ts";
import { normalizeLocation } from "../types/location.ts";
import { mapPost } from "./post.mapper.ts";
import { resolveFile } from "../client.ts";

const TYPES = ["encuentro", "mave", "congreso", "asamblea", "invitacion", "otro"] as const;
const STATUSES = ["active", "cancelled", "archived"] as const;

function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function nullableText(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "string" ? v : String(v);
}

function toDate(v: unknown): Date | null {
  if (typeof v === "string" && v) return new Date(v);
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  return null;
}

function typeOf(v: unknown): Event["type"] {
  return typeof v === "string" && (TYPES as readonly string[]).includes(v)
    ? (v as Event["type"])
    : null;
}

function statusOf(v: unknown): Event["status"] {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v)
    ? (v as Event["status"])
    : "archived";
}

/** Maps a raw `events` record into a domain Event. */
export function mapEvent(r: EventRecord): Event {
  const event: Event = {
    id: r.id,
    title: text(r.title),
    slug: text(r.slug),
    type: typeOf(r.type),
    startDate: toDate(r.startDate),
    endDate: toDate(r.endDate),
    location: r.location ? normalizeLocation(r.location) : null,
    organizerName: nullableText(r.organizerName),
    description: nullableText(r.description),
    program: nullableText(r.program),
    imageUrl: resolveFile(r as import("../client.ts").PBRecord, r.image),
    status: statusOf(r.status),
    postRefId: typeof r.postRef === "string" ? r.postRef : null,
    created: r.created,
    updated: r.updated,
  };

  const expandObj =
    r.expand && typeof r.expand === "object" ? (r.expand as Record<string, unknown>) : undefined;
  const expPost = expandObj && (expandObj.postRef as Record<string, unknown> | undefined);
  if (expPost && typeof expPost === "object" && "id" in expPost) {
    event.postRef = mapPost(expPost as unknown as PostRecord);
  }

  return event;
}