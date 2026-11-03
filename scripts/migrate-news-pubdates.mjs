#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { displayBaseUrl, loadDotEnv, request } from "./migrate-districts.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_POSTS = "/api/collections/posts/records";
const API_AUTH = "/api/collections/_superusers/auth-with-password";

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function loadSourceDates() {
  const directory = path.join(ROOT, "src/blog");
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const source = fs.readFileSync(path.join(directory, file), "utf8");
      const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const match = frontmatter?.[1].match(
        /^pubDate:\s*(\d{4}-\d{2}-\d{2})\s*$/m,
      );
      if (!match) throw new Error(`${file}: missing or invalid V1 pubDate`);
      const date = new Date(`${match[1]}T00:00:00.000Z`);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== match[1]
      ) {
        throw new Error(`${file}: invalid V1 pubDate ${match[1]}`);
      }
      return { slug: path.basename(file, ".md"), pubDate: match[1] };
    });
}

async function listAll(baseUrl, requestFn = request) {
  const items = [];
  for (let page = 1; ; page++) {
    const query = new URLSearchParams({
      page: String(page),
      perPage: "200",
      sort: "slug",
    });
    const response = await requestFn(baseUrl, `${API_POSTS}?${query}`);
    const pageItems = Array.isArray(response?.items) ? response.items : [];
    const totalPages = Number(response?.totalPages ?? 1);
    if (!Number.isInteger(totalPages) || totalPages < 0)
      throw new Error("invalid posts pagination response");
    items.push(...pageItems);
    if (totalPages === 0 && page === 1 && pageItems.length === 0) return items;
    if (totalPages === 0 || page >= totalPages) return items;
  }
}

function buildPlan(sourceDates, posts) {
  const bySlug = new Map();
  const duplicates = new Set();
  for (const post of posts) {
    if (bySlug.has(post.slug)) duplicates.add(post.slug);
    else bySlug.set(post.slug, post);
  }
  return sourceDates.map(({ slug, pubDate }) => {
    if (duplicates.has(slug))
      return {
        action: "conflict",
        slug,
        pubDate,
        note: "duplicate destination slug",
      };
    const existing = bySlug.get(slug);
    if (!existing)
      return {
        action: "conflict",
        slug,
        pubDate,
        note: "destination post missing",
      };
    if (!existing.pubDate)
      return { action: "update", slug, pubDate, id: existing.id };
    const actualDate = String(existing.pubDate).slice(0, 10);
    if (actualDate !== pubDate)
      return {
        action: "conflict",
        slug,
        pubDate,
        actualDate,
        note: "V1 and PocketBase dates differ",
      };
    return { action: "unchanged", slug, pubDate, id: existing.id };
  });
}

async function authenticate(baseUrl, requestFn, env) {
  if (!env.PB_SUPERUSER_EMAIL || !env.PB_SUPERUSER_PASSWORD)
    throw new Error("missing PocketBase superuser credentials");
  const result = await requestFn(baseUrl, API_AUTH, {
    method: "POST",
    body: {
      identity: env.PB_SUPERUSER_EMAIL,
      password: env.PB_SUPERUSER_PASSWORD,
    },
  });
  return result.token;
}

async function runMigration({
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
  const plan = buildPlan(loadSourceDates(), await listAll(baseUrl, requestFn));
  for (const item of plan) {
    logger.log(
      `[PLAN] ${item.action.toUpperCase()} ${item.slug} V1=${item.pubDate}` +
        (item.actualDate ? ` PB=${item.actualDate}` : "") +
        (item.note ? `: ${item.note}` : ""),
    );
  }
  if (plan.some((item) => item.action === "conflict"))
    throw new Error("date conflicts; refusing to apply");
  const updates = plan.filter((item) => item.action === "update");
  if (!apply) {
    logger.log(
      `[DRY-RUN] would update ${updates.length}; ${plan.length - updates.length} unchanged. No writes performed.`,
    );
    return plan;
  }
  const token = await authenticate(baseUrl, requestFn, env);
  for (const item of updates) {
    await requestFn(baseUrl, `${API_POSTS}/${item.id}`, {
      method: "PATCH",
      token,
      body: { pubDate: `${item.pubDate} 00:00:00.000Z` },
    });
  }
  logger.log(`[APPLY] done. updated=${updates.length}`);
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
  });
}

export { loadSourceDates, listAll, buildPlan, runMigration, main };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
