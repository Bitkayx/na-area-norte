import { configureDal, getBaseUrl, isConfigured, isStrict } from "./client.ts";
import { createDistrictRepository } from "./repositories/district.repository.ts";
import { createGroupRepository } from "./repositories/group.repository.ts";
import { createPostRepository } from "./repositories/post.repository.ts";
import { createEventRepository } from "./repositories/event.repository.ts";
import {
  createLiteratureRepository,
  createCategoryRepository,
} from "./repositories/literature.repository.ts";
import { createRadioRepository } from "./repositories/radio.repository.ts";
import { createTagRepository } from "./repositories/tag.repository.ts";
import { createSiteSettingsRepository } from "./repositories/site-settings.repository.ts";

export * from "./types/shared.ts";
export * from "./types/location.ts";
export * from "./types/schedule.ts";
export * from "./types/district.ts";
export * from "./types/group.ts";
export * from "./types/post.ts";
export * from "./types/event.ts";
export * from "./types/literature.ts";
export * from "./types/category.ts";
export * from "./types/radio.ts";
export * from "./types/tag.ts";
export * from "./types/site-settings.ts";

export {
  configureDal,
  getBaseUrl,
  isConfigured,
  isStrict,
  resolveFile,
  normalizeBaseUrl,
} from "./client.ts";
export type { PBRecord } from "./client.ts";

export interface DalOptions {
  strictMode?: boolean;
}

/**
 * Builds and returns the Data Access Layer facade. Pages/components consume
 * ONLY through this object (e.g. `await dal.districts.getAll()`) — they never
 * touch PocketBase directly.
 */
export function createDal(opts: DalOptions = {}): Dal {
  configureDal({ strict: opts.strictMode ?? false });
  return {
    districts: createDistrictRepository(),
    groups: createGroupRepository(),
    posts: createPostRepository(),
    events: createEventRepository(),
    literature: createLiteratureRepository(),
    categories: createCategoryRepository(),
    radio: createRadioRepository(),
    tags: createTagRepository(),
    siteSettings: createSiteSettingsRepository(),
  };
}

export interface Dal {
  districts: ReturnType<typeof createDistrictRepository>;
  groups: ReturnType<typeof createGroupRepository>;
  posts: ReturnType<typeof createPostRepository>;
  events: ReturnType<typeof createEventRepository>;
  literature: ReturnType<typeof createLiteratureRepository>;
  categories: ReturnType<typeof createCategoryRepository>;
  radio: ReturnType<typeof createRadioRepository>;
  tags: ReturnType<typeof createTagRepository>;
  siteSettings: ReturnType<typeof createSiteSettingsRepository>;
}

/**
 * Pre-configured shared instance, usable directly as `dal.posts.getPublished()`.
 * Configured once on module load. In Astro pages this is imported and awaited.
 */
export const dal: Dal = createDal();