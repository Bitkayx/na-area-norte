#!/usr/bin/env node
/**
 * create-schema.mjs
 *
 * Creates the PocketBase V2 collections (Épica 3) for Área Norte.
 *
 * The collection definitions here are derived from the APPROVED design in
 * docs/architecture/pocketbase-schema.md (base approved with documented
 * adjustments: See the schema doc for decisions on radio/broadcasts,
 * literature (no stock), site_settings navigation, tags M2M, media strategy).
 *
 * Behavior:
 *  - Authenticates as a PocketBase superuser.
 *  - Creates the collections DEFINED BELOW.
 *  - IDEMPOTENT: existing collections are detected and skipped.
 *  - Three-phase create/update, to handle relation fields and the indexes that
 *    depend on them:
 *      Phase 1: create each missing collection with non-relation fields and
 *               only the indexes over those fields.
 *      Phase 2: for collections with relations, read the current real schema
 *               from PocketBase, build the COMPLETE field set (existing base
 *               fields preserved by id + resolved relation fields) and PATCH
 *               it. This is required because collection PATCH replaces the
 *               whole `fields` array (no merge); PATCHing only relations would
 *               drop the base fields and break index sync (`no such column`).
 *      Phase 3: read the current real indexes and PATCH the COMPLETE array
 *               (existing + missing relation-dependent indexes).
 *  - Idempotent and safe to re-run against a partially-applied instance: it
 *    detects existing collections, reads their live schema, restores any
 *    missing base field, adds only missing relations/indexes, and never
 *    duplicates fields or indexes, never drops data or collections.
 *  - In phase 2, relation field `collectionId` values are resolved from the
 *    related collection *name* to its real ID, because PocketBase 0.27.x
 *    validates that the relation collectionId equals the resolved record id.
 *  - M2M relations (posts.tags) require maxSelect > 1 (PocketBase has no
 *    "unlimited" sentinel; 0/1 means single). We use an explicit bound.
 *  - DRY-RUN by default: only prints what would be created. Use --apply.
 *
 * It NEVER migrates V1 data, NEVER deletes/overwrites existing collections,
 * and NEVER touches the frontend.
 *
 * Usage:
 *   PB_URL="https://pb.example.com" \
 *   PB_SUPERUSER_EMAIL="admin@..." \
 *   PB_SUPERUSER_PASSWORD="..." \
 *   node scripts/create-schema.mjs            # dry-run (default)
 *
 *   node scripts/create-schema.mjs --apply    # actually create collections
 *
 * Flags:
 *   --apply        Perform real API calls.
 *   --base-url     Override PB_URL (optional).
 *   --json         Print the full resolved SCHEMA as JSON and exit.
 */

// PocketBase 0.27.x admin API endpoints
const API_SUPERUSER_AUTH = "/api/collections/_superusers/auth-with-password";
const API_COLLECTIONS = "/api/collections";

// Public read-only; writes are superuser-only (edit roles documented, not yet
// enabled — see docs/architecture/pocketbase-schema.md §14).
const PUBLIC_READ = {
  listRule: "",
  viewRule: "",
  createRule: null,
  updateRule: null,
  deleteRule: null,
};

/**
 * Field factory helpers (PocketBase 0.27.x flattened field options).
 * Field types: text, editor, number, bool, email, url, date, select, json,
 * file, relation, autodate.
 */
const field = {
  text: (name, { required = false, max = 0 } = {}) => ({
    name, type: "text", required, max,
  }),
  editor: (name, { required = false } = {}) => ({ name, type: "editor", required }),
  number: (name, { required = false, min = null, max = null } = {}) => ({
    name, type: "number", required,
    ...(min !== null ? { min } : {}),
    ...(max !== null ? { max } : {}),
  }),
  bool: (name, { required = false } = {}) => ({ name, type: "bool", required }),
  email: (name, { required = false } = {}) => ({ name, type: "email", required }),
  url: (name, { required = false } = {}) => ({ name, type: "url", required }),
  date: (name, { required = false } = {}) => ({ name, type: "date", required }),
  json: (name, { required = false } = {}) => ({ name, type: "json", required }),
  select: (name, values, { required = false, maxSelect = 1 } = {}) => ({
    name, type: "select", required, values, maxSelect,
  }),
  file: (name, { required = false, maxSelect = 1 } = {}) => ({
    name, type: "file", required, maxSelect,
  }),
  // `collection` is the NAME of the related collection here. PocketBase 0.27.x
  // validates that `collectionId` equals the resolved collection's real ID, so
  // we store the name during definition but swap it for the actual ID in phase
  // 2 (resolveCollectionIds) before PATCHing the field to the API.
  relation: (name, collection, { required = false, maxSelect = 1, cascadeDelete = false } = {}) => ({
    name,
    type: "relation",
    required,
    collectionId: collection,
    cascadeDelete,
    maxSelect,
  }),
};

