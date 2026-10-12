import { mapEvent } from "./event.mapper.js";
import { resolveFile } from "../client.js";
const STATUSES = ["published", "draft", "archived"];
function text(v) {
    return typeof v === "string" ? v : "";
}
function nullableText(v) {
    if (v === null || v === undefined || v === "")
        return null;
    return typeof v === "string" ? v : String(v);
}
function toDate(v) {
    if (typeof v === "string" && v)
        return new Date(v);
    if (v instanceof Date)
        return v;
    if (typeof v === "number")
        return new Date(v);
    return null;
}
function statusOf(v) {
    return typeof v === "string" && STATUSES.includes(v)
        ? v
        : "draft";
}
function tagIds(v) {
    if (Array.isArray(v))
        return v.filter((x) => typeof x === "string");
    return [];
}
/** Maps a raw `posts` record into a domain Post. */
export function mapPost(r) {
    const post = {
        id: r.id,
        title: text(r.title),
        slug: text(r.slug),
        description: text(r.description),
        author: nullableText(r.author),
        pubDate: toDate(r.pubDate),
        coverUrl: resolveFile(r, r.cover),
        body: nullableText(r.body),
        status: statusOf(r.status),
        tagIds: tagIds(r.tags),
        tags: [],
        eventId: typeof r.event === "string" ? r.event : null,
        created: r.created,
        updated: r.updated,
    };
    // PocketBase returns expanded relations under a top-level `expand` object
    // when using the `expand` query parameter. We only read it if present.
    const expandObj = r.expand && typeof r.expand === "object" ? r.expand : undefined;
    // M2M expansion: `expand.tags` is an array of expanded Tag records.
    const expandedTags = expandObj?.tags;
    if (Array.isArray(expandedTags)) {
        post.tags = expandedTags
            .filter((t) => !!t && typeof t === "object")
            .map((t) => ({
            id: text(t.id),
            name: text(t.name),
            slug: text(t.slug),
        }));
    }
    // Single-relation expansion: `expand.event` is a single expanded Event record.
    const expandedEvent = expandObj?.event;
    if (expandedEvent && typeof expandedEvent === "object" && "id" in expandedEvent) {
        post.event = mapEvent(expandedEvent);
    }
    return post;
}
