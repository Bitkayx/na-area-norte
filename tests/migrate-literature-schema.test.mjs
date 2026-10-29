import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSchemaPlan,
  runSchemaMigration,
} from "../scripts/migrate-literature-schema.mjs";

const collection = () => ({
  id: "literature-id",
  name: "literature",
  fields: [
    { id: "code-id", name: "code", type: "text", required: false },
    { id: "title-id", name: "title", type: "text", required: true },
    { id: "price-id", name: "price", type: "number", required: true, min: 0 },
    { id: "active-id", name: "isActive", type: "bool", required: false },
    {
      id: "category-id",
      name: "category",
      type: "relation",
      required: true,
      collectionId: "categories-id",
      maxSelect: 1,
    },
  ],
  indexes: [
    "CREATE INDEX idx_literature_active ON literature (isActive)",
    "CREATE INDEX idx_literature_category ON literature (category)",
  ],
  listRule: "",
  viewRule: "",
  createRule: null,
  updateRule: null,
  deleteRule: null,
});

test("plan adds only optional integer stock and preserves fields/indexes", () => {
  const original = collection();
  const plan = buildSchemaPlan(original, 0);
  assert.equal(plan.action, "add-stock");
  assert.equal(plan.fields.length, original.fields.length + 1);
  assert.deepEqual(plan.fields.slice(0, -1), original.fields);
  assert.deepEqual(plan.fields.at(-1), {
    name: "stock",
    type: "number",
    required: false,
    min: 0,
    onlyInt: true,
  });
  assert.deepEqual(plan.indexes, original.indexes);
  assert.equal("listRule" in plan, false);
});

test("refuses populated destinations, unexpected collection, and malformed stock", () => {
  assert.ok(
    buildSchemaPlan(collection(), 1).errors[0].includes("contains 1 record"),
  );
  assert.ok(
    buildSchemaPlan({ ...collection(), name: "groups" }, 0).errors.length > 0,
  );
  const malformed = collection();
  malformed.fields.push({ name: "stock", type: "number", required: true });
  assert.ok(
    buildSchemaPlan(malformed, 0).errors.includes(
      "literature.stock exists with an unexpected shape",
    ),
  );
});

test("dry-run reads schema and record count and performs no PATCH", async () => {
  const calls = [];
  const log = [];
  const plan = await runSchemaMigration({
    baseUrl: "https://pb.test",
    env: { PB_SUPERUSER_EMAIL: "x", PB_SUPERUSER_PASSWORD: "y" },
    logger: {
      log: (message) => log.push(message),
      error: (message) => log.push(message),
    },
    requestFn: async (_base, endpoint, options = {}) => {
      calls.push({ endpoint, options });
      if (endpoint.includes("auth-with-password"))
        return { token: "mock-token" };
      if (endpoint === "/api/collections/literature") return collection();
      if (endpoint.includes("/records")) return { totalItems: 0 };
      throw new Error(`unexpected request ${endpoint}`);
    },
  });
  assert.equal(plan.action, "add-stock");
  assert.equal(
    calls.filter((call) => call.options.method === "PATCH").length,
    0,
  );
  assert.ok(log.some((message) => message.includes("No writes performed")));
});

test("apply sends exactly one PATCH containing full fields and unchanged indexes", async () => {
  const calls = [];
  await runSchemaMigration({
    baseUrl: "https://pb.test",
    apply: true,
    env: { PB_SUPERUSER_EMAIL: "x", PB_SUPERUSER_PASSWORD: "y" },
    logger: { log() {}, error() {} },
    requestFn: async (_base, endpoint, options = {}) => {
      calls.push({ endpoint, options });
      if (endpoint.includes("auth-with-password"))
        return { token: "mock-token" };
      if (endpoint === "/api/collections/literature") return collection();
      if (endpoint.includes("/records")) return { totalItems: 0 };
      if (options.method === "PATCH") return {};
      throw new Error(`unexpected request ${endpoint}`);
    },
  });
  const patches = calls.filter((call) => call.options.method === "PATCH");
  assert.equal(patches.length, 1);
  assert.equal(patches[0].endpoint, "/api/collections/literature");
  assert.deepEqual(patches[0].options.body.indexes, collection().indexes);
  assert.equal(patches[0].options.body.fields.at(-1).name, "stock");
  assert.equal("listRule" in patches[0].options.body, false);
});
