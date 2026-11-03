import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSchemaPlan,
  runSchemaMigration,
} from "../scripts/migrate-site-settings-schema.mjs";

const collection = () => ({
  name: "site_settings",
  fields: [
    { name: "siteName", type: "text", required: true },
    { name: "socialLinks", type: "json" },
    { name: "hero", type: "json" },
    { name: "seo", type: "json" },
    { name: "navigation", type: "json" },
  ],
  indexes: ["CREATE INDEX idx_site_settings_siteName ON site_settings (siteName)"],
  listRule: "",
  viewRule: "",
  createRule: null,
  updateRule: null,
  deleteRule: null,
});

test("schema plan adds only optional JSON and preserves indexes", () => {
  const original = collection();
  const plan = buildSchemaPlan(original);
  assert.equal(plan.action, "add-literature-settings");
  assert.deepEqual(plan.fields.slice(0, -1), original.fields);
  assert.deepEqual(plan.fields.at(-1), { name: "literature", type: "json" });
  assert.deepEqual(plan.indexes, original.indexes);
  assert.equal("listRule" in plan, false);
});

test("existing correct field is unchanged; malformed field conflicts", () => {
  const existing = collection();
  existing.fields.push({ name: "literature", type: "json" });
  assert.equal(buildSchemaPlan(existing).action, "unchanged");
  existing.fields.at(-1).type = "text";
  assert.ok(buildSchemaPlan(existing).errors.length > 0);
  assert.ok(buildSchemaPlan({ ...collection(), name: "events" }).errors.length > 0);
});

test("dry-run reads schema and never PATCHes", async () => {
  const calls = [];
  const log = [];
  const plan = await runSchemaMigration({
    baseUrl: "https://pb.test",
    env: { PB_SUPERUSER_EMAIL: "x", PB_SUPERUSER_PASSWORD: "y" },
    logger: { log: (message) => log.push(message), error: (message) => log.push(message) },
    requestFn: async (_base, endpoint, options = {}) => {
      calls.push({ endpoint, options });
      if (endpoint.includes("auth-with-password")) return { token: "mock-token" };
      if (endpoint === "/api/collections/site_settings") return collection();
      throw new Error(`unexpected request ${endpoint}`);
    },
  });
  assert.equal(plan.action, "add-literature-settings");
  assert.equal(calls.filter((call) => call.options.method === "PATCH").length, 0);
  assert.ok(log.some((message) => message.includes("No writes performed")));
});

test("apply uses one PATCH with fields/indexes and leaves access rules out", async () => {
  const calls = [];
  await runSchemaMigration({
    baseUrl: "https://pb.test",
    apply: true,
    env: { PB_SUPERUSER_EMAIL: "x", PB_SUPERUSER_PASSWORD: "y" },
    logger: { log() {}, error() {} },
    requestFn: async (_base, endpoint, options = {}) => {
      calls.push({ endpoint, options });
      if (endpoint.includes("auth-with-password")) return { token: "mock-token" };
      if (endpoint === "/api/collections/site_settings") return collection();
      if (options.method === "PATCH") return {};
      throw new Error(`unexpected request ${endpoint}`);
    },
  });
  const patches = calls.filter((call) => call.options.method === "PATCH");
  assert.equal(patches.length, 1);
  assert.deepEqual(patches[0].options.body.indexes, collection().indexes);
  assert.equal(patches[0].options.body.fields.at(-1).name, "literature");
  assert.equal("listRule" in patches[0].options.body, false);
});
