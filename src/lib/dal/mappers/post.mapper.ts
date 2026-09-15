import type { Post, PostRecord } from "../types/post.ts";
import type { EventRecord } from "../types/event.ts";
import { mapEvent } from "./event.mapper.ts";
import { resolveFile } from "../client.ts";

const STATUSES = ["published", "draft", "archived"] as const;

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

function statusOf(v: unknown): Post["status"] {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v)
    ? (v as Post["status"])
    : "draft";
}

function tagIds(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  return [];
}

/** Maps a raw `posts` record into a domain Post. */
export function mapPost(r: PostRecord): Post {
  const post: Post = {
    id: r.id,
    title: text(r.title),
    slug: text(r.slug),
    description: text(r.description),
    author: nullableText(r.author),
    pubDate: toDate(r.pubDate),
    coverUrl: resolveFile(r as import("../client.ts").PBRecord, r.cover),
    body: nullableText(r.body),
    status: statusOf(r.status),
    tagIds: tagIds(r.tags),
    tags: [],
    eventId: typeof r.event === "string" ? r.event : null,
    created: r.created,
    updated: r.updated,
  };

  // M2M expansion: PocketBase puts expanded relations under a top-level
  // `expand` object. `expand.tags` is an ARRAY of expanded Tag objects.
  const expandObj =
    r.expand && typeof r.expand === "object" ? (r.expand as Record<string, unknown>) : undefined;
  const expandedTags = expandObj && (expandObj.tags as Array<Record<string, unknown>> | undefined);
  if (Array.isArray(expandedTags)) {
    post.tags = expandedTags.map((t) => ({
      id: text(t.id),
      name: text(t.name),
      slug: text(t.slug),
    }));
  }

  // Single-relation expansion: `expand.event` is a single expanded Event object.
  const expEvent = expandObj && (expandObj.event as Record<string, unknown> | undefined);
  if (expEvent && typeof expEvent === "object" && "id" in expEvent) {
    post.event = mapEvent(expEvent as unknown as EventRecord);
  }

  return post;
}