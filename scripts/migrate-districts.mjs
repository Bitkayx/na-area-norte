#!/usr/bin/env node
/**
 * Migrate the four valid Área Norte districts (1, 2, 4, 5) from the V1 JSON
 * sources in `src/data/grupos/distritoN.json` into the PocketBase `districts`
 * collection.
 *
 * Source of truth (V1): the first record of each `distritoN.json` file, whose
 * `id` ends in `-distrito`. Those records are districts, NOT groups (see
 * ADR-004-district-group-separation.md).
 *
 * Rules honoured here (AGENTS.md / ADRs):
 *  - Only districts 1, 2, 4 and 5 exist. Districts 3 and 6 must never be created.
 *  - Original schedule text is preserved in `scheduleText` for traceability,
 *    while an unambiguous structured `schedules` value is also emitted.
 *  - Idempotent: matches existing records by `slug` (and detects `number`
 *    collisions); never deletes records.
 *  - Dry-run by default; `--apply` is required to write.
 *
 * Usage:
 *   node scripts/migrate-districts.mjs            # dry-run (reads PB, no writes)
 *   node scripts/migrate-districts.mjs --apply    # create/update (needs superuser)
 *
 * Options:
 *   --base-url <url>   PocketBase base URL (defaults to PB_URL / PUBLIC_POCKETBASE_URL)
 *   --slug <pattern>   slug pattern, `{number}` is replaced (default "distrito-{number}")
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const VALID_NUMBERS = [1, 2, 4, 5];
const SOURCE_FILES = VALID_NUMBERS.map(
  (n) => `src/data/grupos/distrito${n}.json`,
);

const API_SUPERUSER_AUTH = "/api/collections/_superusers/auth-with-password";
const API_DISTRICTS = "/api/collections/districts/records";

function getArg(flag, argv = process.argv) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
}

/** Loads KEY=VALUE pairs from a local .env without printing anything. */
function loadDotEnv() {
  const p = path.join(root, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
function reqEnv(name, env = process.env) {
  const v = env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function request(baseUrl, p, { method = "GET", token, body } = {}) {
  const url = baseUrl.replace(/\/+$/, "") + p;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = token;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "message" in data
        ? data.message
        : text || res.statusText;
    throw new Error(`[PB ${res.status}] ${method} ${p} -> ${msg}`);
  }
  return data;
}

function displayBaseUrl(baseUrl) {
  try {
    const url = new URL(baseUrl);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "(invalid URL)";
  }
}

// --------------------------------------------------------------------------
// V1 -> PB transformation
// --------------------------------------------------------------------------

const DAY_ORDER = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];
const DAY_INDEX = new Map(DAY_ORDER.map((d, i) => [d, i + 1]));

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Parses an unstructured V1 day expression into ISO weekday numbers, or returns
 * null when it cannot be interpreted unambiguously (so we never invent data).
 * Supports the forms present in V1: "Lunes a Viernes", "Lunes a Sábado",
 * single days, and comma / "y" separated lists.
 */
function parseDays(raw) {
  if (typeof raw !== "string") return null;
  const text = stripAccents(raw).toLowerCase().trim();
  if (!text) return null;
  const exception = text.match(/^(.+?)\s*\(excepto\s+(.+?)\)$/);
  if (exception) {
    const included = parseDays(exception[1]);
    const excluded = parseDays(exception[2]);
    if (!included || !excluded) return null;
    const excludedSet = new Set(excluded);
    const result = included.filter((day) => !excludedSet.has(day));
    return result.length ? result : null;
  }
  const tokens = text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const days = new Set();
  for (const tok of tokens) {
    const range = tok.match(/^(.+?)\s+a\s+(.+)$/);
    if (range) {
      const a = DAY_INDEX.get(stripAccents(range[1]).trim());
      const b = DAY_INDEX.get(stripAccents(range[2]).trim());
      if (!a || !b || a > b) return null;
      for (let d = a; d <= b; d++) days.add(d);
      continue;
    }
    if (tok === "a diario" || tok === "diario") {
      for (let d = 1; d <= 7; d++) days.add(d);
      continue;
    }
    const parts = tok.split(/\s+y\s+/).map((p) => p.trim());
    for (const part of parts) {
      const idx = DAY_INDEX.get(stripAccents(part));
      if (!idx) return null;
      days.add(idx);
    }
  }
  if (days.size === 0) return null;
  return [...days].sort((x, y) => x - y);
}

function isTime(v) {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Returns { schedules, scheduleText, warnings }. */
function transformSchedules(horarios) {
  const warnings = [];
  if (!Array.isArray(horarios) || horarios.length === 0) {
    return { schedules: [], scheduleText: null, warnings };
  }
  const schedules = [];
  const texts = [];
  for (const h of horarios) {
    const text =
      `${h.dias ?? ""} ${h.horaInicio ?? ""}-${h.horaFin ?? ""}`.trim();
    if (text) texts.push(text);
    const days = parseDays(h.dias);
    if (
      days &&
      isTime(h.horaInicio) &&
      isTime(h.horaFin) &&
      h.horaFin > h.horaInicio
    ) {
      schedules.push({ days, startTime: h.horaInicio, endTime: h.horaFin });
    } else {
      warnings.push(`unparsed schedule: ${JSON.stringify(h)}`);
    }
  }
  return {
    schedules,
    scheduleText: texts.length ? texts.join("; ") : null,
    warnings,
  };
}

function loadSourceDistricts(slugPattern = "distrito-{number}") {
  const found = [];
  for (const rel of SOURCE_FILES) {
    const abs = path.join(root, rel);
    const arr = JSON.parse(fs.readFileSync(abs, "utf8"));
    const recs = arr.filter(
      (r) => typeof r?.id === "string" && /-distrito$/i.test(r.id),
    );
    if (recs.length !== 1) {
      throw new Error(
        `${rel}: expected exactly 1 district record, found ${recs.length}`,
      );
    }
    const r = recs[0];
    const number = Number(r.distrito);
    if (!Number.isInteger(number)) {
      throw new Error(
        `${rel}: invalid district number ${JSON.stringify(r.distrito)}`,
      );
    }
    const dir = r.direccion || {};
    const { schedules, scheduleText, warnings } = transformSchedules(
      r.horarios,
    );
    found.push({
      source: rel,
      v1Id: r.id,
      number,
      name: String(r.nombre ?? "").trim(),
      slug: slugPattern.replace("{number}", String(number)),
      description: null,
      location: {
        linea1: String(dir.linea1 ?? "").trim(),
        colonia: String(dir.colonia ?? "").trim(),
        referencias: String(dir.referencias ?? "").trim(),
        ciudad: String(dir.ciudad ?? "").trim(),
        estado: String(dir.estado ?? "").trim(),
        mapQuery: String(r.mapQuery ?? "").trim(),
      },
      schedules,
      scheduleText,
      isActive: true,
      warnings,
    });
  }
  return found;
}

function validate(districts) {
  const errors = [];
  const numbers = districts.map((d) => d.number).sort((a, b) => a - b);
  if (JSON.stringify(numbers) !== JSON.stringify(VALID_NUMBERS)) {
    errors.push(
      `district numbers ${numbers.join(",")} != ${VALID_NUMBERS.join(",")}`,
    );
  }
  for (const d of districts) {
    if (d.number === 3 || d.number === 6)
      errors.push(`forbidden district ${d.number}`);
    if (!d.name) errors.push(`district ${d.number}: empty name`);
    if (!d.slug) errors.push(`district ${d.number}: empty slug`);
    if (!d.location.linea1)
      errors.push(`district ${d.number}: empty location.linea1`);
  }
  const slugs = districts.map((d) => d.slug);
  if (new Set(slugs).size !== slugs.length)
    errors.push("duplicate slugs in source");
  return errors;
}

// --------------------------------------------------------------------------
// PB reconciliation
// --------------------------------------------------------------------------

const COMPARABLE = [
  "name",
  "number",
  "slug",
  "description",
  "location",
  "schedules",
  "scheduleText",
  "isActive",
];
const NULLABLE_TEXT_FIELDS = new Set(["description", "scheduleText"]);

/** Canonical stringify with sorted object keys, so JSON field key order does
 * not produce false "changed" results when re-running (idempotency). */
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canonical(v[k]);
    return out;
  }
  return v;
}

