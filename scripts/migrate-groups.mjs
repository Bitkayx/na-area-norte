#!/usr/bin/env node
/**
 * Migrates the 43 V1 meeting groups into PocketBase.
 *
 * Dry-run by default. `--apply` is the only mode that authenticates or writes.
 * District relations are resolved from the live `districts` collection by
 * number; PocketBase record IDs are never hardcoded.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  displayBaseUrl,
  loadDotEnv,
  request,
  sameValue,
  transformSchedules,
} from "./migrate-districts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALID_NUMBERS = [1, 2, 4, 5];
const EXPECTED_COUNTS = new Map([
  [1, 9],
  [2, 10],
  [4, 13],
  [5, 11],
]);
const SOURCE_FILES = VALID_NUMBERS.map(
  (number) => `src/data/grupos/distrito${number}.json`,
);
const API_DISTRICTS = "/api/collections/districts/records";
const API_GROUPS = "/api/collections/groups/records";
const API_AUTH = "/api/collections/_superusers/auth-with-password";
const COMPARABLE = [
  "name",
  "slug",
  "location",
  "schedules",
  "scheduleText",
  "notes",
  "isActive",
  "district",
];
const NULLABLE_TEXT_FIELDS = new Set(["scheduleText", "notes"]);

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function scheduleTextOf(horarios) {
  if (!Array.isArray(horarios) || horarios.length === 0) return null;
  const values = horarios
    .map((item) =>
      `${item?.dias ?? ""} ${item?.horaInicio ?? ""}-${item?.horaFin ?? ""}`.trim(),
    )
    .filter(Boolean);
  return values.length ? values.join("; ") : null;
}

function loadSourceGroups() {
  const rawGroups = [];
  for (const rel of SOURCE_FILES) {
    const fileNumber = Number(rel.match(/distrito(\d+)\.json$/)?.[1]);
    const records = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    for (const record of records) {
      if (typeof record?.id === "string" && /-distrito$/i.test(record.id)) {
        continue;
      }
      rawGroups.push({ record, source: rel, fileNumber });
    }
  }

  const names = Map.groupBy(rawGroups, ({ record }) =>
    normalizeName(record.nombre),
  );

  return rawGroups.map(({ record, source, fileNumber }) => {
    const number = Number(record.distrito);
    const duplicateName =
      (names.get(normalizeName(record.nombre))?.length ?? 0) > 1;
    const baseSlug = String(record.id ?? "").trim();
    const districtSuffix = `-d${number}`;
    const slug =
      duplicateName && !baseSlug.endsWith(districtSuffix)
        ? `${baseSlug}${districtSuffix}`
        : baseSlug;
    const horarios = Array.isArray(record.horarios) ? record.horarios : [];
    const schedules = [];
    const warnings = [];
    for (const horario of horarios) {
      const transformed = transformSchedules([horario]);
      schedules.push(...transformed.schedules);
      warnings.push(...transformed.warnings);
    }
    const address = record.direccion ?? {};
    return {
      source,
      v1Id: baseSlug,
      fileNumber,
      number,
      name: String(record.nombre ?? "").trim(),
      slug,
      location: {
        linea1: String(address.linea1 ?? "").trim(),
        colonia: String(address.colonia ?? "").trim(),
        referencias: String(address.referencias ?? "").trim(),
        ciudad: String(address.ciudad ?? "").trim(),
        estado: String(address.estado ?? "").trim(),
        mapQuery: String(record.mapQuery ?? "").trim(),
      },
      schedules,
      scheduleText: scheduleTextOf(horarios),
      notes: null,
      isActive: true,
      warnings,
    };
  });
}

function validate(groups) {
  const errors = [];
  if (groups.length !== 43)
    errors.push(`expected 43 groups, found ${groups.length}`);
  for (const number of VALID_NUMBERS) {
    const count = groups.filter((group) => group.number === number).length;
    if (count !== EXPECTED_COUNTS.get(number)) {
      errors.push(
        `district ${number}: expected ${EXPECTED_COUNTS.get(number)}, found ${count}`,
      );
    }
  }
  for (const group of groups) {
    if (!VALID_NUMBERS.includes(group.number)) {
      errors.push(`${group.v1Id}: forbidden district ${group.number}`);
    }
    if (group.number !== group.fileNumber) {
      errors.push(
        `${group.v1Id}: district ${group.number} does not match source file`,
      );
    }
    if (!group.v1Id || !group.name || !group.slug) {
      errors.push(`${group.v1Id || "(missing id)"}: missing identity field`);
    }
    if (!group.location.linea1 || !group.location.mapQuery) {
      errors.push(`${group.v1Id}: incomplete location`);
    }
    if (group.warnings.length) {
      errors.push(`${group.v1Id}: ${group.warnings.join(", ")}`);
    }
  }
  const slugs = groups.map((group) => group.slug);
  if (new Set(slugs).size !== slugs.length)
    errors.push("duplicate slugs in source");
  const sourceScheduleCount = groups.reduce(
    (total, group) =>
      total + (group.scheduleText ? group.scheduleText.split("; ").length : 0),
    0,
  );
  const structuredCount = groups.reduce(
    (total, group) => total + group.schedules.length,
    0,
  );
  if (sourceScheduleCount !== 73 || structuredCount !== 73) {
    errors.push(
      `expected 73 preserved schedules, found text=${sourceScheduleCount} structured=${structuredCount}`,
    );
  }
  return errors;
}

async function listAll(baseUrl, apiPath, requestFn = request) {
  const items = [];
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      page: String(page),
      perPage: "200",
      sort: "id",
    });
    const result = await requestFn(baseUrl, `${apiPath}?${query}`);
    const pageItems = Array.isArray(result?.items) ? result.items : [];
    const totalPages = Number(result?.totalPages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error(`invalid pagination response for ${apiPath}`);
    }
    items.push(...pageItems);
    if (totalPages === 0 && page === 1 && pageItems.length === 0) return items;
    if (totalPages === 0)
      throw new Error(`invalid pagination response for ${apiPath}`);
    if (page >= totalPages) return items;
  }
}

function resolveDistricts(groups, existingDistricts) {
  const byNumber = new Map();
  const duplicates = new Set();
  for (const district of existingDistricts) {
    if (byNumber.has(district.number)) duplicates.add(district.number);
    else byNumber.set(district.number, district);
  }
  const errors = [];
  for (const number of VALID_NUMBERS) {
    const district = byNumber.get(number);
    if (!district) errors.push(`missing destination district ${number}`);
    if (duplicates.has(number))
      errors.push(`duplicate destination district ${number}`);
  }
  const forbidden = existingDistricts.filter((district) =>
    [3, 6].includes(district.number),
  );
  if (forbidden.length)
    errors.push("destination contains forbidden district 3 or 6");
  if (errors.length) return { errors, groups: [] };
  return {
    errors,
    groups: groups.map((group) => ({
      ...group,
      district: byNumber.get(group.number).id,
    })),
  };
}

function comparableValue(field, value) {
  return NULLABLE_TEXT_FIELDS.has(field) && value === "" ? null : value;
}

function diffPayload(existing, payload) {
  const changed = {};
  for (const field of COMPARABLE) {
    if (
      !sameValue(
        comparableValue(field, existing[field]),
        comparableValue(field, payload[field]),
      )
    ) {
      changed[field] = payload[field];
    }
  }
  return changed;
}

function buildReconciliationPlan(groups, existingGroups) {
  const bySlug = new Map();
  const duplicateSlugs = new Set();
  const byIdentity = new Map();
  const duplicateIdentities = new Set();
  for (const group of existingGroups) {
    if (bySlug.has(group.slug)) duplicateSlugs.add(group.slug);
    else bySlug.set(group.slug, group);
    const identity = `${group.district}:${normalizeName(group.name)}`;
    if (byIdentity.has(identity)) duplicateIdentities.add(identity);
    else byIdentity.set(identity, group);
  }

  return groups.map((group) => {
    const payload = payloadOf(group);
    const slugHit = bySlug.get(group.slug);
    const identity = `${group.district}:${normalizeName(group.name)}`;
    const identityHit = byIdentity.get(identity);
    if (duplicateSlugs.has(group.slug) || duplicateIdentities.has(identity)) {
      return {
        action: "conflict",
        group,
        note: "duplicate destination identity",
      };
    }
    if (slugHit && identityHit && slugHit.id !== identityHit.id) {
      return {
        action: "conflict",
        group,
        note: "slug and identity belong to different records",
      };
    }
    if (
      slugHit &&
      (slugHit.district !== group.district ||
        normalizeName(slugHit.name) !== normalizeName(group.name))
    ) {
      return {
        action: "conflict",
        group,
        note: "slug belongs to another group",
      };
    }
    if (!slugHit && identityHit) {
      return {
        action: "conflict",
        group,
        note: `group already exists with slug "${identityHit.slug}"`,
      };
    }
    if (!slugHit) return { action: "create", group };
    const changed = diffPayload(slugHit, payload);
    return {
      action: Object.keys(changed).length ? "update" : "unchanged",
      group,
      existingId: slugHit.id,
      changed,
    };
  });
}

function payloadOf(group) {
  return {
    name: group.name,
    slug: group.slug,
    location: group.location,
    schedules: group.schedules,
    scheduleText: group.scheduleText,
    notes: group.notes,
    isActive: group.isActive,
    district: group.district,
  };
}

async function authenticate(baseUrl, requestFn, env) {
  const identity = env.PB_SUPERUSER_EMAIL;
  const password = env.PB_SUPERUSER_PASSWORD;
  if (!identity || !password)
    throw new Error("missing PocketBase superuser credentials");
  const result = await requestFn(baseUrl, API_AUTH, {
    method: "POST",
    body: { identity, password },
  });
  return result.token;
}

async function runMigration({
  baseUrl,
  apply = false,
  jsonOut = false,
  requestFn = request,
  env = process.env,
  logger = console,
} = {}) {
  if (!baseUrl) throw new Error("No PocketBase URL configured");
  logger.log(
    `[MODE] ${apply ? "APPLY" : "DRY-RUN"}  base=${displayBaseUrl(baseUrl)}`,
  );

  const sourceGroups = loadSourceGroups();
  const sourceErrors = validate(sourceGroups);
  if (sourceErrors.length) {
    sourceErrors.forEach((error) => logger.error(`[VALIDATION] ${error}`));
    throw new Error("source validation failed; aborting");
  }

  const districts = await listAll(baseUrl, API_DISTRICTS, requestFn);
  const resolved = resolveDistricts(sourceGroups, districts);
  if (resolved.errors.length) {
    resolved.errors.forEach((error) => logger.error(`[RELATION] ${error}`));
    throw new Error("district relation validation failed; aborting");
  }
  const existingGroups = await listAll(baseUrl, API_GROUPS, requestFn);
  const plan = buildReconciliationPlan(resolved.groups, existingGroups);

  if (jsonOut)
    logger.log(JSON.stringify(resolved.groups.map(payloadOf), null, 2));
  for (const item of plan) {
    logger.log(
      `[PLAN] ${item.action.toUpperCase()} ${item.group.slug}` +
        (item.note ? `: ${item.note}` : ""),
    );
  }
  if (plan.some((item) => item.action === "conflict")) {
    throw new Error("unresolved conflicts; refusing to apply");
  }

  const creates = plan.filter((item) => item.action === "create");
  const updates = plan.filter((item) => item.action === "update");
  if (!apply) {
    logger.log(
      `[DRY-RUN] would create ${creates.length}, update ${updates.length}, leave ${plan.length - creates.length - updates.length} unchanged. No writes performed.`,
    );
    return plan;
  }

  const token = await authenticate(baseUrl, requestFn, env);
  for (const item of creates) {
    const created = await requestFn(baseUrl, API_GROUPS, {
      method: "POST",
      token,
      body: payloadOf(item.group),
    });
    logger.log(`[CREATED] ${item.group.slug} -> ${created.id}`);
  }
  for (const item of updates) {
    await requestFn(baseUrl, `${API_GROUPS}/${item.existingId}`, {
      method: "PATCH",
      token,
      body: item.changed,
    });
    logger.log(`[UPDATED] ${item.group.slug} -> ${item.existingId}`);
  }
  logger.log(
    `[APPLY] done. created=${creates.length} updated=${updates.length}`,
  );
  return plan;
}

async function main(argv = process.argv) {
  loadDotEnv();
  return runMigration({
    baseUrl:
      getArg("--base-url", argv) ||
      process.env.PB_URL ||
      process.env.PUBLIC_POCKETBASE_URL ||
      "",
    apply: argv.includes("--apply"),
    jsonOut: argv.includes("--json"),
  });
}

export {
  VALID_NUMBERS,
  EXPECTED_COUNTS,
  SOURCE_FILES,
  normalizeName,
  scheduleTextOf,
  loadSourceGroups,
  validate,
  listAll,
  resolveDistricts,
  diffPayload,
  buildReconciliationPlan,
  payloadOf,
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
