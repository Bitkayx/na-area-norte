import { listRecords } from "../client.ts";
import type { Literature, LiteratureRecord } from "../types/literature.ts";
import type { CategoryRecord } from "../types/category.ts";
import { mapLiterature, mapCategory } from "../mappers/entity.mapper.ts";
import type { Category } from "../types/category.ts";

export interface LiteratureRepository {
  /** All active literature, ordered by title, with category expanded. */
  getAll(): Promise<Literature[]>;
  /** Active literature grouped by category (categories ordered by sort). */
  getByCategory(): Promise<Map<string, Literature[]>>;
}

export interface CategoryRepository {
  /** All categories, ordered by sort then name. */
  getAll(): Promise<Category[]>;
}

export function createLiteratureRepository(): LiteratureRepository {
  return {
    getAll() {
      return listRecords<Literature, LiteratureRecord>("literature", mapLiterature, {
        filter: "isActive=true",
        sort: "title",
        expand: "category",
      });
    },
    async getByCategory() {
      const items = await listRecords<Literature, LiteratureRecord>("literature", mapLiterature, {
        filter: "isActive=true",
        sort: "title",
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
    getAll() {
      return listRecords<Category, CategoryRecord>("categories", mapCategory, {
        sort: "sort,name",
      });
    },
  };
}