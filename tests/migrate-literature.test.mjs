import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlan,
  loadSource,
  summarize,
  validateSource,
  applyPlan,
} from "../scripts/migrate-literature.mjs";

test("source inventory transforms to 9 categories and 161 public catalog rows", () => {
  const source = loadSource();
  assert.equal(source.categories.length, 9);
  assert.equal(source.products.length, 161);
  assert.deepEqual(validateSource(source), []);
  assert.equal(source.products.filter((item) => item.code === null).length, 14);
  assert.ok(source.products.every((item) => item.isActive === true));
  assert.ok(source.products.every((item) => !("quantity" in item) && !("total" in item)));
});

test("empty destination plans only category and product creates", () => {
  const source = loadSource();
  const plan = buildPlan(source, [], []);
  assert.deepEqual(summarize(plan), {
    categories: { create: 9, unchanged: 0, conflict: 0 },
    products: { create: 161, unchanged: 0, conflict: 0 },
  });
  assert.equal(plan.products[0].category, null);
  assert.equal(plan.products[0].categoryName, source.categories[0].name);
});

test("exact destination matches are idempotent and mismatches conflict", () => {
  const source = loadSource();
  const categories = source.categories.map((item, index) => ({
    id: `category-${index}`,
    name: item.name,
    sort: item.sort,
  }));
  const records = source.products.map((item) => ({
    id: `literature-${item.sourceIndex}`,
    code: item.code,
    title: item.title,
    price: item.price,
    isActive: item.isActive,
    category: categories.find((category) => category.name === item.categoryName).id,
  }));
  const unchanged = buildPlan(source, categories, records);
  assert.deepEqual(summarize(unchanged), {
    categories: { create: 0, unchanged: 9, conflict: 0 },
    products: { create: 0, unchanged: 161, conflict: 0 },
  });
  records[0].price += 1;
  const conflict = buildPlan(source, categories, records);
  assert.equal(conflict.products[0].action, "conflict");
});

test("apply creates categories first and uses returned relation IDs", async () => {
  const source = loadSource();
  const plan = buildPlan(source, [], []);
  const calls = [];
  let categoryCounter = 0;
  await applyPlan(
    "https://example.invalid",
    plan,
    async (_baseUrl, apiPath, options) => {
      calls.push({ apiPath, options });
      if (apiPath.endsWith("/categories/records")) return { id: `cat-${++categoryCounter}` };
      return { id: "created" };
    },
    async () => "test-token",
  );
  assert.equal(calls.filter((call) => call.apiPath.endsWith("/categories/records")).length, 9);
  assert.equal(calls.filter((call) => call.apiPath.endsWith("/literature/records")).length, 161);
  assert.equal(calls[9].options.body.category, "cat-1");
  assert.equal(calls[9].options.body.code, "NAL003");
  assert.equal("quantity" in calls[9].options.body, false);
  assert.equal("total" in calls[9].options.body, false);
});
