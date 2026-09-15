import type { District, DistrictRecord } from "../types/district.ts";
import type { Group, GroupRecord } from "../types/group.ts";
import type { TagRecord } from "../types/tag.ts";
import type { CategoryRecord } from "../types/category.ts";
import type { RadioBroadcast, RadioBroadcastRecord } from "../types/radio.ts";
import type {
  Literature,
  LiteratureRecord,
} from "../types/literature.ts";
import { normalizeLocation } from "../types/location.ts";
import { normalizeSchedules } from "../types/schedule.ts";

function bool(v: unknown, dflt = false): boolean {
  return typeof v === "boolean" ? v : dflt;
}

function text(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function nullableText(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "string" ? v : String(v);
}

function num(v: unknown, dflt = 0): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v) || dflt;
  return dflt;
}

function truthyStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  return [];
}

/** Maps a raw `districts` record into a domain District. */
export function mapDistrict(r: DistrictRecord): District {
  return {
    id: r.id,
    name: text(r.name),
    number: num(r.number),
    slug: text(r.slug),
    description: nullableText(r.description),
    location: normalizeLocation(r.location),
    schedules: normalizeSchedules(r.schedules),
    scheduleText: nullableText(r.scheduleText),
    isActive: bool(r.isActive, true),
    created: r.created,
    updated: r.updated,
  };
}

/** Maps a raw `groups` record into a domain Group (+ optional expanded district). */
export function mapGroup(r: GroupRecord): Group {
  const base = mapGroupCore(r);
  const exp = expandValue(r, "district");
  if (exp && typeof exp === "object" && "id" in exp) {
    base.district = mapDistrict(exp as unknown as DistrictRecord);
  }
  return base;
}

function mapGroupCore(r: GroupRecord): Group {
  return {
    id: r.id,
    name: text(r.name),
    slug: text(r.slug),
    location: normalizeLocation(r.location),
    schedules: normalizeSchedules(r.schedules),
    scheduleText: nullableText(r.scheduleText),
    notes: nullableText(r.notes),
    isActive: bool(r.isActive, true),
    districtId: text(r.district),
    created: r.created,
    updated: r.updated,
  };
}

/** Maps a raw `tags` record into a domain Tag. */
export function mapTag(r: TagRecord) {
  return { id: r.id, name: text(r.name), slug: text(r.slug) };
}

/** Maps a raw `categories` record into a domain Category. */
export function mapCategory(r: CategoryRecord) {
  return { id: r.id, name: text(r.name), sort: num(r.sort) };
}

/** Maps a raw `radio_broadcasts` record (+ optional expanded district). */
export function mapRadioBroadcast(r: RadioBroadcastRecord): RadioBroadcast {
  const out: RadioBroadcast = {
    id: r.id,
    week: num(r.week),
    ownerIsAreaNorte: bool(r.ownerIsAreaNorte),
    time: nullableText(r.time),
    link: nullableText(r.link),
    note: nullableText(r.note),
    districtId: r.district ? text(r.district) : null,
    created: r.created,
    updated: r.updated,
  };
  const exp = expandValue(r, "district");
  if (exp && typeof exp === "object" && "id" in exp) {
    out.district = mapDistrict(exp as unknown as DistrictRecord);
  }
  return out;
}

/** Maps a raw `literature` record (+ optional expanded category). */
export function mapLiterature(r: LiteratureRecord): Literature {
  const out: Literature = {
    id: r.id,
    code: nullableText(r.code),
    title: text(r.title),
    price: num(r.price),
    isActive: bool(r.isActive, true),
    categoryId: text(r.category),
    created: r.created,
    updated: r.updated,
  };
  const exp = expandValue(r, "category");
  if (exp && typeof exp === "object" && "id" in exp) {
    out.category = mapCategory(exp as unknown as CategoryRecord);
  }
  return out;
}

/**
 * PocketBase returns expanded relations under a top-level `expand` object
 * (single relations as an object, M2M as an array). This helper retrieves the
 * expanded value for `field` when present.
 */
function expandValue(r: Record<string, unknown>, field: string): unknown {
  const exp = r.expand;
  if (exp && typeof exp === "object") {
    const o = exp as Record<string, unknown>;
    return o[field];
  }
  return undefined;
}