#!/usr/bin/env node
/** Add a multi-image upload field to posts without changing rules or indexes. */

import path from "node:path";
import { pathToFileURL } from "node:url";
import { displayBaseUrl, loadDotEnv, request } from "./migrate-districts.mjs";

const COLLECTION = "posts";
const API_COLLECTION = `/api/collections/${COLLECTION}`;
const API_AUTH = "/api/collections/_superusers/auth-with-password";
const IMAGE_FIELD = {
  name: "bodyImages",
  type: "file",
  required: false,
  maxSelect: 20,
  mimeTypes: ["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"],
};

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function buildSchemaPlan(collection) {
  const errors = [];
  if (collection?.name !== COLLECTION) errors.push(`expected collection ${COLLECTION}`);
  const fields = Array.isArray(collection?.fields) ? collection.fields : [];
  const matches = fields.filter((field) => field.name === IMAGE_FIELD.name);
  if (matches.length > 1) errors.push("duplicate posts.bodyImages fields");
  if (matches.length === 1) {
    const current = matches[0];
    if (current.type !== "file") errors.push("posts.bodyImages exists with an unexpected type");
    if (current.required !== false) errors.push("posts.bodyImages must remain optional");
    if (current.maxSelect !== IMAGE_FIELD.maxSelect) errors.push("posts.bodyImages has an unexpected maxSelect");
    const currentMimeTypes = Array.isArray(current.mimeTypes) ? [...current.mimeTypes].sort() : [];
    if (JSON.stringify(currentMimeTypes) !== JSON.stringify([...IMAGE_FIELD.mimeTypes].sort())) {
      errors.push("posts.bodyImages has an unexpected MIME allowlist");
    }
    if (errors.length) return { errors, action: "conflict", fields, indexes: collection.indexes ?? [] };
    return { errors, action: "unchanged", fields, indexes: collection.indexes ?? [] };
  }
  if (errors.length) return { errors, action: "conflict", fields, indexes: collection.indexes ?? [] };
  return {
    errors,
    action: "add-post-body-images",
    fields: [...fields, { ...IMAGE_FIELD, mimeTypes: [...IMAGE_FIELD.mimeTypes] }],
    indexes: Array.isArray(collection.indexes) ? collection.indexes : [],
  };
}

async function authenticate(baseUrl, requestFn, env) {
  if (!env.PB_SUPERUSER_EMAIL || !env.PB_SUPERUSER_PASSWORD)
    throw new Error("missing PocketBase superuser credentials");
  const auth = await requestFn(baseUrl, API_AUTH, {
    method: "POST",
    body: { identity: env.PB_SUPERUSER_EMAIL, password: env.PB_SUPERUSER_PASSWORD },
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
  logger.log(`[MODE] ${apply ? "APPLY" : "DRY-RUN"} base=${displayBaseUrl(baseUrl)}`);
  const token = await authenticate(baseUrl, requestFn, env);
  const collection = await requestFn(baseUrl, API_COLLECTION, { token });
  const plan = buildSchemaPlan(collection);
  if (plan.errors.length) {
    plan.errors.forEach((error) => logger.error(`[VALIDATION] ${error}`));
    throw new Error("schema preconditions failed; refusing to continue");
  }
  if (plan.action === "unchanged") {
    logger.log("[PLAN] posts.bodyImages already matches the approved file-field contract");
    return plan;
  }
  logger.log("[PLAN] add optional posts.bodyImages file field, max 20, image MIME types only");
  logger.log("[PLAN] preserve every existing field and index");
  logger.log("[PLAN] do not include or modify access rules");
  if (!apply) {
    logger.log("[DRY-RUN] one posts collection PATCH would be performed. No writes performed.");
    return plan;
  }
  await requestFn(baseUrl, API_COLLECTION, {
    method: "PATCH",
    token,
    body: { fields: plan.fields, indexes: plan.indexes },
  });
  logger.log("[APPLY] posts.bodyImages added");
  return plan;
}

async function main(argv = process.argv) {
  loadDotEnv();
  return runSchemaMigration({
    baseUrl: getArg("--base-url", argv) || process.env.PB_URL || process.env.PUBLIC_POCKETBASE_URL || "",
    apply: argv.includes("--apply"),
  });
}

export { API_COLLECTION, COLLECTION, IMAGE_FIELD, buildSchemaPlan, runSchemaMigration, main };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
