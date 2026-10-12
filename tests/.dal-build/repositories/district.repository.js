import { listRecords } from "../client.js";
import { mapDistrict } from "../mappers/entity.mapper.js";
export function createDistrictRepository() {
    return {
        getAll() {
            return listRecords("districts", mapDistrict, {
                sort: "number",
                filter: "isActive=true",
            });
        },
        async getByNumber(number) {
            const all = await listRecords("districts", mapDistrict, {
                filter: `isActive=true && number=${number}`,
            });
            return all[0];
        },
    };
}
