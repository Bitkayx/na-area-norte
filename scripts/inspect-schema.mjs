#!/usr/bin/env node
/**
 * inspect-schema.mjs
 *
 * READ-ONLY inspector for PocketBase Área Norte collections.
 *
 * Lists the real current state of the collections from PocketBase:
 * name, id, type, access rules, every field (type, required, maxSelect,
 * collectionId) and every index. It performs NO writes.
 *
 * Usage:
 *   PB_URL="https://host/_/" node scripts/inspect-schema.mjs
 *   node scripts/inspect-schema.mjs --base-url "https://host"
 *   node scripts/inspect-schema.mjs --names            # only collection names
 *   node scripts/inspect-schema.mjs [name...]          # limit to given names
 *
 * Notes:
 *  - Superuser auth is NOT required for public GET /api/collections. However
 *    some deployments restrict it; if you get a 403, set PB_SUPERUSER_EMAIL /
 *    PB_SUPERUSER_PASSWORD and pass --authenticate to obtain a token first.
 *    (The superuser collection auth still works for reading, but normally is
 *    not needed for listing collections.)
 */

const API_COLLECTIONS = "/api/collections";

function normalizeUrl(b) {
  return (b || "").replace(/\/_\/?$/, "").replace(/\/+$/, "");
}

function getEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return process.env[name];
}

async function request(baseUrl, path, { method = "GET", token, body } = {}) {
  const normalized = normalizeUrl(baseUrl);
  const res = await fetch(`${normalized}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(
      `PB API ${method} ${path} failed (${res.status}): ${JSON.stringify(data)}`,
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function summarize(collection) {
  const rels = collection.fields
    .filter((f) => f.type === "relation")
    .map((f) => `${f.name}->${f.collectionId || "(none)"}${f.maxSelect > 1 ? "[M2M]" : ""}${f.required ? "(req)" : ""}`);
  return {
    name: collection.name,
    id: collection.id,
    type: collection.type,
    rules: {
      list: collection.listRule === "" ? "public" : collection.listRule,
      view: collection.viewRule === "" ? "public" : collection.viewRule,
      create: collection.createRule,
      update: collection.updateRule,
      delete: collection.deleteRule,
    },
    fields: collection.fields.map((f) => ({
      name: f.name,
      type: f.type,
      required: !!f.required,
      maxSelect: f.maxSelect,
      collectionId: f.collectionId,
    })),
    relations: rels,
    indexes: collection.indexes || [],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const baseUrl =
    (args.includes("--base-url")
      ? args[args.indexOf("--base-url") + 1]
      : undefined) || getEnv("PB_URL");
  const namesOnly = args.includes("--names");
  const authenticate = args.includes("--authenticate");
  const filters = args.filter((a) => !a.startsWith("--") && a !== "--base-url" && a !== "--names" && a !== "--authenticate");

  let token = null;
  if (authenticate) {
    const auth = await request(baseUrl, "/api/collections/_superusers/auth-with-password", {
      method: "POST",
      body: {
        identity: getEnv("PB_SUPERUSER_EMAIL"),
        password: getEnv("PB_SUPERUSER_PASSWORD"),
      },
    });
    token = auth.token;
  }

  const res = await request(baseUrl, API_COLLECTIONS, { token });
  let colls = res.items || [];

  if (filters.length) {
    colls = colls.filter((c) => filters.includes(c.name));
  }

  if (namesOnly) {
    console.log(colls.map((c) => `${c.name}\t${c.id}`).join("\n"));
    return;
  }

  for (const c of colls) {
    const s = summarize(c);
    console.log(`\n=== ${s.name} (${s.type}) id=${s.id} ===`);
    console.log(`rules: list=${s.rules.list} view=${s.rules.view} create=${s.rules.create} update=${s.rules.update} delete=${s.rules.delete}`);
    console.log("fields:");
    for (const f of s.fields) {
      const extra =
        f.type === "relation"
          ? ` maxSelect=${f.maxSelect} ->${f.collectionId}`
          : f.maxSelect !== undefined
            ? ` maxSelect=${f.maxSelect}`
            : "";
      console.log(`  - ${f.name}: ${f.type}${f.required ? " (req)" : ""}${extra}`);
    }
    console.log(`relations (${s.relations.length}): ${s.relations.join(", ") || "none"}`);
    console.log(`indexes (${s.indexes.length}):`);
    for (const idx of s.indexes) {
      console.log(`  - ${idx}`);
    }
  }
  console.log(`\n[[ ${colls.length} collections inspected. Read-only: nothing was modified. ]]`);
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});