let baseUrl = "";
let configured = false;
let strictMode = false;
/** Reads the base URL from the environment exactly once. */
export function getBaseUrl() {
    return baseUrl;
}
/** Whether PUBLIC_POCKETBASE_URL was present. */
export function isConfigured() {
    return configured;
}
/** Whether the DAL was put in strict mode. */
export function isStrict() {
    return strictMode;
}
/**
 * Configures the DAL. In permissive mode (default) an unset
 * PUBLIC_POCKETBASE_URL degrades to empty datasets with a console.warn; real
 * API failures are NEVER hidden. In strict mode a missing URL throws.
 *
 * Safe to call more than once (idempotent); the last call wins.
 */
/**
 * Configures the DAL.
 *
 * Behavior:
 * - In permissive mode (default): if PUBLIC_POCKETBASE_URL is missing,
 *   the DAL degrades gracefully and returns empty datasets. Real API
 *   failures (network/500/404 treated as error) are NEVER hidden.
 * - In strict mode: if PUBLIC_POCKETBASE_URL is missing, throws immediately.
 *
 * Resolution order: import.meta.env.PUBLIC_POCKETBASE_URL → process.env.PUBLIC_POCKETBASE_URL
 * This keeps the DAL testable outside of Astro's build-time env injection.
 *
 * Idempotent: safe to call multiple times; last call wins.
 */
export function configureDal(opts = {}) {
    strictMode = opts.strict ?? false;
    const importMetaEnv = typeof import.meta !== "undefined" &&
        import.meta.env;
    const envValueFromImportMeta = importMetaEnv && typeof importMetaEnv.PUBLIC_POCKETBASE_URL === "string"
        ? importMetaEnv.PUBLIC_POCKETBASE_URL
        : undefined;
    const globalWithProcess = globalThis;
    const envValueFromProcess = globalWithProcess.process?.env?.PUBLIC_POCKETBASE_URL;
    const rawUrl = envValueFromImportMeta ?? envValueFromProcess;
    const normalized = normalizeBaseUrl(typeof rawUrl === "string" ? rawUrl : "");
    baseUrl = normalized;
    configured = baseUrl.length > 0;
    if (!configured) {
        const msg = "PUBLIC_POCKETBASE_URL is not set. The DAL will return empty datasets. " +
            "Real PocketBase API errors will still be thrown. Set the env var to enable content.";
        if (strictMode) {
            throw new Error("[dal] " + msg);
        }
        if (typeof console !== "undefined") {
            console.warn("[dal] " + msg);
        }
    }
}
/**
 * Normalizes the PocketBase base URL: strips the admin UI suffix "/_/" and any
 * trailing slashes so it can safely be joined with "/api/...".
 */
export function normalizeBaseUrl(url) {
    if (!url)
        return "";
    return url.trim().replace(/\/_\/?$/, "").replace(/\/+$/, "");
}
/**
 * Resolves a PocketBase file field (single filename string, or the first of an
 * array) to its public URL. Returns null when there is no file.
 *
 * PocketBase file URLs are: {baseUrl}/api/files/{collectionId}/{recordId}/{filename}
 */
export function resolveFile(record, rawValue, { thumb = null } = {}) {
    if (rawValue === null || rawValue === undefined || rawValue === "")
        return null;
    const filename = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (!filename)
        return null;
    let file = filename;
    if (thumb) {
        const dot = file.lastIndexOf(".");
        if (dot > 0)
            file = `${file.slice(0, dot)}_${thumb}${file.slice(dot)}`;
    }
    return `${baseUrl}/api/files/${record.collectionId}/${record.id}/${file}`;
}
/** Builds a PocketBase collection list URL with query params. */
export function buildListUrl(collection, params = {}) {
    const url = new URL(`${baseUrl}/api/collections/${collection}/records`);
    const sp = url.searchParams;
    if (params.page !== undefined)
        sp.set("page", String(params.page));
    if (params.perPage !== undefined)
        sp.set("perPage", String(params.perPage));
    if (params.sort)
        sp.set("sort", params.sort);
    if (params.filter)
        sp.set("filter", encodeURI(params.filter));
    if (params.expand)
        sp.set("expand", params.expand);
    return url.toString();
}
/** Builds a PocketBase collection record detail URL. */
export function buildGetUrl(collection, idOrSlug, expand) {
    const url = new URL(`${baseUrl}/api/collections/${collection}/records/${idOrSlug}`);
    if (expand)
        url.searchParams.set("expand", expand);
    return url.toString();
}
/** Performs an authenticated-less public GET; throws on non-2xx. */
async function rawGet(url) {
    let res;
    try {
        res = await fetch(url);
    }
    catch (err) {
        throw new Error(`[dal] Network error fetching ${url}: ${String(err)}`);
    }
    if (!res.ok) {
        let detail = "";
        try {
            const body = await res.text();
            detail = body ? ` ${body}` : "";
        }
        catch {
            /* ignore body read errors */
        }
        throw new Error(`[dal] PocketBase API ${res.status} fetching ${url}:${detail}`);
    }
    return (await res.json());
}
/** Guard: if the DAL is not configured and permissive, signal "no data". */
function configuredOrThrow() {
    if (configured)
        return true;
    if (strictMode)
        throw new Error("[dal] PUBLIC_POCKETBASE_URL is required in strict mode.");
    return false;
}
/**
 * Lists records for a collection, mapping each PB record through `map`.
 * Returns an empty array in permissive mode when PB is unconfigured.
 */
export async function listRecords(collection, map, params = {}) {
    if (!configuredOrThrow())
        return [];
    const url = buildListUrl(collection, params);
    const data = await rawGet(url);
    return (data.items || []).map((r) => map(r));
}
/**
 * Paginated listing — returns the full PB envelope plus mapped items.
 * Throws on API error or unconfigured strict mode.
 */
export async function listRecordsPaginated(collection, map, params = {}) {
    if (!configuredOrThrow()) {
        return { items: [], page: 1, perPage: params.perPage ?? 30, totalItems: 0, totalPages: 0 };
    }
    const url = buildListUrl(collection, params);
    const data = await rawGet(url);
    return {
        items: (data.items || []).map((r) => map(r)),
        page: data.page,
        perPage: data.perPage,
        totalItems: data.totalItems,
        totalPages: data.totalPages,
    };
}
/**
 * Fetches a single record by its PB id or its slug (filtering through the
 * public `view` route). Returns undefined on 404 (not found) — other HTTP
 * errors still throw.
 */
export async function getOneRecord(collection, idOrSlug, map, expand) {
    if (!configuredOrThrow())
        return undefined;
    const url = buildGetUrl(collection, idOrSlug, expand);
    let res;
    try {
        res = await fetch(url);
    }
    catch (err) {
        throw new Error(`[dal] Network error fetching ${url}: ${String(err)}`);
    }
    if (res.status === 404)
        return undefined;
    if (!res.ok) {
        throw new Error(`[dal] PocketBase API ${res.status} GET ${url}`);
    }
    return map((await res.json()));
}
export { baseUrl };
