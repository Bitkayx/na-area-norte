import assert from "node:assert/strict";
import test from "node:test";
import {
  API_EVENTS,
  applyPlan,
  buildPlan,
  isDateOnly,
  loadSeed,
  validateSeed,
} from "../scripts/migrate-events.mjs";

const seed = loadSeed();
const posts = seed.map((event, index) => ({ id: `post-${index + 1}`, slug: event.postSlug }));

test("approved seed has five traceable historical events with exact dates", () => {
  assert.equal(seed.length, 5);
  assert.deepEqual(validateSeed(seed), []);
  assert.ok(seed.every((event) => event.status === "archived"));
  assert.deepEqual(seed.map((event) => event.startDate), [
    "2026-04-01",
    "2026-03-22",
    "2026-05-17",
    "2026-07-26",
    "2026-09-13",
  ]);
});

test("date validation rejects impossible and non-date values", () => {
  assert.equal(isDateOnly("2026-02-28"), true);
  assert.equal(isDateOnly("2026-02-30"), false);
  assert.equal(isDateOnly("2026-2-03"), false);
  assert.equal(isDateOnly(undefined), false);
});

test("dry-run plan creates each event and resolves postRef by post slug", () => {
  const plan = buildPlan(seed, posts, []);
  assert.equal(plan.length, 5);
  assert.ok(plan.every((item) => item.action === "CREATE"));
  assert.deepEqual(
    plan.map((item) => item.payload.postRef),
    posts.map((post) => post.id),
  );
  assert.equal(plan.find((item) => item.slug === "asamblea-mexicana").payload.endDate, "2026-04-04 00:00:00.000Z");
});

test("matching existing events are unchanged and changed ones conflict", () => {
  const plan = buildPlan(seed, posts, []);
  const existing = plan.map((item, index) => ({
    id: `event-${index + 1}`,
    slug: item.slug,
    ...item.payload,
  }));
  assert.ok(buildPlan(seed, posts, existing).every((item) => item.action === "UNCHANGED"));

  existing[0].title = "Título distinto";
  assert.equal(buildPlan(seed, posts, existing)[0].action, "CONFLICT");
});

test("JSON object key order from PocketBase does not create a false conflict", () => {
  const plan = buildPlan(seed, posts, []);
  const existing = plan.map((item, index) => ({
    id: `event-${index + 1}`,
    ...item.payload,
    location: Object.fromEntries(Object.entries(item.payload.location).reverse()),
    slug: item.slug,
  }));
  assert.ok(buildPlan(seed, posts, existing).every((item) => item.action === "UNCHANGED"));
});

test("missing or duplicated related post is a conflict", () => {
  assert.equal(buildPlan(seed, posts.slice(1), [])[0].action, "CONFLICT");
  assert.equal(buildPlan(seed, [...posts, posts[0]], [])[0].action, "CONFLICT");
});

test("duplicate Event slugs and invalid date ranges fail validation", () => {
  const duplicate = structuredClone(seed);
  duplicate[1].slug = duplicate[0].slug;
  assert.ok(validateSeed(duplicate).some((error) => error.includes("duplicate slug")));

  const invalidRange = structuredClone(seed);
  invalidRange[0].endDate = "2026-03-31";
  assert.ok(validateSeed(invalidRange).some((error) => error.includes("endDate precedes")));
});

test("apply refuses all writes if any plan item conflicts", async () => {
  let calls = 0;
  await assert.rejects(
    applyPlan("https://pb.test", [{ action: "CONFLICT", slug: "x", reason: "collision" }], async () => {
      calls++;
    }),
    /refusing apply/,
  );
  assert.equal(calls, 0);
});

test("apply performs POST creates only and never updates existing records", async () => {
  const calls = [];
  const created = await applyPlan(
    "https://pb.test",
    [
      { action: "CREATE", slug: "one", payload: { slug: "one" } },
      { action: "UNCHANGED", slug: "two" },
    ],
    async (baseUrl, apiPath, options) => {
      calls.push({ baseUrl, apiPath, options });
      return { id: "created-one" };
    },
    "test-token",
  );
  assert.deepEqual(created, [{ slug: "one", id: "created-one" }]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].apiPath, API_EVENTS);
  assert.equal(calls[0].options.method, "POST");
});
