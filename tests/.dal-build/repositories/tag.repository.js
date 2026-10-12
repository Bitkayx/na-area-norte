import { listRecords, getOneRecord } from "../client.js";
import { mapTag } from "../mappers/entity.mapper.js";
export function createTagRepository() {
    return {
        getAll() {
            return listRecords("tags", mapTag, { sort: "name" });
        },
        getBySlug(slug) {
            return getOneRecord("tags", slug, mapTag);
        },
    };
}
