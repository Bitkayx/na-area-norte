import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  OLD_INDEX,
  buildSchemaPlan,
  runSchemaMigration,
} from "../scripts/migrate-radio-schema.mjs";

const collection = {
  id: "radio-id",
  name: "radio_broadcasts",
  fields: [
    { id: "id", name: "id", type: "text", required: true },
    {
      id: "week",
      name: "week",
      type: "number",
      required: true,
      min: 1,
      max: 52,
    },
    { id: "owner", name: "ownerIsAreaNorte", type: "bool", required: false },
    {
      id: "district",
      name: "district",
      type: "relation",
      collectionId: "districts",
    },
  ],
  indexes: [
    OLD_INDEX,
    "CREATE INDEX idx_radio_district ON radio_broadcasts (district)",
  ],
};

const silent = { log() {}, error() {} };

describe("radio schema migration", () => {
  test("replaces only week and its unique index", () => {
    const plan = buildSchemaPlan(collection, 0);
    assert.deepEqual(plan.errors, []);
    assert.deepEqual(
      plan.fields.find((field) => field.name === "broadcastDate"),
      {
        name: "broadcastDate",
        type: "date",
        required: true,
      },
    );
    assert.equal(
      plan.fields.some((field) => field.name === "week"),
      false,
    );
    assert.match(plan.indexes[0], /idx_radio_date.*broadcastDate/);
    assert.equal(plan.indexes[1], collection.indexes[1]);
    assert.equal(
      plan.fields.find((field) => field.name === "district").id,
      "district",
    );
  });

  test("refuses records, drift and repeated application", () => {
    assert.match(
      buildSchemaPlan(collection, 1).errors.join(" "),
      /contains 1 record/,
    );
    assert.match(
      buildSchemaPlan({ ...collection, indexes: [] }, 0).errors.join(" "),
      /idx_radio_week/,
    );
    const migrated = {
      ...collection,
      fields: [{ name: "broadcastDate" }],
      indexes: [],
    };
    assert.match(
      buildSchemaPlan(migrated, 0).errors.join(" "),
      /already exists/,
    );
  });

  test("dry-run authenticates and reads but never patches", async () => {
    const calls = [];
    await runSchemaMigration({
      baseUrl: "http://pb.test",
      logger: silent,
      env: { PB_SUPERUSER_EMAIL: "admin", PB_SUPERUSER_PASSWORD: "secret" },
      requestFn: async (_base, path, options = {}) => {
        calls.push({ path, method: options.method ?? "GET" });
        if (path.includes("auth-with-password")) return { token: "token" };
        if (path.includes("/records")) return { totalItems: 0, items: [] };
        return collection;
      },
    });
    assert.equal(
      calls.some((call) => call.method === "PATCH"),
      false,
    );
    assert.deepEqual(
      calls.map((call) => call.method),
      ["POST", "GET", "GET"],
    );
  });

  test("apply sends one complete schema patch after validation", async () => {
    const patches = [];
    await runSchemaMigration({
      baseUrl: "http://pb.test",
      apply: true,
      logger: silent,
      env: { PB_SUPERUSER_EMAIL: "admin", PB_SUPERUSER_PASSWORD: "secret" },
      requestFn: async (_base, path, options = {}) => {
        if (path.includes("auth-with-password")) return { token: "token" };
        if (path.includes("/records")) return { totalItems: 0, items: [] };
        if (options.method === "PATCH") {
          patches.push(options.body);
          return {};
        }
        return collection;
      },
    });
    assert.equal(patches.length, 1);
    assert.ok(
      patches[0].fields.some((field) => field.name === "broadcastDate"),
    );
    assert.ok(
      patches[0].indexes.some((index) => index.includes("idx_radio_date")),
    );
  });
});
