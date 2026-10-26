import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  payloadOf,
  resolveDistricts,
  runMigration,
} from "../scripts/migrate-radio-schedule.mjs";
import { parseRadioSchedule } from "../scripts/prepare-radio-schedule.mjs";

const text = "5 Oct 1er Dto\n12 Oct 4to Dto\n19 Oct 5to Dto\n26 Oct Área Norte";
const districts = [1, 2, 4, 5].map((number) => ({ id: `d${number}`, number }));
const entries = resolveDistricts(
  parseRadioSchedule(text, 2026).entries,
  districts,
).entries;
const silent = { log() {}, error() {} };

describe("radio schedule reconciliation", () => {
  test("resolves only required district relations and creates deterministic payloads", () => {
    assert.deepEqual(
      entries.map((entry) => entry.district),
      ["d1", "d4", "d5", null],
    );
    assert.equal(
      payloadOf(entries[0]).broadcastDate,
      "2026-10-05 00:00:00.000Z",
    );
    assert.equal(payloadOf(entries[3]).ownerIsAreaNorte, true);
  });

  test("plans create, update and unchanged idempotently", () => {
    const existing = [
      { id: "r1", ...payloadOf(entries[0]) },
      { id: "r4", ...payloadOf(entries[1]), note: "old" },
    ];
    const plan = buildPlan(entries, existing);
    assert.deepEqual(
      plan.map((item) => item.action),
      ["unchanged", "update", "create", "create"],
    );
    assert.ok(
      buildPlan(
        entries,
        entries.map((entry, i) => ({ id: `r${i}`, ...payloadOf(entry) })),
      ).every((item) => item.action === "unchanged"),
    );
  });

  test("dry-run uses GET only and never authenticates", async () => {
    const calls = [];
    const plan = await runMigration({
      baseUrl: "http://pb.test",
      text,
      year: 2026,
      logger: silent,
      requestFn: async (_base, path, options = {}) => {
        calls.push(options.method ?? "GET");
        if (path.startsWith("/api/collections/districts"))
          return { items: districts, totalPages: 1 };
        return { items: [], totalPages: 0 };
      },
    });
    assert.equal(plan.filter((item) => item.action === "create").length, 4);
    assert.deepEqual(calls, ["GET", "GET"]);
  });

  test("missing relations and duplicate destination dates are blocked", () => {
    assert.match(
      resolveDistricts(entries, districts.slice(1)).errors.join(" "),
      /district 1/,
    );
    assert.equal(
      buildPlan(
        [entries[0]],
        [
          { id: "a", ...payloadOf(entries[0]) },
          { id: "b", ...payloadOf(entries[0]) },
        ],
      )[0].action,
      "conflict",
    );
  });
});