function sameValue(a, b) {
  return (
    JSON.stringify(canonical(a) ?? null) ===
    JSON.stringify(canonical(b) ?? null)
  );
}

function diffPayload(existing, payload) {
  const changed = {};
  for (const k of COMPARABLE) {
    const existingValue =
      NULLABLE_TEXT_FIELDS.has(k) && existing[k] === "" ? null : existing[k];
    const payloadValue =
      NULLABLE_TEXT_FIELDS.has(k) && payload[k] === "" ? null : payload[k];
    if (!sameValue(existingValue, payloadValue)) changed[k] = payload[k];
  }
  return changed;
}

async function listExistingDistricts(baseUrl, requestFn = request) {
  const items = [];
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      page: String(page),
      perPage: "200",
      sort: "number,id",
    });
    const list = await requestFn(baseUrl, `${API_DISTRICTS}?${query}`);
    const pageItems = Array.isArray(list?.items) ? list.items : [];
    items.push(...pageItems);
    const totalPages = Number(list?.totalPages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error("invalid districts pagination response");
    }
    if (totalPages === 0 && page === 1 && pageItems.length === 0) return items;
    if (totalPages === 0)
      throw new Error("invalid districts pagination response");
    if (page >= totalPages) return items;
  }
}

function buildReconciliationPlan(districts, existing) {
  const bySlug = new Map();
  const byNumber = new Map();
  const duplicateSlugs = new Set();
  const duplicateNumbers = new Set();
  for (const it of existing) {
    if (it.slug) {
      if (bySlug.has(it.slug)) duplicateSlugs.add(it.slug);
      else bySlug.set(it.slug, it);
    }
    if (byNumber.has(it.number)) duplicateNumbers.add(it.number);
    else byNumber.set(it.number, it);
  }
  const plan = [];
  for (const d of districts) {
    const bySlugHit = bySlug.get(d.slug);
    const byNumberHit = byNumber.get(d.number);
    if (duplicateSlugs.has(d.slug) || duplicateNumbers.has(d.number)) {
      plan.push({
        action: "conflict",
        district: d,
        note: `destination has duplicate records for slug "${d.slug}" or number ${d.number}`,
      });
    } else if (bySlugHit && byNumberHit && bySlugHit.id !== byNumberHit.id) {
      plan.push({
        action: "conflict",
        district: d,
        note: `slug "${d.slug}" and number ${d.number} belong to different records`,
      });
    } else if (bySlugHit && bySlugHit.number !== d.number) {
      plan.push({
        action: "conflict",
        district: d,
        existingId: bySlugHit.id,
        note: `slug "${d.slug}" already uses number ${bySlugHit.number}`,
      });
    } else if (bySlugHit) {
      const changed = diffPayload(bySlugHit, d);
      plan.push({
        action: Object.keys(changed).length ? "update" : "unchanged",
        district: d,
        existingId: bySlugHit.id,
        changed,
      });
    } else if (byNumberHit) {
      plan.push({
        action: "conflict",
        district: d,
        existingId: byNumberHit.id,
        note: `number ${d.number} already used by slug "${byNumberHit.slug}"`,
      });
    } else {
      plan.push({ action: "create", district: d });
    }
  }
  return plan;
}

