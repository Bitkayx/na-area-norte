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
  let settingsRequest: Promise<SiteSettings | undefined> | undefined;
  return {
    async get() {
      if (!settingsRequest) {
        settingsRequest = listRecords<SiteSettings, SiteSettingsRecord>(
          "site_settings",
          mapSiteSettings,
          { perPage: 1 },
        ).then((settings) => settings[0]);
      }
      try {
        return await settingsRequest;
      } catch (error) {
        settingsRequest = undefined;
        throw error;
      }
    },
  };
}
