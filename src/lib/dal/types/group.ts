import type { Location } from "./location.ts";
import type { Schedule } from "./schedule.ts";
import type { District } from "./district.ts";
import type { PBRecord } from "../client.ts";

/**
 * Group — a meeting group that belongs to exactly one District.
 */
export interface Group {
  id: string;
  name: string;
  slug: string;
  location: Location;
  schedules: Schedule[];
  scheduleText: string | null;
  notes: string | null;
  isActive: boolean;
  /** PB record id of the owning District. */
  districtId: string;
  /** Populated only when the group was requested with `expand=district`. */
  district?: District;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `groups` (before mapping). */
export interface GroupRecord extends PBRecord {
  name?: unknown;
  slug?: unknown;
  location?: unknown;
  schedules?: unknown;
  scheduleText?: unknown;
  notes?: unknown;
  isActive?: unknown;
  district?: unknown;
}