async function reconcile(districts, baseUrl, requestFn = request) {
  return buildReconciliationPlan(
    districts,
    await listExistingDistricts(baseUrl, requestFn),
  );
}

async function authenticate(baseUrl, requestFn = request, env = process.env) {
  const email = reqEnv("PB_SUPERUSER_EMAIL", env);
  const pass = reqEnv("PB_SUPERUSER_PASSWORD", env);
  const auth = await requestFn(baseUrl, API_SUPERUSER_AUTH, {
    method: "POST",
    body: { identity: email, password: pass },
  });
  return auth.token;
}

async function runMigration({
  baseUrl,
  apply = false,
  jsonOut = false,
  slugPattern = "distrito-{number}",
  requestFn = request,
  env = process.env,
  logger = console,
} = {}) {
  if (!baseUrl) {
    throw new Error(
      "No PocketBase URL. Set PB_URL / PUBLIC_POCKETBASE_URL or pass --base-url.",
    );
  }
  logger.log(
    `[MODE] ${apply ? "APPLY" : "DRY-RUN"}  base=${displayBaseUrl(baseUrl)}`,
  );
  logger.log(`[SLUG] pattern: ${slugPattern}`);

  const districts = loadSourceDistricts(slugPattern);
  const errors = validate(districts);
  if (errors.length) {
    for (const e of errors) logger.error(`[VALIDATION] ${e}`);
    throw new Error("source validation failed; aborting");
  }

  logger.log("[SOURCE]");
  for (const d of districts) {
    logger.log(
      `  - #${d.number} "${d.name}" slug="${d.slug}" (${d.source}) ` +
        `schedules=${d.schedules.length} scheduleText=${d.scheduleText ? JSON.stringify(d.scheduleText) : "null"}`,
    );
    for (const w of d.warnings) logger.warn(`      [WARN] ${w}`);
  }

  if (jsonOut) {
    logger.log("[PAYLOADS]");
    logger.log(JSON.stringify(districts.map(payloadOf), null, 2));
  }

  const plan = await reconcile(districts, baseUrl, requestFn);
  logger.log("[PLAN]");
  for (const p of plan) {
    if (p.action === "create") {
      logger.log(
        `  CREATE #${p.district.number} "${p.district.name}" (slug=${p.district.slug})`,
      );
    } else if (p.action === "update") {
      logger.log(
        `  UPDATE #${p.district.number} "${p.district.name}" (id=${p.existingId}) fields: ${Object.keys(p.changed).join(", ")}`,
      );
    } else if (p.action === "unchanged") {
      logger.log(
        `  UNCHANGED #${p.district.number} "${p.district.name}" (id=${p.existingId})`,
      );
    } else if (p.action === "conflict") {
      logger.log(
        `  CONFLICT #${p.district.number} "${p.district.name}": ${p.note}`,
      );
    }
  }

  const conflicts = plan.filter((p) => p.action === "conflict");
  if (conflicts.length)
    throw new Error("unresolved conflicts; refusing to apply");

  const toCreate = plan.filter((p) => p.action === "create");
  const toUpdate = plan.filter((p) => p.action === "update");

  if (!apply) {
    logger.log(
      `[DRY-RUN] would create ${toCreate.length}, update ${toUpdate.length}, leave ${plan.length - toCreate.length - toUpdate.length} unchanged. No writes performed.`,
    );
    return plan;
  }

  const token = await authenticate(baseUrl, requestFn, env);
  for (const p of toCreate) {
    const created = await requestFn(baseUrl, API_DISTRICTS, {
      method: "POST",
      token,
      body: payloadOf(p.district),
    });
    logger.log(`  CREATED #${p.district.number} -> ${created.id}`);
  }
  for (const p of toUpdate) {
    await requestFn(baseUrl, `${API_DISTRICTS}/${p.existingId}`, {
      method: "PATCH",
      token,
      body: p.changed,
    });
    logger.log(`  UPDATED #${p.district.number} -> ${p.existingId}`);
  }
  logger.log(
    `[APPLY] done. created=${toCreate.length} updated=${toUpdate.length}`,
  );
  return plan;
}

async function main(argv = process.argv) {
  loadDotEnv();
  const baseUrl =
    getArg("--base-url", argv) ||
    process.env.PB_URL ||
    process.env.PUBLIC_POCKETBASE_URL ||
    "";
  return runMigration({
    baseUrl,
    apply: argv.includes("--apply"),
    jsonOut: argv.includes("--json"),
    slugPattern: getArg("--slug", argv) || "distrito-{number}",
  });
}

function payloadOf(d) {
  return {
    name: d.name,
    number: d.number,
    slug: d.slug,
    description: d.description,
    location: d.location,
    schedules: d.schedules,
    scheduleText: d.scheduleText,
    isActive: d.isActive,
  };
}

export {
  parseDays,
  transformSchedules,
  stripAccents,
  loadSourceDistricts,
  validate,
  canonical,
  sameValue,
  diffPayload,
  payloadOf,
  getArg,
  loadDotEnv,
  VALID_NUMBERS,
  SOURCE_FILES,
};

export {
  request,
  displayBaseUrl,
  listExistingDistricts,
  buildReconciliationPlan,
  reconcile,
  authenticate,
  runMigration,
  main,
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
