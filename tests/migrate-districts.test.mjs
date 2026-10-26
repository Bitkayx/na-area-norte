import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  VALID_NUMBERS,
  buildReconciliationPlan,
  displayBaseUrl,
  listExistingDistricts,
  loadSourceDistricts,
  parseDays,
  payloadOf,
  runMigration,
  transformSchedules,
  validate,
} from "../scripts/migrate-districts.mjs";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function existingFrom(district, overrides = {}) {
  return {
    id: `pb-${district.number}`,
    ...payloadOf(district),
    ...overrides,
  };
}

function silentLogger() {
  return { log() {}, warn() {}, error() {} };
}

describe("district source transformation", () => {
  test("loads exactly the four approved districts from V1", () => {
    const districts = loadSourceDistricts();
    assert.deepEqual(
      districts.map((district) => district.number),
      VALID_NUMBERS,
    );
    assert.deepEqual(validate(districts), []);
    assert.equal(districts[0].v1Id, "primer-distrito");
    assert.equal(districts[3].slug, "distrito-5");
    assert.equal(districts[3].schedules[0].startTime, "19:00");
  });

  test("parses ISO weekdays without inventing ambiguous values", () => {
    assert.deepEqual(parseDays("Lunes a Viernes"), [1, 2, 3, 4, 5]);
    assert.deepEqual(parseDays("Miércoles y Domingo"), [3, 7]);
    assert.deepEqual(parseDays("A diario"), [1, 2, 3, 4, 5, 6, 7]);
    assert.deepEqual(
      parseDays("Lunes a Domingo (excepto sábado)"),
      [1, 2, 3, 4, 5, 7],
    );
    assert.equal(parseDays("fines de semana"), null);
    assert.equal(parseDays("Viernes a Lunes"), null);
  });

  test("preserves ambiguous schedule text and emits a warning", () => {
    const result = transformSchedules([
      { dias: "cuando se informe", horaInicio: "19:00", horaFin: "20:30" },
    ]);
    assert.deepEqual(result.schedules, []);
    assert.equal(result.scheduleText, "cuando se informe 19:00-20:30");
    assert.equal(result.warnings.length, 1);
  });

  test("validation rejects forbidden/missing district data", () => {
    const districts = loadSourceDistricts().map((district) => ({
      ...district,
    }));
    districts[0] = {
      ...districts[0],
      number: 3,
      name: "",
      location: { ...districts[0].location, linea1: "" },
    };
    const errors = validate(districts);
    assert.ok(errors.some((error) => error.includes("district numbers")));
    assert.ok(errors.includes("forbidden district 3"));
    assert.ok(errors.includes("district 3: empty name"));
    assert.ok(errors.includes("district 3: empty location.linea1"));
  });
});

describe("district reconciliation", () => {
  test("plans create, update and unchanged deterministically", () => {
    const districts = loadSourceDistricts();
    const existing = [
      existingFrom(districts[0]),
      existingFrom(districts[1], { name: "Nombre anterior" }),
    ];
    const plan = buildReconciliationPlan(districts, existing);
    assert.deepEqual(
      plan.map((item) => item.action),
      ["unchanged", "update", "create", "create"],
    );
    assert.deepEqual(plan[1].changed, { name: districts[1].name });
  });

  test("a second plan after applying payloads is entirely unchanged", () => {
    const districts = loadSourceDistricts();
    const first = buildReconciliationPlan(districts, []);
    assert.ok(first.every((item) => item.action === "create"));
    const simulatedApplied = districts.map((district) =>
      existingFrom(district),
    );
    const second = buildReconciliationPlan(districts, simulatedApplied);
    assert.ok(second.every((item) => item.action === "unchanged"));
  });

  test("treats PocketBase empty optional text as equivalent to null", () => {
    const [district] = loadSourceDistricts();
    const existing = existingFrom(district, {
      description: "",
      scheduleText: "",
    });
    assert.equal(
      buildReconciliationPlan([district], [existing])[0].action,
      "unchanged",
    );
  });

  test("blocks number, slug and cross-record collisions", () => {
    const [district] = loadSourceDistricts();
    const cases = [
      [existingFrom(district, { slug: "otro-slug" })],
      [existingFrom(district, { number: 2 })],
      [
        existingFrom(district),
        existingFrom(district, { id: "pb-other", slug: "otro-slug" }),
      ],
    ];
    for (const existing of cases) {
      assert.equal(
        buildReconciliationPlan([district], existing)[0].action,
        "conflict",
      );
    }
  });

  test("blocks duplicate destination records instead of selecting one", () => {
    const [district] = loadSourceDistricts();
    const existing = [
      existingFrom(district),
      existingFrom(district, { id: "duplicate" }),
    ];
    assert.equal(
      buildReconciliationPlan([district], existing)[0].action,
      "conflict",
    );
  });

  test("walks every PocketBase result page", async () => {
    const calls = [];
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(input);
      calls.push({ url, method: init.method ?? "GET" });
      const page = Number(url.searchParams.get("page"));
      return new Response(
        JSON.stringify({ items: [{ id: `page-${page}` }], totalPages: 2 }),
        { status: 200 },
      );
    };
    const items = await listExistingDistricts("http://pb.test");
    assert.deepEqual(
      items.map((item) => item.id),
      ["page-1", "page-2"],
    );
    assert.deepEqual(
      calls.map((call) => call.method),
      ["GET", "GET"],
    );
    assert.equal(calls[1].url.searchParams.get("sort"), "number,id");
  });

  test("accepts PocketBase's zero-page envelope for an empty collection", async () => {
    const items = await listExistingDistricts("http://pb.test", async () => ({
      items: [],
      totalItems: 0,
      totalPages: 0,
    }));
    assert.deepEqual(items, []);
  });
});

describe("district migration CLI", () => {
  test("redacts credentials, query and fragment in displayed URLs", () => {
    assert.equal(
      displayBaseUrl(
        "https://user:secret@pb.example.test/path/?token=hidden#x",
      ),
      "https://pb.example.test/path",
    );
  });

  test("default CLI mode performs GET only and completes a dry-run", async () => {
    const methods = [];
    const plan = await runMigration({
      baseUrl: "http://pb.test",
      logger: silentLogger(),
      requestFn: async (_baseUrl, _path, options = {}) => {
        methods.push(options.method ?? "GET");
        return { items: [], totalPages: 1 };
      },
    });
    assert.ok(plan.every((item) => item.action === "create"));
    assert.deepEqual(methods, ["GET"]);
  });

  test("conflicts prevent authentication and writes even with --apply", async () => {
    const methods = [];
    const [district] = loadSourceDistricts();
    await assert.rejects(
      runMigration({
        baseUrl: "http://pb.test",
        apply: true,
        logger: silentLogger(),
        requestFn: async (_baseUrl, _path, options = {}) => {
          methods.push(options.method ?? "GET");
          return {
            items: [existingFrom(district, { slug: "occupied-number" })],
            totalPages: 1,
          };
        },
      }),
      /unresolved conflicts/,
    );
    assert.deepEqual(methods, ["GET"]);
  });
});
