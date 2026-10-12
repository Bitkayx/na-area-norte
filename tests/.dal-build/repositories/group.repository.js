import { listRecords } from "../client.js";
import { mapGroup } from "../mappers/entity.mapper.js";
export function createGroupRepository() {
    return {
        getAll(withDistrict = false) {
            return listRecords("groups", mapGroup, {
                sort: "name",
                filter: "isActive=true",
                expand: withDistrict ? "district" : undefined,
            });
        },
        async getByDistrictNumber(number) {
            // Filter by a non-related numeric value via the expanded district's number.
            // PocketBase filters cannot traverse relations, so we fetch all active
            // groups with district expanded and filter in memory (dataset is small).
            const all = await listRecords("groups", mapGroup, {
                filter: "isActive=true",
                expand: "district",
                perPage: 500,
            });
            return all.filter((g) => g.district?.number === number);
        },
        async getBySlug(slug) {
            const all = await listRecords("groups", mapGroup, {
                filter: `isActive=true && slug="${slug}"`,
                expand: "district",
            });
            return all[0];
        },
    };
}
