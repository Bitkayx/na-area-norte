import { listRecords } from "../client.ts";
import type { DistrictRecord } from "../types/district.ts";
import { mapDistrict } from "../mappers/entity.mapper.ts";
import type { District } from "../types/district.ts";

export interface DistrictRepository {
  /** All active districts, ordered by number (1, 2, 4, 5). */
  getAll(): Promise<District[]>;
  /** A single district by its numeric `number`. */
  getByNumber(number: number): Promise<District | undefined>;
}

export function createDistrictRepository(): DistrictRepository {
  return {
    getAll() {
      return listRecords<District, DistrictRecord>("districts", mapDistrict, {
        sort: "number",
        filter: "isActive=true",
      });
    },
    async getByNumber(number) {
      const all = await listRecords<District, DistrictRecord>("districts", mapDistrict, {
        filter: `isActive=true && number=${number}`,
      });
      return all[0];
    },
  };
}