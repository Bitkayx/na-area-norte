import {
  escapeFilterValue,
  listAllRecords,
  listRecords,
  listRecordsPaginated,
  MAX_LIST_PAGES,
  MAX_PER_PAGE,
} from "../client.ts";
import type { PostRecord } from "../types/post.ts";
import { mapPost } from "../mappers/post.mapper.ts";
import type { Post } from "../types/post.ts";

const POSTS_FILTER_PUBLISHED = "status='published'";

function clampPage(v: number): number {
  return Math.min(Number.isFinite(v) ? v : 1, MAX_PER_PAGE);
}

export interface PostRepository {
  /** All published posts, newest first (with tags expanded). */
  getPublished(): Promise<Post[]>;
  /** The most recent `n` published posts, newest first (with tags expanded). */
  getRecent(n: number): Promise<Post[]>;
  /**
   * Fetches a single published post by its slug.
   * Expands `tags` (M2M) and `event` (single relation) for convenience.
   * Returns `undefined` if no matching published post exists.
   */
  getBySlug(slug: string): Promise<Post | undefined>;
}

export function createPostRepository(): PostRepository {
  return {
    async getPublished() {
      return listAllRecords<Post, PostRecord>("posts", mapPost, {
        filter: POSTS_FILTER_PUBLISHED,
        // `id` as tiebreaker: page walk requires a deterministic total order
        // (duplicate pubDate values must not straddle page boundaries).
        sort: "-pubDate,id",
        expand: "tags",
      });
    },
    async getRecent(n) {
      if (!Number.isInteger(n) || n <= 0) return [];
      const perPage = clampPage(n);
      const out: Post[] = [];
      let page = 1;
      for (; page <= MAX_LIST_PAGES; page++) {
        const data = await listRecordsPaginated<Post, PostRecord>(
          "posts",
          mapPost,
          {
            filter: POSTS_FILTER_PUBLISHED,
            sort: "-pubDate,id",
            expand: "tags",
            page,
            perPage,
          },
        );
        out.push(...data.items);
        if (out.length >= n || page >= data.totalPages || data.items.length === 0) break;
      }
      if (page > MAX_LIST_PAGES && typeof console !== "undefined") {
        console.warn(`[dal] posts.getRecent(${n}) stopped after ${MAX_LIST_PAGES} pages.`);
      }
      return out.slice(0, n);
    },
    async getBySlug(slug) {
      const items = await listRecords<Post, PostRecord>("posts", mapPost, {
        filter: `status='published'&&slug=${escapeFilterValue(slug)}`,
        perPage: 1,
        expand: "tags,event",
      });
      return items[0];
    },
  };
}
