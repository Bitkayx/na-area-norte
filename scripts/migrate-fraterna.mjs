#!/usr/bin/env node
/**
 * migrate-fraterna.mjs
 *
 * Minimal idempotent migration for vertical slice: migrate ONLY
 * "fraterna_80.md" and its cover image to PocketBase.
 *
 * - Tags: ensure "fraterna" and "literatura" exist (idempotent by slug/name)
 * - Post: find-or-create by slug "fraterna_80" (idempotent)
 * - Cover: upload local image if post.cover missing
 *
 * DRY-RUN by default. Use --apply to perform changes.
 * Requires: PB_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD
 */

import { readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const SLUG = "fraterna_80";
const TITLE = "Revista FraterNA No.80";
const DESCRIPTION = "La nueva revista FraterNA";
const AUTHOR = "Área Norte";
const PUB_DATE = "2026-04-09T00:00:00Z";
const TAGS = [
  { name: "fraterna", slug: "fraterna" },
  { name: "literatura", slug: "literatura" },
];
const BLOG_MD = path.join(root, "src/blog/fraterna_80.md");
const COVER_LOCAL = path.join(root, "src/assets/blog/fraterna/Fraterna_80.jpeg");

const API_SUPERUSER_AUTH = "/api/collections/_superusers/auth-with-password";
const API_COLLECTIONS = "/api/collections";
const API_TAGS = "/api/collections/tags/records";
const API_POSTS = "/api/collections/posts/records";
const API_FILES = (collId, recId, fileName) =>
  `/api/files/${collId}/${recId}/${fileName}`;

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}
const APPLY = process.argv.includes("--apply");
const BASE_URL = getArg("--base-url") || process.env.PB_URL;

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function request(baseUrl, path, { method = "GET", token, body, isForm = false } = {}) {
  const url = baseUrl.replace(/\/+$/, "") + path;
  const headers = { Accept: "application/json" };
  if (token) headers["Authorization"] = token;
  if (!isForm) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = data && typeof data === "object" && "message" in data ? data.message : text || res.statusText;
    throw new Error(`[PB ${res.status}] ${method} ${path} -> ${msg}`);
  }
  return data;
}

function log(...args) {
  console.log("[migrate-fraterna]", ...args);
}
function dry(...args) {
  console.log("[DRY-RUN]", ...args);
}

async function main() {
  if (!BASE_URL) throw new Error("Set PB_URL or --base-url");
  const email = requireEnv("PB_SUPERUSER_EMAIL");
  const pwd = requireEnv("PB_SUPERUSER_PASSWORD");

  log("Base URL:", BASE_URL);
  log("Apply:", APPLY ? "true" : "false (dry-run)");

  // auth
  log("Authenticating as superuser...");
  const auth = await request(BASE_URL, API_SUPERUSER_AUTH, {
    method: "POST",
    body: { identity: email, password: pwd },
  });
  const token = auth.token;
  log("Authenticated OK");

  // ensure tags
  const tagMap = {};
  for (const t of TAGS) {
    log(`Ensuring tag: ${t.slug}`);
    const existing = await request(BASE_URL, `${API_TAGS}?filter=slug='${encodeURIComponent(t.slug)}'&perPage=1`, {
      token,
    });
    if (existing.items && existing.items.length > 0) {
      tagMap[t.slug] = existing.items[0].id;
      log(`  -> exists id=${tagMap[t.slug]}`);
      continue;
    }
    if (!APPLY) {
      dry(`Would CREATE tag {name:'${t.name}', slug:'${t.slug}'}`);
      tagMap[t.slug] = "(would-create)";
      continue;
    }
    const created = await request(BASE_URL, API_TAGS, {
      method: "POST",
      token,
      body: { name: t.name, slug: t.slug },
    });
    tagMap[t.slug] = created.id;
    log(`  -> created id=${created.id}`);
  }

  // ensure post
  log(`Ensuring post slug='${SLUG}'`);
  const postsExisting = await request(BASE_URL, `${API_POSTS}?filter=slug='${encodeURIComponent(SLUG)}'&perPage=1`, {
    token,
  });
  let postId = null;
  let post = null;
  if (postsExisting.items && postsExisting.items.length > 0) {
    post = postsExisting.items[0];
    postId = post.id;
    log(`  -> exists id=${postId}, has cover=${Boolean(post.cover)}`);
  } else {
    if (!APPLY) {
      dry(`Would CREATE post {slug:'${SLUG}', title:'${TITLE}', tags:[${TAGS.map((x) => tagMap[x.slug]).join(",")}]}`);
    } else {
      const createdPost = await request(BASE_URL, API_POSTS, {
        method: "POST",
        token,
        body: {
          title: TITLE,
          slug: SLUG,
          description: DESCRIPTION,
          author: AUTHOR,
          pubDate: PUB_DATE,
          body: null,
          status: "published",
          tags: TAGS.map((x) => tagMap[x.slug]).filter((x) => x && x !== "(would-create)"),
          event: null,
        },
      });
      postId = createdPost.id;
      post = createdPost;
      log(`  -> created id=${postId}`);
    }
  }

  // upload cover if needed
  if (postId && !(post && post.cover)) {
    if (!existsSync(COVER_LOCAL)) {
      log(`WARNING: cover not found at ${COVER_LOCAL}`);
    } else {
      const st = await stat(COVER_LOCAL);
      log(`Cover file: ${COVER_LOCAL} (${Math.round(st.size / 1024)} KB)`);
      if (!APPLY) {
        dry(`Would UPLOAD cover ${path.basename(COVER_LOCAL)} to post ${postId}`);
      } else {
        const buf = await readFile(COVER_LOCAL);
        const form = new FormData();
        const blob = new Blob([buf], { type: "image/jpeg" });
        form.append("cover", blob, path.basename(COVER_LOCAL));
        const updated = await request(BASE_URL, `${API_POSTS}/${postId}`, {
          method: "PATCH",
          token,
          body: form,
          isForm: true,
        });
        log(`  -> cover uploaded: ${updated.cover}`);
      }
    }
  } else if (post && post.cover) {
    log("  -> cover already present, skip upload");
  }

  log("Done.");
  if (!APPLY) log("Run with --apply to perform changes.");
}

main().catch((err) => {
  console.error("[migrate-fraterna] ERROR:", err.message);
  process.exit(1);
});
