import { listRecords, getOneRecord } from "../client.ts";
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
      return listRecords<Tag, TagRecord>("tags", mapTag, { sort: "name" });
    },
    getBySlug(slug) {
      return getOneRecord<Tag, TagRecord>("tags", slug, mapTag);
    },
  };
}