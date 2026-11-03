#!/usr/bin/env node
/**
 * Adds the approved optional `stock` NumberField to the literature collection.
 * Dry-run by default. Preserves every existing field and index; never changes
 * access rules. Refuses to proceed when records already exist or the field has
 * an unexpected shape.
 */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { displayBaseUrl, loadDotEnv, request } from "./migrate-districts.mjs";

const COLLECTION = "literature";
const API_COLLECTION = `/api/collections/${COLLECTION}`;
const API_RECORDS = `${API_COLLECTION}/records`;
const API_AUTH = "/api/collections/_superusers/auth-with-password";
const STOCK_FIELD = {
  name: "stock",
  type: "number",
  required: false,
  min: 0,
  onlyInt: true,
};

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function buildSchemaPlan(collection, totalRecords) {
  const errors = [];
  if (collection?.name !== COLLECTION)
    errors.push(`expected collection ${COLLECTION}`);
  if (!Number.isInteger(totalRecords) || totalRecords < 0)
    errors.push("invalid destination record count");
  if (totalRecords > 0)
    errors.push(
      `collection contains ${totalRecords} record(s); refusing to add stock to a populated collection`,
    );

  const fields = Array.isArray(collection?.fields) ? collection.fields : [];
  const stockFields = fields.filter((field) => field.name === "stock");
  if (stockFields.length > 1)
    errors.push(
      `expected at most one stock field, found ${stockFields.length}`,
    );
  if (stockFields.length === 1) {
    const field = stockFields[0];
    const matches =
      field.type === STOCK_FIELD.type &&
      field.required === STOCK_FIELD.required &&
      Number(field.min) === STOCK_FIELD.min &&
      field.onlyInt === STOCK_FIELD.onlyInt;
    if (!matches)
      errors.push("literature.stock exists with an unexpected shape");
  }

  const indexes = Array.isArray(collection?.indexes) ? collection.indexes : [];
  if (errors.length) return { errors, action: "conflict", fields: [], indexes };
  if (stockFields.length === 1)
    return { errors, action: "unchanged", fields, indexes };
  return {
    errors,
    action: "add-stock",
    fields: [...fields, { ...STOCK_FIELD }],
    indexes,
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
  const plan = buildSchemaPlan(collection, Number(records?.totalItems ?? NaN));
  if (plan.errors.length) {
    plan.errors.forEach((error) => logger.error(`[VALIDATION] ${error}`));
    throw new Error("schema preconditions failed; refusing to continue");
  }

  if (plan.action === "unchanged") {
    logger.log("[PLAN] literature.stock already has the approved shape");
    return plan;
  }
  logger.log(
    "[PLAN] add optional integer NumberField literature.stock (min=0)",
  );
  logger.log("[PLAN] preserve all existing fields and indexes");
  logger.log("[PLAN] do not include or modify access rules");
  if (!apply) {
    logger.log(
      "[DRY-RUN] one collection PATCH would be performed. No writes performed.",
    );
    return plan;
  }
  await requestFn(baseUrl, API_COLLECTION, {
    method: "PATCH",
    token,
    body: { fields: plan.fields, indexes: plan.indexes },
  });
  logger.log("[APPLY] literature.stock added");
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

export { COLLECTION, STOCK_FIELD, buildSchemaPlan, runSchemaMigration, main };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
