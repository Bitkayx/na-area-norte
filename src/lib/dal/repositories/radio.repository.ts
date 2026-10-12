import { listRecords } from "../client.ts";
import type { RadioBroadcast, RadioBroadcastRecord } from "../types/radio.ts";
import { mapRadioBroadcast } from "../mappers/entity.mapper.ts";

export interface RadioRepository {
  /** A single broadcast by week number (1..52), with District expanded. */
  getByWeek(week: number): Promise<RadioBroadcast | undefined>;
  /** All broadcasts for the given week numbers (with District expanded). */
  getByWeeks(weeks: number[]): Promise<RadioBroadcast[]>;
}

export function createRadioRepository(): RadioRepository {
  return {
    async getByWeek(week) {
      const all = await listRecords<RadioBroadcast, RadioBroadcastRecord>(
        "radio_broadcasts",
        mapRadioBroadcast,
        { filter: `week=${week}`, expand: "district" },
      );
      return all[0];
    },
    getByWeeks(weeks) {
      const params = weeks.length
        ? { filter: `week>=${weeks[0]} && week<=${weeks[weeks.length - 1]}`, expand: "district", perPage: 60 }
        : { expand: "district", perPage: 60 };
      return listRecords<RadioBroadcast, RadioBroadcastRecord>("radio_broadcasts", mapRadioBroadcast, params);
    },
  };
}