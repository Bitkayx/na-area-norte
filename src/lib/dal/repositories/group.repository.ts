import { escapeFilterValue, listAllRecords } from "../client.ts";
import type { GroupRecord } from "../types/group.ts";
import { mapGroup } from "../mappers/entity.mapper.ts";
import type { Group } from "../types/group.ts";

export interface GroupRepository {
  /** All active groups (optionally with their District expanded), ordered by name. */
  getAll(withDistrict: boolean): Promise<Group[]>;
  /** Active groups belonging to a given district (by district `number`), with District expanded. */
  getByDistrictNumber(number: number): Promise<Group[]>;
  /** A single active group by its globally-unique slug (with District expanded). */
  getBySlug(slug: string): Promise<Group | undefined>;
}

export function createGroupRepository(): GroupRepository {
  return {
    getAll(withDistrict = false) {
      return listAllRecords<Group, GroupRecord>("groups", mapGroup, {
        // `id` as tiebreaker: this walk paginates on `name`, and group names
        // collide in this dataset (e.g. Serenidad in D2 and D4).
        sort: "name,id",
        filter: "isActive=true",
        expand: withDistrict ? "district" : undefined,
      });
    },
    async getByDistrictNumber(number) {
      // Fetch all active groups with district expanded and filter in memory
      // (dataset is small; avoids assumptions about filter syntax for related
      // fields).
      const all = await listAllRecords<Group, GroupRecord>("groups", mapGroup, {
        filter: "isActive=true",
        expand: "district",
      });
      return all.filter((g) => g.district?.number === number);
    },
    async getBySlug(slug) {
      const all = await listAllRecords<Group, GroupRecord>("groups", mapGroup, {
        filter: `isActive=true && slug=${escapeFilterValue(slug)}`,
        expand: "district",
      });
      return all[0];
    },
  };
}
