#!/usr/bin/env node
/**
 * Create-only first migration wave for approved V1 events.
 * Dry-run is the default. The script never updates existing Events or Posts.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  authenticate,
  displayBaseUrl,
  request,
} from "./migrate-districts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "src/data/events-2026-seed.json");
const API_EVENTS = "/api/collections/events/records";
const API_POSTS = "/api/collections/posts/records";
const PER_PAGE = 200;
const TYPES = new Set(["encuentro", "mave", "congreso", "asamblea", "invitacion", "otro"]);
const STATUSES = new Set(["active", "cancelled", "archived"]);
const LOCATION_KEYS = ["linea1", "colonia", "referencias", "ciudad", "estado", "mapQuery"];

function listAll(baseUrl, apiPath, requestFn = request, token) {
  return (async () => {
    const items = [];
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({
        page: String(page),
        perPage: String(PER_PAGE),
        sort: "id",
      });
      const result = await requestFn(baseUrl, `${apiPath}?${query}`, { token });
      const pageItems = Array.isArray(result?.items) ? result.items : [];
      const totalPages = Number(result?.totalPages ?? 1);
      if (!Number.isInteger(totalPages) || totalPages < 0) {
        throw new Error(`invalid pagination response for ${apiPath}`);
      }
      items.push(...pageItems);
      if (totalPages === 0 && page === 1 && pageItems.length === 0) return items;
      if (totalPages === 0) throw new Error(`invalid pagination response for ${apiPath}`);
      if (page >= totalPages) return items;
    }
  })();
}

function loadSeed(file = SOURCE) {
  const events = JSON.parse(fs.readFileSync(file, "utf8"));
  const errors = validateSeed(events);
  if (errors.length) throw new Error(`invalid Events seed:\n- ${errors.join("\n- ")}`);
  return events;
}

function validateSeed(events) {
  const errors = [];
  if (!Array.isArray(events) || events.length === 0) return ["expected a non-empty array"];
  const slugs = new Set();
  for (const [index, event] of events.entries()) {
    const at = `event ${index + 1}`;
    for (const key of ["title", "slug", "postSlug"]) {
      if (typeof event?.[key] !== "string" || !event[key].trim()) errors.push(`${at}: ${key} is required`);
    }
    if (typeof event?.slug === "string") {
      if (slugs.has(event.slug)) errors.push(`${at}: duplicate slug ${event.slug}`);
      slugs.add(event.slug);
    }
    if (!TYPES.has(event?.type)) errors.push(`${at}: unsupported type`);
    if (!STATUSES.has(event?.status)) errors.push(`${at}: unsupported status`);
    for (const key of ["startDate", "endDate"]) {
      if (!isDateOnly(event?.[key])) errors.push(`${at}: ${key} must be a valid YYYY-MM-DD date`);
    }
    if (isDateOnly(event?.startDate) && isDateOnly(event?.endDate) && event.endDate < event.startDate) {
      errors.push(`${at}: endDate precedes startDate`);
    }
    if (event?.location !== null && event?.location !== undefined) {
      if (typeof event.location !== "object" || Array.isArray(event.location)) {
        errors.push(`${at}: location must be an object or null`);
      } else {
        for (const key of LOCATION_KEYS) {
          if (typeof event.location[key] !== "string") errors.push(`${at}: location.${key} must be a string`);
        }
      }
    }
    if (typeof event?.source !== "string" || !event.source.trim()) errors.push(`${at}: source is required for traceability`);
  }
  return errors;
}

function isDateOnly(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function payloadFor(seed, post) {
  return {
    title: seed.title,
    slug: seed.slug,
    type: seed.type,
    startDate: `${seed.startDate} 00:00:00.000Z`,
    endDate: `${seed.endDate} 00:00:00.000Z`,
    location: seed.location ?? null,
    organizerName: "",
    description: "",
    program: "",
    status: seed.status,
    postRef: post.id,
  };
}

function normalizedField(value) {
  if (value === null || value === undefined || value === "") return null;
  return value;
}

function sameValue(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
      a.every((value, index) => sameValue(value, b[index]));
  }
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  return keysA.length === keysB.length && keysA.every((key, index) =>
    key === keysB[index] && sameValue(a[key], b[key]));
}

function buildPlan(seed, posts, existingEvents) {
  const postsBySlug = new Map();
  for (const post of posts) {
    const rows = postsBySlug.get(post.slug) ?? [];
    rows.push(post);
    postsBySlug.set(post.slug, rows);
  }
  const eventsBySlug = new Map();
  for (const event of existingEvents) {
    const rows = eventsBySlug.get(event.slug) ?? [];
    rows.push(event);
    eventsBySlug.set(event.slug, rows);
  }

  return seed.map((source) => {
    const matchingPosts = postsBySlug.get(source.postSlug) ?? [];
    if (matchingPosts.length !== 1) {
      return { action: "CONFLICT", slug: source.slug, reason: matchingPosts.length ? "post slug is duplicated" : "related post was not found" };
    }
    const payload = payloadFor(source, matchingPosts[0]);
    const matchingEvents = eventsBySlug.get(source.slug) ?? [];
    if (matchingEvents.length > 1) {
      return { action: "CONFLICT", slug: source.slug, reason: "event slug is duplicated" };
    }
    if (matchingEvents.length === 0) return { action: "CREATE", slug: source.slug, payload };

    const current = matchingEvents[0];
    const fields = Object.keys(payload);
    const unchanged = fields.every((key) => sameValue(normalizedField(current[key]), normalizedField(payload[key])));
    return unchanged
      ? { action: "UNCHANGED", slug: source.slug }
      : { action: "CONFLICT", slug: source.slug, reason: "existing event differs from create-only seed" };
  });
}

async function applyPlan(baseUrl, plan, requestFn = request, token) {
  const conflicts = plan.filter((item) => item.action === "CONFLICT");
  if (conflicts.length) throw new Error(`refusing apply with ${conflicts.length} conflict(s)`);
  const created = [];
  for (const item of plan) {
    if (item.action !== "CREATE") continue;
    const record = await requestFn(baseUrl, API_EVENTS, {
      method: "POST",
      token,
      body: item.payload,
    });
    created.push({ slug: item.slug, id: record.id });
  }
  return created;
}

async function runMigration({
  baseUrl,
  apply = false,
  requestFn = request,
  env = process.env,
  logger = console,
} = {}) {
  if (!baseUrl) throw new Error("No PocketBase URL. Set PB_URL / PUBLIC_POCKETBASE_URL.");
  const seed = loadSeed();
  logger.log(`[MODE] ${apply ? "APPLY" : "DRY-RUN"} base=${displayBaseUrl(baseUrl)}`);
  const [posts, events] = await Promise.all([
    listAll(baseUrl, API_POSTS, requestFn),
    listAll(baseUrl, API_EVENTS, requestFn),
  ]);
  const plan = buildPlan(seed, posts, events);
  logger.log(`[SOURCE] ${seed.length} approved event seeds; ${posts.length} posts; ${events.length} events`);
  for (const item of plan) logger.log(`[${item.action}] ${item.slug}${item.reason ? ` — ${item.reason}` : ""}`);
  const counts = Object.fromEntries(["CREATE", "UNCHANGED", "CONFLICT"].map((action) => [action, plan.filter((item) => item.action === action).length]));
  logger.log(`[SUMMARY] CREATE=${counts.CREATE} UNCHANGED=${counts.UNCHANGED} CONFLICT=${counts.CONFLICT}`);
  if (!apply) return { plan, counts };
  if (counts.CONFLICT) throw new Error("refusing apply: resolve all conflicts first");
  const token = await authenticate(baseUrl, requestFn, env);
  const created = await applyPlan(baseUrl, plan, requestFn, token);
  logger.log(`[APPLY] created ${created.length} event record(s)`);
  return { plan, counts, created };
}

async function main(argv = process.argv) {
  const getArg = (flag) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : null;
  };
  const baseUrl = getArg("--base-url") || process.env.PB_URL || process.env.PUBLIC_POCKETBASE_URL;
  const apply = argv.includes("--apply");
  return runMigration({ baseUrl, apply });
}

export {
  API_EVENTS,
  API_POSTS,
  applyPlan,
  buildPlan,
  isDateOnly,
  listAll,
  loadSeed,
  main,
  payloadFor,
  runMigration,
  validateSeed,
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
