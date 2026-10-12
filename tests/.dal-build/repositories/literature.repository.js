import { listRecords } from "../client.js";
import { mapLiterature, mapCategory } from "../mappers/entity.mapper.js";
export function createLiteratureRepository() {
    return {
        getAll() {
            return listRecords("literature", mapLiterature, {
                filter: "isActive=true",
                sort: "title",
                expand: "category",
            });
        },
        async getByCategory() {
            const items = await listRecords("literature", mapLiterature, {
                filter: "isActive=true",
                sort: "title",
                expand: "category",
            });
            const groups = new Map();
            for (const item of items) {
                const key = item.category?.name ?? "Sin categoría";
                if (!groups.has(key))
                    groups.set(key, []);
                groups.get(key).push(item);
            }
            return groups;
        },
    };
}
export function createCategoryRepository() {
    return {
        getAll() {
            return listRecords("categories", mapCategory, {
                sort: "sort,name",
            });
        },
    };
}
