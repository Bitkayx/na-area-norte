import type { Location } from "./location.ts";
import type { Schedule } from "./schedule.ts";
import type { PBRecord } from "../client.ts";

/**
 * District — an administrative unit within Área Norte.
 * Only numbers 1, 2, 4, 5 exist. Never 3, never 6.
 */
export interface District {
  id: string;
  name: string;
  number: number;
  slug: string;
  description: string | null;
  location: Location;
  schedules: Schedule[];
  scheduleText: string | null;
  isActive: boolean;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `districts` (before mapping). */
export interface DistrictRecord extends PBRecord {
  name?: unknown;
  number?: unknown;
  slug?: unknown;
  description?: unknown;
  location?: unknown;
  schedules?: unknown;
  scheduleText?: unknown;
  isActive?: unknown;
}