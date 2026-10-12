import { configureDal } from "./client.js";
import { createDistrictRepository } from "./repositories/district.repository.js";
import { createGroupRepository } from "./repositories/group.repository.js";
import { createPostRepository } from "./repositories/post.repository.js";
import { createEventRepository } from "./repositories/event.repository.js";
import { createLiteratureRepository, createCategoryRepository, } from "./repositories/literature.repository.js";
import { createRadioRepository } from "./repositories/radio.repository.js";
import { createTagRepository } from "./repositories/tag.repository.js";
import { createSiteSettingsRepository } from "./repositories/site-settings.repository.js";
export * from "./types/shared.js";
export * from "./types/location.js";
export * from "./types/schedule.js";
export * from "./types/district.js";
export * from "./types/group.js";
export * from "./types/post.js";
export * from "./types/event.js";
export * from "./types/literature.js";
export * from "./types/category.js";
export * from "./types/radio.js";
export * from "./types/tag.js";
export * from "./types/site-settings.js";
export { configureDal, getBaseUrl, isConfigured, isStrict, resolveFile, normalizeBaseUrl, } from "./client.js";
/**
 * Builds and returns the Data Access Layer facade. Pages/components consume
 * ONLY through this object (e.g. `await dal.districts.getAll()`) — they never
 * touch PocketBase directly.
 */
export function createDal(opts = {}) {
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
/**
 * Pre-configured shared instance, usable directly as `dal.posts.getPublished()`.
 * Configured once on module load. In Astro pages this is imported and awaited.
 */
export const dal = createDal();
