import { listRecords, MAX_PER_PAGE } from "../client.ts";
import type { RadioBroadcast, RadioBroadcastRecord } from "../types/radio.ts";
import { mapRadioBroadcast } from "../mappers/entity.mapper.ts";

/** Domain rule: radio weeks are integers 1..52, unique. */
const MIN_WEEK = 1;
const MAX_WEEK = 52;

function isValidWeek(week: number): boolean {
  return Number.isInteger(week) && week >= MIN_WEEK && week <= MAX_WEEK;
}

export interface RadioRepository {
  /**
   * A single broadcast by week number (1..52), with District expanded.
   * Returns undefined for non-integers or values outside 1..52 (which cannot
   * exist in the domain).
   */
  getByWeek(week: number): Promise<RadioBroadcast | undefined>;
  /**
   * All broadcasts for the given week numbers, exactly (with District
   * expanded). Non-consecutive and unordered lists are honored; duplicates are
   * de-duplicated. Weeks outside 1..52 and non-integers are ignored (they
   * cannot exist in the domain).
   * An empty list returns [] without querying.
   */
  getByWeeks(weeks: number[]): Promise<RadioBroadcast[]>;
}

/**
 * Domain note: `week` is expected to be unique (one broadcast per week, weeks
 * 1..52). The DAL defensively does NOT assume uniqueness for `getByWeeks`
 * queries (perPage stays at MAX_PER_PAGE), but `getByWeek` treats the first
 * record as canonical; enforce uniqueness with a PocketBase unique index.
 */
export function createRadioRepository(): RadioRepository {
  return {
    async getByWeek(week) {
      if (!isValidWeek(week)) return undefined;
      const all = await listRecords<RadioBroadcast, RadioBroadcastRecord>(
        "radio_broadcasts",
        mapRadioBroadcast,
        { filter: `week=${week}`, expand: "district", perPage: 1 },
      );
      return all[0];
    },
    async getByWeeks(weeks) {
      const wanted = [...new Set((weeks ?? []).filter(isValidWeek))].sort((a, b) => a - b);
      if (wanted.length === 0) return [];
      return listRecords<RadioBroadcast, RadioBroadcastRecord>("radio_broadcasts", mapRadioBroadcast, {
        filter: `(${wanted.map((w) => `week=${w}`).join(" || ")})`,
        expand: "district",
        perPage: MAX_PER_PAGE,
        sort: "week",
      });
    },
  };
}
