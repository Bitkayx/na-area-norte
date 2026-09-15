import { listRecords, getOneRecord } from "../client.ts";
import type { PostRecord } from "../types/post.ts";
import { mapPost } from "../mappers/post.mapper.ts";
import type { Post } from "../types/post.ts";

export interface PostRepository {
  /** All published posts, newest first (with tags expanded). */
  getPublished(): Promise<Post[]>;
  /** The most recent `n` published posts, newest first (with tags expanded). */
  getRecent(n: number): Promise<Post[]>;
  /** A single published post by slug (with tags + event expanded). */
  getBySlug(slug: string): Promise<Post | undefined>;
}

export function createPostRepository(): PostRepository {
  return {
    getPublished() {
      return listRecords<Post, PostRecord>("posts", mapPost, {
        filter: "status='published'",
        sort: "-pubDate",
        expand: "tags",
      });
    },
    async getRecent(n) {
      const all = await listRecords<Post, PostRecord>("posts", mapPost, {
        filter: "status='published'",
        sort: "-pubDate",
        expand: "tags",
      });
      return all.slice(0, n);
    },
    async getBySlug(slug) {
      return getOneRecord<Post, PostRecord>("posts", slug, mapPost, "tags,event");
    },
  };
}