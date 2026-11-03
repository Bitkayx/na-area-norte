import { listAllRecords } from "../client.ts";
import type { Literature, LiteratureRecord } from "../types/literature.ts";
import { mapLiterature, mapCategory } from "../mappers/entity.mapper.ts";
import type { CategoryRecord } from "../types/category.ts";
import type { Category } from "../types/category.ts";

export interface LiteratureRepository {
  /** All active literature, ordered by title, with category expanded. */
  getAll(): Promise<Literature[]>;
  /** Active literature grouped by category name (categories ordered by sort). */
  getByCategory(): Promise<Map<string, Literature[]>>;
}

export interface CategoryRepository {
  /** All categories, ordered by sort then name. */
  getAll(): Promise<Category[]>;
}

export function createLiteratureRepository(): LiteratureRepository {
  return {
    getAll() {
      return listAllRecords<Literature, LiteratureRecord>("literature", mapLiterature, {
        filter: "isActive=true",
        // `id` as tiebreaker: page walk requires a deterministic total order
        sort: "title,id",
        expand: "category",
      });
    },
    async getByCategory() {
      const items = await listAllRecords<Literature, LiteratureRecord>("literature", mapLiterature, {
        filter: "isActive=true",
        sort: "title,id",
        expand: "category",
      });
      const groups = new Map<string, Literature[]>();
      for (const item of items) {
        const key = item.category?.name ?? "Sin categoría";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }
      return groups;
    },
  };
}

export function createCategoryRepository(): CategoryRepository {
  return {
    async getAll() {
      const categories = await listAllRecords<Category, CategoryRecord>("categories", mapCategory, {
        sort: "sort,name",
      });
      // Contract: ordered by `sort` then name; sorting server-side by
      // "sort,name" compares lexicographically in SQLite (e.g. 10 before 2), so
      // re-order numerically in memory to honor the contract.
      return categories.sort((a, b) =>
        a.sort !== b.sort ? a.sort - b.sort : a.name.localeCompare(b.name),
      );
    },
  };
}
