import type { District } from "./district.ts";
import type { PBRecord } from "../client.ts";

/**
 * RadioBroadcast — one week (1..52) of the Área Norte radio schedule.
 * Owner is either a District OR the Área Norte itself (never both).
 * District 3 and District 6 do not exist.
 */
export interface RadioBroadcast {
  id: string;
  /** 1..52, unique, never duplicated. */
  week: number;
  /** true → owned by Área Norte itself (district is null). */
  ownerIsAreaNorte: boolean;
  /** "HH:mm" emission time. */
  time: string | null;
  link: string | null;
  note: string | null;
  /** PB record id of the owning District, or null when owned by Área Norte. */
  districtId: string | null;
  /** Populated only when requested with `expand=district`. */
  district?: District;
  created: string;
  updated: string;
}

/** Raw PocketBase record for `radio_broadcasts` (before mapping). */
export interface RadioBroadcastRecord extends PBRecord {
  week?: unknown;
  ownerIsAreaNorte?: unknown;
  time?: unknown;
  link?: unknown;
  note?: unknown;
  district?: unknown;
}