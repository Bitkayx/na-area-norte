import { listRecords } from "../client.ts";
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
      return listRecords<Group, GroupRecord>("groups", mapGroup, {
        sort: "name",
        filter: "isActive=true",
        expand: withDistrict ? "district" : undefined,
      });
    },
    async getByDistrictNumber(number) {
      // Filter by a non-related numeric value via the expanded district's number.
      // PocketBase filters cannot traverse relations, so we fetch all active
      // groups with district expanded and filter in memory (dataset is small).
      const all = await listRecords<Group, GroupRecord>("groups", mapGroup, {
        filter: "isActive=true",
        expand: "district",
        perPage: 500,
      });
      return all.filter((g) => g.district?.number === number);
    },
    async getBySlug(slug) {
      const all = await listRecords<Group, GroupRecord>("groups", mapGroup, {
        filter: `isActive=true && slug="${slug}"`,
        expand: "district",
      });
      return all[0];
    },
  };
}