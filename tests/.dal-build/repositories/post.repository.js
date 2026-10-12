import { listRecords, getOneRecord } from "../client.js";
import { mapPost } from "../mappers/post.mapper.js";
export function createPostRepository() {
    return {
        getPublished() {
            return listRecords("posts", mapPost, {
                filter: "status='published'",
                sort: "-pubDate",
                expand: "tags",
            });
        },
        async getRecent(n) {
            const all = await listRecords("posts", mapPost, {
                filter: "status='published'",
                sort: "-pubDate",
                expand: "tags",
            });
            return all.slice(0, n);
        },
        async getBySlug(slug) {
            return getOneRecord("posts", slug, mapPost, "tags,event");
        },
    };
}
