import type { ListParams, Paginated } from "./types/shared.ts";

/**
 * PocketBase collection record — the raw shape returned by the public API.
 * All cell values are opaque (`unknown`) by design; mappers are the only place
 * that interprets them. `id` and `collectionId` are the PB-native identifiers.
 */
export interface PBRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  [key: string]: unknown;
}

/** PocketBase list response envelope. */
interface PBListResponse<T extends PBRecord> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

interface DalOptions {
  /** Throw if PUBLIC_POCKETBASE_URL is missing. Default: permissive (empty). */
  strict?: boolean;
}

let baseUrl = "";
let configured = false;
let strictMode = false;

/** Reads the base URL from the environment exactly once. */
export function getBaseUrl(): string {
  return baseUrl;
}

/** Whether PUBLIC_POCKETBASE_URL was present. */
export function isConfigured(): boolean {
  return configured;
}

/** Whether the DAL was put in strict mode. */
export function isStrict(): boolean {
  return strictMode;
}

/**
 * Configures the DAL. In permissive mode (default) an unset
 * PUBLIC_POCKETBASE_URL degrades to empty datasets with a console.warn; real
 * API failures are NEVER hidden. In strict mode a missing URL throws.
 *
 * Safe to call more than once (idempotent); the last call wins.
 */
export function configureDal(opts: DalOptions = {}): void {
  strictMode = opts.strict ?? false;
  // Prefer the Astro/import.meta.env value; fall back to process.env so the DAL
  // is testable/portable outside of Astro's build-time env injection.
  const env =
    typeof import.meta !== "undefined" && (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  const importRaw = env && typeof env.PUBLIC_POCKETBASE_URL === "string" ? env.PUBLIC_POCKETBASE_URL : undefined;
  const g: { process?: { env?: Record<string, string> } } = globalThis as { process?: { env?: Record<string, string> } };
  const processRaw = g.process?.env?.PUBLIC_POCKETBASE_URL;
  const raw = importRaw ?? processRaw;
  baseUrl = normalizeBaseUrl(typeof raw === "string" ? raw : "");
  configured = baseUrl.length > 0;
  if (!configured) {
    const msg =
      "PUBLIC_POCKETBASE_URL is not set. The DAL will return empty datasets. " +
      "Real PocketBase API errors will still be thrown. Set the env var to enable content.";
    if (strictMode) {
      throw new Error("[dal] " + msg);
    }
    // eslint-disable-next-line no-console
    if (typeof console !== "undefined") console.warn("[dal] " + msg);
  }
}

/**
 * Normalizes the PocketBase base URL: strips the admin UI suffix "/_/" and any
 * trailing slashes so it can safely be joined with "/api/...".
 */
export function normalizeBaseUrl(url: string): string {
  if (!url) return "";
  return url.trim().replace(/\/_\/?$/, "").replace(/\/+$/, "");
}

/**
 * Resolves a PocketBase file field (single filename string, or the first of an
 * array) to its public URL. Returns null when there is no file.
 *
 * PocketBase file URLs are: {baseUrl}/api/files/{collectionId}/{recordId}/{filename}
 */
export function resolveFile(
  record: PBRecord,
  rawValue: unknown,
  { thumb = null }: { thumb?: string | null } = {},
): string | null {
  if (rawValue === null || rawValue === undefined || rawValue === "") return null;
  const filename = Array.isArray(rawValue) ? (rawValue[0] as string) : (rawValue as string);
  if (!filename) return null;
  let file = filename;
  if (thumb) {
    const dot = file.lastIndexOf(".");
    if (dot > 0) file = `${file.slice(0, dot)}_${thumb}${file.slice(dot)}`;
  }
  return `${baseUrl}/api/files/${record.collectionId}/${record.id}/${file}`;
}

/** Builds a PocketBase collection list URL with query params. */
export function buildListUrl(collection: string, params: ListParams = {}): string {
  const url = new URL(`${baseUrl}/api/collections/${collection}/records`);
  const sp = url.searchParams;
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.perPage !== undefined) sp.set("perPage", String(params.perPage));
  if (params.sort) sp.set("sort", params.sort);
  if (params.filter) sp.set("filter", encodeURI(params.filter));
  if (params.expand) sp.set("expand", params.expand);
  return url.toString();
}

/** Builds a PocketBase collection record detail URL. */
export function buildGetUrl(collection: string, idOrSlug: string, expand?: string): string {
  const url = new URL(`${baseUrl}/api/collections/${collection}/records/${idOrSlug}`);
  if (expand) url.searchParams.set("expand", expand);
  return url.toString();
}

/** Performs an authenticated-less public GET; throws on non-2xx. */
async function rawGet<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`[dal] Network error fetching ${url}: ${String(err)}`);
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.text();
      detail = body ? ` ${body}` : "";
    } catch {
      /* ignore body read errors */
    }
    throw new Error(`[dal] PocketBase API ${res.status} fetching ${url}:${detail}`);
  }
  return (await res.json()) as T;
}

/** Guard: if the DAL is not configured and permissive, signal "no data". */
function configuredOrThrow(): boolean {
  if (configured) return true;
  if (strictMode) throw new Error("[dal] PUBLIC_POCKETBASE_URL is required in strict mode.");
  return false;
}

/**
 * Lists records for a collection, mapping each PB record through `map`.
 * Returns an empty array in permissive mode when PB is unconfigured.
 */
export async function listRecords<TItem, TPb extends PBRecord = PBRecord & Record<string, unknown>>(
  collection: string,
  map: (raw: TPb) => TItem,
  params: ListParams = {},
): Promise<TItem[]> {
  if (!configuredOrThrow()) return [];
  const url = buildListUrl(collection, params);
  const data = await rawGet<PBListResponse<TPb>>(url);
  return (data.items || []).map((r) => map(r));
}

/**
 * Paginated listing — returns the full PB envelope plus mapped items.
 * Throws on API error or unconfigured strict mode.
 */
export async function listRecordsPaginated<
  TItem,
  TPb extends PBRecord = PBRecord & Record<string, unknown>,
>(collection: string, map: (raw: TPb) => TItem, params: ListParams = {}): Promise<Paginated<TItem>> {
  if (!configuredOrThrow()) {
    return { items: [], page: 1, perPage: params.perPage ?? 30, totalItems: 0, totalPages: 0 };
  }
  const url = buildListUrl(collection, params);
  const data = await rawGet<PBListResponse<TPb>>(url);
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
export async function getOneRecord<
  TItem,
  TPb extends PBRecord = PBRecord & Record<string, unknown>,
>(collection: string, idOrSlug: string, map: (raw: TPb) => TItem, expand?: string): Promise<TItem | undefined> {
  if (!configuredOrThrow()) return undefined;
  const url = buildGetUrl(collection, idOrSlug, expand);
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`[dal] Network error fetching ${url}: ${String(err)}`);
  }
  if (res.status === 404) return undefined;
  if (!res.ok) {
    throw new Error(`[dal] PocketBase API ${res.status} GET ${url}`);
  }
  return map((await res.json()) as TPb);
}

export { baseUrl };