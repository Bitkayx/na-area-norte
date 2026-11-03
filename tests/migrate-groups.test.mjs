import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildReconciliationPlan,
  listAll,
  loadSourceGroups,
  payloadOf,
  resolveDistricts,
  runMigration,
  validate,
} from "../scripts/migrate-groups.mjs";

const districtRecords = [1, 2, 4, 5].map((number) => ({
  id: `pb-d${number}`,
  number,
  slug: `distrito-${number}`,
}));

function resolvedGroups() {
  const result = resolveDistricts(loadSourceGroups(), districtRecords);
  assert.deepEqual(result.errors, []);
  return result.groups;
}

function existingFrom(group, overrides = {}) {
  return { id: `pb-${group.slug}`, ...payloadOf(group), ...overrides };
}

function silentLogger() {
  return { log() {}, warn() {}, error() {} };
}

describe("group source transformation", () => {
  test("loads 43 active groups with the approved district distribution", () => {
    const groups = loadSourceGroups();
    assert.equal(groups.length, 43);
    assert.deepEqual(validate(groups), []);
    assert.deepEqual(
      [1, 2, 4, 5].map(
        (number) => groups.filter((group) => group.number === number).length,
      ),
      [9, 10, 13, 11],
    );
    assert.ok(groups.every((group) => group.isActive === true));
  });

  test("creates globally unique district-qualified slugs for duplicate names", () => {
    const groups = loadSourceGroups();
    const byV1Id = new Map(groups.map((group) => [group.v1Id, group]));
    assert.equal(byV1Id.get("serenidad").slug, "serenidad-d2");
    assert.equal(byV1Id.get("serenidad-d4").slug, "serenidad-d4");
    assert.equal(
      byV1Id.get("valor-para-cambiar").slug,
      "valor-para-cambiar-d2",
    );
    assert.equal(
      byV1Id.get("valor-para-cambiar-d4").slug,
      "valor-para-cambiar-d4",
    );
    assert.equal(new Set(groups.map((group) => group.slug)).size, 43);
  });

  test("preserves and structures all 73 schedule blocks", () => {
    const groups = loadSourceGroups();
    assert.equal(
      groups.reduce((total, group) => total + group.schedules.length, 0),
      73,
    );
    const sendero = groups.find((group) => group.v1Id === "un-nuevo-sendero");
    assert.deepEqual(sendero.schedules[0].days, [1, 2, 3, 4, 5, 7]);
    assert.match(sendero.scheduleText, /excepto sábado/);
  });
});

describe("district relation resolution", () => {
  test("resolves relations by district number without hardcoded IDs", () => {
    const result = resolveDistricts(loadSourceGroups(), districtRecords);
    assert.deepEqual(result.errors, []);
    assert.ok(
      result.groups.every((group) => group.district === `pb-d${group.number}`),
    );
  });

  test("blocks missing, duplicate and forbidden districts", () => {
    const groups = loadSourceGroups();
    assert.match(
      resolveDistricts(groups, districtRecords.slice(1)).errors.join(" "),
      /missing destination district 1/,
    );
    assert.match(
      resolveDistricts(groups, [
        ...districtRecords,
        districtRecords[0],
      ]).errors.join(" "),
      /duplicate destination district 1/,
    );
    assert.match(
      resolveDistricts(groups, [
        ...districtRecords,
        { id: "bad", number: 3 },
      ]).errors.join(" "),
      /forbidden district/,
    );
  });
});

describe("group reconciliation", () => {
  test("plans create, update, unchanged and remains idempotent", () => {
    const groups = resolvedGroups();
    const existing = [
      existingFrom(groups[0]),
      existingFrom(groups[1], { notes: "Nota anterior" }),
    ];
    const plan = buildReconciliationPlan(groups, existing);
    assert.equal(plan[0].action, "unchanged");
    assert.equal(plan[1].action, "update");
    assert.deepEqual(plan[1].changed, { notes: null });
    assert.equal(plan.filter((item) => item.action === "create").length, 41);

    const applied = groups.map((group) => existingFrom(group));
    assert.ok(
      buildReconciliationPlan(groups, applied).every(
        (item) => item.action === "unchanged",
      ),
    );
  });

  test("treats PocketBase empty optional text as null", () => {
    const [group] = resolvedGroups();
    const existing = existingFrom(group, { notes: "" });
    assert.equal(
      buildReconciliationPlan([group], [existing])[0].action,
      "unchanged",
    );
  });

  test("blocks slug and district/name identity collisions", () => {
    const [group] = resolvedGroups();
    assert.equal(
      buildReconciliationPlan(
        [group],
        [existingFrom(group, { district: "other-district" })],
      )[0].action,
      "conflict",
    );
    assert.equal(
      buildReconciliationPlan(
        [group],
        [existingFrom(group, { slug: "different-slug" })],
      )[0].action,
      "conflict",
    );
  });

  test("paginates collection reads including empty zero-page responses", async () => {
    const pages = [];
    const items = await listAll(
      "http://pb.test",
      "/records",
      async (_base, path) => {
        const page = Number(
          new URL(`http://pb.test${path}`).searchParams.get("page"),
        );
        pages.push(page);
        return { items: [{ id: String(page) }], totalPages: 2 };
      },
    );
    assert.deepEqual(
      items.map((item) => item.id),
      ["1", "2"],
    );
    assert.deepEqual(pages, [1, 2]);
    assert.deepEqual(
      await listAll("http://pb.test", "/records", async () => ({
        items: [],
        totalPages: 0,
      })),
      [],
    );
  });
});

describe("group migration dry-run", () => {
  test("uses GET only, never authenticates, and plans all 43 creates", async () => {
    const calls = [];
    const plan = await runMigration({
      baseUrl: "http://pb.test",
      logger: silentLogger(),
      requestFn: async (_base, path, options = {}) => {
        calls.push({ path, method: options.method ?? "GET" });
        if (path.startsWith("/api/collections/districts/")) {
          return { items: districtRecords, totalPages: 1 };
        }
        if (path.startsWith("/api/collections/groups/")) {
          return { items: [], totalPages: 0 };
        }
        throw new Error(`unexpected request ${path}`);
      },
    });
    assert.equal(plan.length, 43);
    assert.ok(plan.every((item) => item.action === "create"));
    assert.ok(calls.every((call) => call.method === "GET"));
    assert.equal(calls.length, 2);
  });

  test("conflicts block apply before authentication or writes", async () => {
    const [group] = resolvedGroups();
    const calls = [];
    await assert.rejects(
      runMigration({
        baseUrl: "http://pb.test",
        apply: true,
        logger: silentLogger(),
        requestFn: async (_base, path, options = {}) => {
          calls.push(options.method ?? "GET");
          if (path.startsWith("/api/collections/districts/")) {
            return { items: districtRecords, totalPages: 1 };
          }
          return {
            items: [existingFrom(group, { district: "other-district" })],
            totalPages: 1,
          };
        },
      }),
      /unresolved conflicts/,
    );
    assert.deepEqual(calls, ["GET", "GET"]);
  });
});
