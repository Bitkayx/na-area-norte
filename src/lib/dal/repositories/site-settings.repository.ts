import { listRecords } from "../client.ts";
import type { SiteSettings, SiteSettingsRecord } from "../types/site-settings.ts";
import { mapSiteSettings } from "../mappers/site-settings.mapper.ts";

export interface SiteSettingsRepository {
  /**
   * Returns the singleton SiteSettings record (the first/only record), or
   * undefined when none exists yet.
   */
  get(): Promise<SiteSettings | undefined>;
}

export function createSiteSettingsRepository(): SiteSettingsRepository {
  return {
    async get() {
      const settings = await listRecords<SiteSettings, SiteSettingsRecord>(
        "site_settings",
        mapSiteSettings,
        { perPage: 1 },
      );
      return settings[0];
    },
  };
}