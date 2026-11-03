#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  displayBaseUrl,
  loadDotEnv,
  request,
  sameValue,
} from "./migrate-districts.mjs";
import { parseRadioSchedule } from "./prepare-radio-schedule.mjs";

const API_DISTRICTS = "/api/collections/districts/records";
const API_RADIO = "/api/collections/radio_broadcasts/records";
const API_AUTH = "/api/collections/_superusers/auth-with-password";
const FIELDS = [
  "broadcastDate",
  "ownerIsAreaNorte",
  "time",
  "link",
  "note",
  "district",
];

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

async function listAll(baseUrl, apiPath, requestFn = request) {
  const result = await requestFn(
    baseUrl,
    `${apiPath}?page=1&perPage=200&sort=id`,
  );
  if (Number(result?.totalPages ?? 1) > 1)
    throw new Error(`unexpected pagination for ${apiPath}`);
  return Array.isArray(result?.items) ? result.items : [];
}

function resolveDistricts(entries, districts) {
  const byNumber = new Map();
  const errors = [];
  for (const district of districts) {
    if (byNumber.has(district.number))
      errors.push(`duplicate destination district ${district.number}`);
    byNumber.set(district.number, district.id);
  }
  const resolved = entries.map((entry) => {
    const district =
      entry.districtNumber == null ? null : byNumber.get(entry.districtNumber);
    if (entry.districtNumber != null && !district)
      errors.push(`missing destination district ${entry.districtNumber}`);
    return { ...entry, district: district ?? null };
  });
  return { entries: resolved, errors };
}

function payloadOf(entry) {
  return {
    broadcastDate: `${entry.broadcastDate} 00:00:00.000Z`,
    ownerIsAreaNorte: entry.ownerIsAreaNorte,
    time: entry.time,
    link: entry.link,
    note: entry.note,
    district: entry.district,
  };
}

function comparable(value) {
  return value === "" ? null : value;
}

function buildPlan(entries, existing) {
  const byDate = new Map();
  const duplicates = new Set();
  for (const record of existing) {
    const date = String(record.broadcastDate ?? "").slice(0, 10);
    if (byDate.has(date)) duplicates.add(date);
    else byDate.set(date, record);
  }
  return entries.map((entry) => {
    const found = byDate.get(entry.broadcastDate);
    if (duplicates.has(entry.broadcastDate))
      return { action: "conflict", entry, note: "duplicate destination date" };
    if (!found) return { action: "create", entry };
    const payload = payloadOf(entry);
    const changed = Object.fromEntries(
      FIELDS.filter(
        (field) =>
          !sameValue(comparable(found[field]), comparable(payload[field])),
      ).map((field) => [field, payload[field]]),
    );
    return {
      action: Object.keys(changed).length ? "update" : "unchanged",
      entry,
      existingId: found.id,
      changed,
    };
  });
}

async function authenticate(baseUrl, requestFn, env) {
  if (!env.PB_SUPERUSER_EMAIL || !env.PB_SUPERUSER_PASSWORD)
    throw new Error("missing PocketBase superuser credentials");
  return (
    await requestFn(baseUrl, API_AUTH, {
      method: "POST",
      body: {
        identity: env.PB_SUPERUSER_EMAIL,
        password: env.PB_SUPERUSER_PASSWORD,
      },
    })
  ).token;
}

async function runMigration({
  baseUrl,
  text,
  year,
  apply = false,
  requestFn = request,
  env = process.env,
  logger = console,
} = {}) {
  if (!baseUrl) throw new Error("No PocketBase URL configured");
  const parsed = parseRadioSchedule(text, year);
  if (parsed.errors.length) throw new Error(parsed.errors.join("; "));
  logger.log(
    `[MODE] ${apply ? "APPLY" : "DRY-RUN"} base=${displayBaseUrl(baseUrl)}`,
  );
  const districts = await listAll(baseUrl, API_DISTRICTS, requestFn);
  const resolved = resolveDistricts(parsed.entries, districts);
  if (resolved.errors.length) throw new Error(resolved.errors.join("; "));
  const existing = await listAll(baseUrl, API_RADIO, requestFn);
  const plan = buildPlan(resolved.entries, existing);
  for (const item of plan)
    logger.log(
      `[PLAN] ${item.action.toUpperCase()} ${item.entry.broadcastDate} ${item.entry.ownerLabel}`,
    );
  if (plan.some((item) => item.action === "conflict"))
    throw new Error("unresolved conflicts; refusing to apply");
  const creates = plan.filter((item) => item.action === "create");
  const updates = plan.filter((item) => item.action === "update");
  if (!apply) {
    logger.log(
      `[DRY-RUN] would create ${creates.length}, update ${updates.length}, leave ${plan.length - creates.length - updates.length} unchanged. No writes performed.`,
    );
    return plan;
  }
  const token = await authenticate(baseUrl, requestFn, env);
  for (const item of creates)
    await requestFn(baseUrl, API_RADIO, {
      method: "POST",
      token,
      body: payloadOf(item.entry),
    });
  for (const item of updates)
    await requestFn(baseUrl, `${API_RADIO}/${item.existingId}`, {
      method: "PATCH",
      token,
      body: item.changed,
    });
  logger.log(
    `[APPLY] done. created=${creates.length} updated=${updates.length}`,
  );
  return plan;
}

async function main(argv = process.argv) {
  loadDotEnv();
  const input = getArg("--input", argv);
  if (!input) throw new Error("falta --input <archivo>");
  return runMigration({
    baseUrl:
      getArg("--base-url", argv) ||
      process.env.PB_URL ||
      process.env.PUBLIC_POCKETBASE_URL ||
      "",
    text: fs.readFileSync(path.resolve(input), "utf8"),
    year: Number(getArg("--year", argv)),
    apply: argv.includes("--apply"),
  });
}

export { resolveDistricts, payloadOf, buildPlan, runMigration, main };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
