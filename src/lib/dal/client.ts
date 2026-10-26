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
export function configureDal(opts: DalOptions = {}): void {
  strictMode = opts.strict ?? false;

  const importMetaEnv =
    typeof import.meta !== "undefined" &&
    (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;

  const envValueFromImportMeta =
    importMetaEnv && typeof importMetaEnv.PUBLIC_POCKETBASE_URL === "string"
      ? importMetaEnv.PUBLIC_POCKETBASE_URL
      : undefined;

  const globalWithProcess = globalThis as {
    process?: { env?: Record<string, string> };
  };
  const envValueFromProcess = globalWithProcess.process?.env?.PUBLIC_POCKETBASE_URL;

  const rawUrl = envValueFromImportMeta ?? envValueFromProcess;
  const normalized = normalizeBaseUrl(typeof rawUrl === "string" ? rawUrl : "");

  baseUrl = normalized;
  configured = baseUrl.length > 0;

  if (!configured) {
    const msg =
      "PUBLIC_POCKETBASE_URL is not set. The DAL will return empty datasets. " +
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

/**
 * Maximum `perPage` PocketBase accepts for a single list request. PocketBase
 * also applies its own lower default (30) when `perPage` is omitted, so every
 * repository that promises "all"/"n" records must set pagination explicitly.
 */
export const MAX_PER_PAGE = 500;

/** Safety cap so a misbehaving server cannot loop forever. */
export const MAX_LIST_PAGES = 1000;

/**
 * Escapes a value for use as a string literal inside a PocketBase filter
 * expression, with the same JSON serialization the official JS SDK `pb.filter()`
 * helper uses for strings (JSON.stringify: double-quoted, escaping `\` and `"`).
 *
 * This is NOT the same as URL-encoding: URLSearchParams only encodes the URL,
 * never the filter string's internal syntax. Without this escape, a slug such
 * as `x' || status='draft` can terminate the quoted literal and inject extra
 * filter conditions.
 *
 * Note: within the filter expression grammar, operators and field names must
 * never come from user input; this helper is only for the *value*.
 */
export function escapeFilterValue(value: string): string {
  return JSON.stringify(value);
}

/**
 * Lists ALL records of a collection by walking every page of PocketBase's
 * paginated list API (page 1..totalPages). Repositories whose contract is
 * "all records" must use this, not a single request: PocketBase can and does
 * split results across pages, and its default perPage is small.
 *
 * `sort`, `filter` and `expand` are passed through on every request; a caller
 * `perPage` is clamped to [1, MAX_PER_PAGE] (default MAX_PER_PAGE).
 */
export async function listAllRecords<
  TItem,
  TPb extends PBRecord = PBRecord & Record<string, unknown>,
>(collection: string, map: (raw: TPb) => TItem, params: ListParams = {}): Promise<TItem[]> {
  const perPage = clampPerPage(params.perPage ?? MAX_PER_PAGE);
  const items: TItem[] = [];
  for (let page = 1; page <= MAX_LIST_PAGES; page++) {
    const data = await listRecordsPaginated(collection, map, { ...params, page, perPage });
    items.push(...data.items);
    if (data.page >= data.totalPages || data.items.length === 0) return items;
  }
  // The safety cap was reached without the server reporting completion: this
  // means "all records" cannot be guaranteed, so do NOT fail silently.
  if (typeof console !== "undefined") {
    console.warn(
      `[dal] listAllRecords('${collection}') stopped after ${MAX_LIST_PAGES} pages; ` +
        `results may be truncated. Increase MAX_LIST_PAGES or add server-side filters.`,
    );
  }
  return items;
}

function clampPerPage(v: number): number {
  if (!Number.isInteger(v)) v = Math.trunc(v);
  if (!Number.isFinite(v) || v < 1) return 1;
  return Math.min(v, MAX_PER_PAGE);
}

/** Builds a PocketBase collection list URL with query params. */
export function buildListUrl(collection: string, params: ListParams = {}): string {
  const url = new URL(`${baseUrl}/api/collections/${collection}/records`);
  const sp = url.searchParams;
  if (params.page !== undefined) sp.set("page", String(params.page));
  if (params.perPage !== undefined) sp.set("perPage", String(params.perPage));
  if (params.sort) sp.set("sort", params.sort);
  if (params.filter) sp.set("filter", params.filter);
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