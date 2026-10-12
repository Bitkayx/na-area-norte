import { listRecords } from "../client.js";
import { mapSiteSettings } from "../mappers/site-settings.mapper.js";
export function createSiteSettingsRepository() {
    return {
        async get() {
            const settings = await listRecords("site_settings", mapSiteSettings, { perPage: 1 });
            return settings[0];
        },
    };
}
