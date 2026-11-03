import { escapeFilterValue, listAllRecords, listRecords } from "../client.ts";
import type { Tag, TagRecord } from "../types/tag.ts";
import { mapTag } from "../mappers/entity.mapper.ts";

export interface TagRepository {
  /** All tags, ordered by name. */
  getAll(): Promise<Tag[]>;
  /** A single tag by slug. */
  getBySlug(slug: string): Promise<Tag | undefined>;
}

export function createTagRepository(): TagRepository {
  return {
    getAll() {
      return listAllRecords<Tag, TagRecord>("tags", mapTag, { sort: "name,id" });
    },
    getBySlug(slug) {
      // Slugs are not record ids: search by the `slug` field, with the value
      // escaped so special characters cannot alter the filter meaning.
      // getOneRecord() queries /records/{id} and would always miss.
      return listRecords<Tag, TagRecord>("tags", mapTag, {
        filter: `slug=${escapeFilterValue(slug)}`,
        perPage: 1,
      }).then((items) => items[0]);
    },
  };
}