// ---------------------------------------------------------------------------
// SCHEMA
// ---------------------------------------------------------------------------
// Each entry: { name, fields: [...], indexes: [...] }
// Relation fields are listed in `relations` and attached in phase 2.
// ---------------------------------------------------------------------------
const COLLECTIONS = [
  {
    name: "districts",
    fields: [
      field.text("name", { required: true }),
      field.number("number", { required: true, min: 1, max: 9 }),
      field.text("slug", { required: true }),
      field.text("description"),
      field.json("location"),
      field.json("schedules"),
      field.text("scheduleText"),
      field.bool("isActive"),
    ],
    relations: [],
    indexes: [
      "CREATE UNIQUE INDEX idx_districts_number ON districts (number)",
      "CREATE UNIQUE INDEX idx_districts_slug ON districts (slug)",
      "CREATE INDEX idx_districts_active ON districts (isActive)",
    ],
  },
  {
    name: "groups",
    fields: [
      field.text("name", { required: true }),
      field.text("slug", { required: true }),
      field.json("location"),
      field.json("schedules"),
      field.text("scheduleText"),
      field.text("notes"),
      field.bool("isActive"),
    ],
    relations: [
      field.relation("district", "districts", { required: true, maxSelect: 1 }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_groups_slug ON groups (slug)",
      "CREATE INDEX idx_groups_district ON groups (district)",
      "CREATE INDEX idx_groups_active ON groups (isActive)",
    ],
  },
  {
    name: "tags",
    fields: [
      field.text("name", { required: true }),
      field.text("slug", { required: true }),
    ],
    relations: [],
    indexes: [
      "CREATE UNIQUE INDEX idx_tags_name ON tags (name)",
      "CREATE UNIQUE INDEX idx_tags_slug ON tags (slug)",
    ],
  },
  {
    name: "categories",
    fields: [
      field.text("name", { required: true }),
      field.number("sort", { min: 0 }),
    ],
    relations: [],
    indexes: ["CREATE UNIQUE INDEX idx_categories_name ON categories (name)"],
  },
  {
    name: "literature",
    fields: [
      // code is nullable and NOT unique until duplicate/generic codes are
      // resolved by human review (schema doc §5).
      field.text("code"),
      field.text("title", { required: true }),
      field.number("price", { required: true, min: 0 }),
      field.bool("isActive"),
    ],
    relations: [
      field.relation("category", "categories", { required: true, maxSelect: 1 }),
    ],
    indexes: [
      "CREATE INDEX idx_literature_category ON literature (category)",
      "CREATE INDEX idx_literature_active ON literature (isActive)",
    ],
  },
  {
    name: "radio_broadcasts",
    fields: [
      field.number("week", { required: true, min: 1, max: 52 }),
      // owner is either a District or the Área Norte itself (never both).
      field.bool("ownerIsAreaNorte"),
      field.text("time"),
      field.url("link"),
      field.text("note"),
    ],
    relations: [
      field.relation("district", "districts", { required: false, maxSelect: 1 }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_radio_week ON radio_broadcasts (week)",
      "CREATE INDEX idx_radio_district ON radio_broadcasts (district)",
    ],
  },
  {
    name: "posts",
    fields: [
      field.text("title", { required: true }),
      field.text("slug", { required: true }),
      field.text("description", { required: true }),
      field.text("author"),
      field.date("pubDate"),
      field.file("cover", { maxSelect: 1 }),
      field.editor("body"),
      field.select("status", ["published", "draft", "archived"], { required: true, maxSelect: 1 }),
    ],
    relations: [
      // posts.tags is M2M. PocketBase has NO "unlimited" relation mode: a
      // relation is multiple ONLY when maxSelect > 1 (maxSelect <= 1 = single),
      // and this field stores an ARRAY of tag ids. The bound is therefore a
      // purely TECHNICAL ceiling to represent M2M — it is NOT a domain rule
      // limiting posts to N tags. 20 is generous: the V1 dataset never exceeds
      // 4 tags per post. If a real post ever needs more, relax this number.
      field.relation("tags", "tags", { required: false, maxSelect: 20, cascadeDelete: false }),
      field.relation("event", "events", { required: false, maxSelect: 1, cascadeDelete: false }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_posts_slug ON posts (slug)",
      "CREATE INDEX idx_posts_pubdate ON posts (pubDate)",
      "CREATE INDEX idx_posts_status ON posts (status)",
    ],
  },
  {
    name: "events",
    fields: [
      field.text("title", { required: true }),
      field.text("slug", { required: true }),
      field.select("type", ["encuentro", "mave", "congreso", "asamblea", "invitacion", "otro"], { required: false, maxSelect: 1 }),
      field.date("startDate"),
      field.date("endDate"),
      field.json("location"),
      field.text("organizerName"),
      field.text("description"),
      field.editor("program"),
      field.file("image", { maxSelect: 1 }),
      field.select("status", ["active", "cancelled", "archived"], { required: true, maxSelect: 1 }),
    ],
    relations: [
      field.relation("postRef", "posts", { required: false, maxSelect: 1, cascadeDelete: false }),
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_events_slug ON events (slug)",
      "CREATE INDEX idx_events_startdate ON events (startDate)",
    ],
  },
  {
    // Singleton collection: one record holds global site configuration.
    name: "site_settings",
    fields: [
      field.text("siteName", { required: true }),
      field.text("description"),
      field.text("addressLine"),
      field.text("phone"),
      field.email("email"),
      field.url("mapEmbedUrl"),
      field.file("logo", { maxSelect: 1 }),
      field.json("socialLinks"),
      field.json("hero"),
      field.json("seo"),
      field.json("navigation"),
    ],
    relations: [],
    indexes: [],
  },
];

// Sanity-check ids/names referenced by relations exist.
function validateSchema() {
  const names = new Set(COLLECTIONS.map((c) => c.name));
  for (const c of COLLECTIONS) {
    for (const r of c.relations) {
      if (!names.has(r.collectionId)) {
        throw new Error(
          `Relation "${c.name}.${r.name}" references unknown collection "${r.collectionId}"`,
        );
      }
    }
  }
}

// Classify a collection's indexes into two groups:
//  - phase1: indexes that only reference fields present in phase 1 (non-relation).
//  - phase3: indexes that reference at least one relation field (their column
//    does not exist until the relation fields are attached in phase 2).
function splitIndexes(c) {
  const relNames = new Set(c.relations.map((r) => r.name));
  const phase1 = [];
  const phase3 = [];
  for (const idx of c.indexes) {
    const m = idx.match(/ON\s+[A-Za-z_]+\s*\(([^)]*)\)/i);
    const cols = m ? m[1].split(",").map((s) => s.trim().toLowerCase()) : [];
    if (cols.some((col) => relNames.has(col))) {
      phase3.push(idx);
    } else {
      phase1.push(idx);
    }
  }
  return { phase1, phase3 };
}

// Precompute the split per collection so both buildBody and phase 3 reuse it.
function buildBody(c) {
  const { phase1 } = splitIndexes(c);
  return {
    name: c.name,
    type: "base",
    ...PUBLIC_READ,
    fields: c.fields,
    // Only indexes over fields that already exist in phase 1. Indexes that
    // depend on relation fields are attached later (phase 3) after the
    // relation fields exist. Sending them here fails the initial POST because
    // the relation column does not exist yet.
    indexes: phase1,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getEnv(name) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return process.env[name];
}

async function request(baseUrl, path, { method = "GET", token, body } = {}) {
  // Normalize the base URL: PocketBase Admin/UI URLs may carry a trailing
  // "/_/" (e.g. "https://host/_/"). The API lives at "/api/...", so we strip
  // any trailing "/_/" (and any trailing slash) before appending the path.
  const normalized = (baseUrl || "").replace(/\/_\/?$/, "").replace(/\/+$/, "");
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const printJson = args.includes("--json");
  const baseUrl =
    (args.includes("--base-url") ? args[args.indexOf("--base-url") + 1] : undefined) ||
    process.env.PB_URL;

  validateSchema();

  if (printJson) {
    // Full intended schema (all fields+relations+indexes), for validation.
    const full = COLLECTIONS.map((c) => {
      const { phase1, phase3 } = splitIndexes(c);
      return {
        ...buildBody(c),
        fields: [...c.fields, ...c.relations],
        indexes: [...phase1, ...phase3],
        phase1Indexes: phase1,
        phase3Indexes: phase3,
      };
    });
    console.log(JSON.stringify(full, null, 2));
    console.error(`\n[[ ${COLLECTIONS.length} collections defined. ]]`);
    return;
  }

  if (!baseUrl) {
    throw new Error("Set PB_URL (or use --base-url).");
  }

  if (!apply) {
    console.log(
      `[dry-run] Would reconcile ${COLLECTIONS.length} collections at ${baseUrl}`,
    );
    for (const c of COLLECTIONS) {
      const nFields = c.fields.length + c.relations.length;
      const rels = c.relations.map((r) => `${r.name}->${r.collectionId}`).join(", ");
      const { phase1, phase3 } = splitIndexes(c);
      console.log(
        `  - ${c.name} (${nFields} fields, phase1 index(es)=${phase1.length}, phase3 index(es)=${phase3.length})${
          rels ? `  rel=[${rels}]` : ""
        }`,
      );
      if (phase3.length) {
        console.log(`      phase3 (relation-dependent): ${phase3.map((i) => i.match(/idx_[a-z_]+/i)?.[0] || i).join(", ")}`);
      }
    }
    console.log(
      "\nDry-run: nothing was created. Re-run with --apply to create the collections.",
    );
    return;
  }

  console.log(`[apply] Authenticating superuser at ${baseUrl} ...`);
  const auth = await request(baseUrl, API_SUPERUSER_AUTH, {
    method: "POST",
    body: {
      identity: getEnv("PB_SUPERUSER_EMAIL"),
      password: getEnv("PB_SUPERUSER_PASSWORD"),
    },
  });
  const token = auth.token;
  console.log(`[apply] Authenticated.`);

  const existing = await request(baseUrl, API_COLLECTIONS, { token });
  const existingByName = new Map((existing.items || []).map((c) => [c.name, c]));

  // Phase 1: create collections with only their phase-1 indexes (no relation
  // fields, no relation-dependent indexes). Idempotent: existing collections
  // (e.g. `districts` from an earlier partially-completed apply) are kept.
  for (const c of COLLECTIONS) {
    if (existingByName.has(c.name)) {
      console.log(`  ~ ${c.name}: already exists (phase 1 keep).`);
      continue;
    }
    console.log(`  + ${c.name}: creating ...`);
    const created = await request(baseUrl, API_COLLECTIONS, {
      method: "POST",
      token,
      body: buildBody(c),
    });
    console.log(`    created ${created.name} (id ${created.id}).`);
    existingByName.set(c.name, created);
  }

  // Build the COMPLETE, correct field set for a collection by merging:
//  - the intended non-relation fields (this schema), reusing the live field
//    object (preserving its `id`) when a field with the same name already
//    exists on the server, else using the intended definition;
//  - the relation fields, resolving each target *name* to its real collection ID.
//
// This is required because PocketBase 0.27.x collection PATCH replaces the
// whole `fields` array (no merge). It restores any base field that a previous
// partial/failed apply may have dropped, and never duplicates existing fields.
function buildFullFields(c, currentFields, existingByName) {
  const byName = new Map(currentFields.map((f) => [f.name, f]));
  const merged = [];

  for (const intended of c.fields) {
    const live = byName.get(intended.name);
    // Keep the live field (with its id + options) if present so PocketBase
    // recognizes it; otherwise fall back to the intended definition.
    merged.push(live ? { ...live } : { ...intended });
  }

  for (const r of c.relations) {
    if (byName.has(r.name)) {
      merged.push({ ...byName.get(r.name) });
      continue;
    }
    const target = existingByName.get(r.collectionId);
    if (!target) {
      throw new Error(
        `Cannot resolve collection id for relation "${c.name}.${r.name}" -> "${r.collectionId}"`,
      );
    }
    merged.push({ ...r, collectionId: target.id });
  }

  return merged;
}

// Phase 2: attach relation fields via a FULL field-set PATCH.
  //
  // IMPORTANT (verified against PocketBase 0.27.2 semantics): collection
  // update PATCH replaces the whole `fields` array (there is NO merge of array
  // fields — see official discussion #6838 and apis/collection.go). Sending
  // only the relation fields would DELETE the base fields, and the subsequent
  // index sync would fail (`no such column: slug`, etc.). We therefore read
  // the collection's current real fields from the server and PATCH the COMPLETE
  // set produced by buildFullFields.
  for (const c of COLLECTIONS) {
    if (c.relations.length === 0) continue;
    const existingColl = existingByName.get(c.name);
    if (!existingColl) continue;

    const current = await request(
      baseUrl,
      `${API_COLLECTIONS}/${existingColl.id}`,
      { token },
    );
    existingByName.set(c.name, current);

    const fullFields = buildFullFields(c, current.fields || [], existingByName);
    const currentNames = new Set((current.fields || []).map((f) => f.name));
    const allBasePresent = c.fields.every((f) => currentNames.has(f.name));
    const allRelPresent = c.relations.every((r) => currentNames.has(r.name));

    if (allBasePresent && allRelPresent) {
      console.log(`  ~ ${c.name}: fields already complete (phase 2 skip).`);
      continue;
    }

    console.log(
      `  ~ ${c.name}: syncing fields to ${fullFields.length} (${c.relations.length} relation, ${c.fields.length} base) ...`,
    );
    const updated = await request(
      baseUrl,
      `${API_COLLECTIONS}/${current.id}`,
      {
        method: "PATCH",
        token,
        body: { fields: fullFields },
      },
    );
    console.log(`    done (${updated.fields.length} fields on ${updated.name}).`);
    existingByName.set(c.name, updated);
  }

  // Phase 3: add indexes that depend on relation fields, now that those
  // columns exist — and, for safety, restore any intended index (phase1 or
  // phase3) that a previous failed/partial apply may have dropped. PATCH
  // replaces the whole `indexes` array, so we send the COMPLETE set =
  // current indexes (fresh from server) merged with the intended ones. Existing
  // indexes are never removed; the result is the full intended index set.
  for (const c of COLLECTIONS) {
    const { phase1, phase3 } = splitIndexes(c);
    const intended = [...phase1, ...phase3];
    if (intended.length === 0) continue;
    const existingColl = existingByName.get(c.name);
    if (!existingColl) continue;

    const current = await request(
      baseUrl,
      `${API_COLLECTIONS}/${existingColl.id}`,
      { token },
    );
    existingByName.set(c.name, current);

    const currentIndexes = current.indexes || [];
    const currentIndexNames = new Set(
      currentIndexes.map((i) => i.match(/idx_[a-z0-9_]+/i)?.[0]),
    );
    const missing = intended.filter(
      (idx) => !currentIndexNames.has(idx.match(/idx_[a-z0-9_]+/i)?.[0]),
    );
    if (missing.length === 0) {
      console.log(`  ~ ${c.name}: indexes already complete (phase 3 skip).`);
      continue;
    }

    const fullIndexes = [...currentIndexes, ...missing];
    console.log(`  ~ ${c.name}: adding ${missing.length} missing index(es) ...`);
    const updated = await request(
      baseUrl,
      `${API_COLLECTIONS}/${current.id}`,
      {
        method: "PATCH",
        token,
        body: { indexes: fullIndexes },
      },
    );
    console.log(`    done (${updated.indexes.length} indexes on ${updated.name}).`);
    existingByName.set(c.name, updated);
  }

  console.log("\n[apply] Done. No V1 data was migrated.");
}

main().catch((err) => {
  console.error(`\nERROR: ${err.message}`);
  process.exit(1);
});
