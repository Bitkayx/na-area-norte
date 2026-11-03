#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { displayBaseUrl, loadDotEnv, request } from "./migrate-districts.mjs";

const COLLECTION = "radio_broadcasts";
const API_COLLECTION = `/api/collections/${COLLECTION}`;
const API_RECORDS = `${API_COLLECTION}/records`;
const API_AUTH = "/api/collections/_superusers/auth-with-password";
const OLD_INDEX =
  "CREATE UNIQUE INDEX idx_radio_week ON radio_broadcasts (week)";
const NEW_INDEX =
  "CREATE UNIQUE INDEX idx_radio_date ON radio_broadcasts (broadcastDate)";

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function buildSchemaPlan(collection, totalRecords) {
  const errors = [];
  if (collection?.name !== COLLECTION)
    errors.push(`expected collection ${COLLECTION}`);
  if (totalRecords !== 0)
    errors.push(
      `collection contains ${totalRecords} record(s); refusing destructive field replacement`,
    );
  const fields = Array.isArray(collection?.fields) ? collection.fields : [];
  const weekFields = fields.filter((field) => field.name === "week");
  const dateFields = fields.filter((field) => field.name === "broadcastDate");
  if (weekFields.length !== 1)
    errors.push(`expected exactly one week field, found ${weekFields.length}`);
  if (dateFields.length)
    errors.push(
      "broadcastDate already exists; use inspection instead of this one-time migration",
    );
  const indexes = Array.isArray(collection?.indexes) ? collection.indexes : [];
  if (!indexes.includes(OLD_INDEX))
    errors.push("expected idx_radio_week was not found exactly");
  if (indexes.includes(NEW_INDEX)) errors.push("idx_radio_date already exists");
  if (errors.length) return { errors, fields: [], indexes: [] };
  return {
    errors,
    fields: fields.map((field) =>
      field.name === "week"
        ? { name: "broadcastDate", type: "date", required: true }
        : field,
    ),
    indexes: indexes.map((index) => (index === OLD_INDEX ? NEW_INDEX : index)),
  };
}

async function authenticate(baseUrl, requestFn, env) {
  if (!env.PB_SUPERUSER_EMAIL || !env.PB_SUPERUSER_PASSWORD)
    throw new Error("missing PocketBase superuser credentials");
  const auth = await requestFn(baseUrl, API_AUTH, {
    method: "POST",
    body: {
      identity: env.PB_SUPERUSER_EMAIL,
      password: env.PB_SUPERUSER_PASSWORD,
    },
  });
  return auth.token;
}

async function runSchemaMigration({
  baseUrl,
  apply = false,
  requestFn = request,
  env = process.env,
  logger = console,
} = {}) {
  if (!baseUrl) throw new Error("No PocketBase URL configured");
  logger.log(
    `[MODE] ${apply ? "APPLY" : "DRY-RUN"} base=${displayBaseUrl(baseUrl)}`,
  );
  const token = await authenticate(baseUrl, requestFn, env);
  const collection = await requestFn(baseUrl, API_COLLECTION, { token });
  const records = await requestFn(baseUrl, `${API_RECORDS}?page=1&perPage=1`, {
    token,
  });
  const plan = buildSchemaPlan(collection, Number(records?.totalItems ?? 0));
  if (plan.errors.length) {
    plan.errors.forEach((error) => logger.error(`[VALIDATION] ${error}`));
    throw new Error("schema preconditions failed; refusing to continue");
  }
  logger.log(
    "[PLAN] replace required number field week with required date field broadcastDate",
  );
  logger.log("[PLAN] replace unique index idx_radio_week with idx_radio_date");
  logger.log(
    "[PLAN] preserve all other fields, relation, indexes and access rules",
  );
  if (!apply) {
    logger.log(
      "[DRY-RUN] collection is empty; one schema PATCH would be performed. No writes performed.",
    );
    return plan;
  }
  await requestFn(baseUrl, `${API_COLLECTION}`, {
    method: "PATCH",
    token,
    body: { fields: plan.fields, indexes: plan.indexes },
  });
  logger.log("[APPLY] radio_broadcasts schema updated");
  return plan;
}

async function main(argv = process.argv) {
  loadDotEnv();
  return runSchemaMigration({
    baseUrl:
      getArg("--base-url", argv) ||
      process.env.PB_URL ||
      process.env.PUBLIC_POCKETBASE_URL ||
      "",
    apply: argv.includes("--apply"),
  });
}

export { OLD_INDEX, NEW_INDEX, buildSchemaPlan, runSchemaMigration, main };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
