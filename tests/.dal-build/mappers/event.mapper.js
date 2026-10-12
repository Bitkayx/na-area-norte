import { normalizeLocation } from "../types/location.js";
import { mapPost } from "./post.mapper.js";
import { resolveFile } from "../client.js";
const TYPES = ["encuentro", "mave", "congreso", "asamblea", "invitacion", "otro"];
const STATUSES = ["active", "cancelled", "archived"];
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
function typeOf(v) {
    return typeof v === "string" && TYPES.includes(v)
        ? v
        : null;
}
function statusOf(v) {
    return typeof v === "string" && STATUSES.includes(v)
        ? v
        : "archived";
}
/** Maps a raw `events` record into a domain Event. */
export function mapEvent(r) {
    const event = {
        id: r.id,
        title: text(r.title),
        slug: text(r.slug),
        type: typeOf(r.type),
        startDate: toDate(r.startDate),
        endDate: toDate(r.endDate),
        location: r.location ? normalizeLocation(r.location) : null,
        organizerName: nullableText(r.organizerName),
        description: nullableText(r.description),
        program: nullableText(r.program),
        imageUrl: resolveFile(r, r.image),
        status: statusOf(r.status),
        postRefId: typeof r.postRef === "string" ? r.postRef : null,
        created: r.created,
        updated: r.updated,
    };
    const expandObj = r.expand && typeof r.expand === "object" ? r.expand : undefined;
    const expPost = expandObj && expandObj.postRef;
    if (expPost && typeof expPost === "object" && "id" in expPost) {
        event.postRef = mapPost(expPost);
    }
    return event;
}
