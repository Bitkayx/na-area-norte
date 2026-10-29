import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlan,
  loadSource,
  summarize,
  validateSource,
  validateSchema,
  sourceDiagnostics,
  applyPlan,
} from "../scripts/migrate-literature.mjs";

test("source inventory transforms to 9 categories and 161 public catalog rows", () => {
  const source = loadSource();
  assert.equal(source.categories.length, 9);
  assert.equal(source.products.length, 161);
  assert.deepEqual(validateSource(source), []);
  assert.equal(source.products.filter((item) => item.code === null).length, 14);
  assert.equal(
    source.products.filter(
      (item) => item.stock === 1 && item.sourceQuantity === undefined,
    ).length,
    36,
  );
  assert.ok(source.products.every((item) => item.isActive === true));
  assert.equal(
    source.products.find((item) => item.sourceCode === "NAL009").code,
    "NAL",
  );
  assert.equal(
    source.products.find((item) => item.sourceCode === "NAC022").code,
    "NAC",
  );
  assert.equal(
    source.products.find((item) => item.sourceCode === "AAPL000").code,
    "AAPL",
  );
  assert.equal(
    source.products.find((item) => item.sourceCode === "NAL003").code,
    "NAL003",
  );
  assert.ok(source.products.every((item) => !("total" in item)));
  const diagnostics = sourceDiagnostics(source);
  assert.equal(diagnostics.genericizedCodes, 13);
  assert.equal(diagnostics.stockDefaultedToOne, 36);
  assert.equal(diagnostics.ignoredSourceTotalMismatches.length, 3);
});

test("generic duplicate codes share alphabetic family codes while other codes remain unchanged", () => {
  const source = loadSource();
  assert.ok(
    source.products
      .filter((item) => item.sourceCode === "NAC")
      .every((item) => item.code === "NAC"),
  );
  assert.ok(
    source.products
      .filter((item) => item.sourceCode === "AAF")
      .every((item) => item.code === "AAF"),
  );
});

test("destination schema must contain optional stock and category relation", () => {
  const categories = {
    id: "cat-id",
    name: "categories",
    fields: [
      { name: "name", type: "text" },
      { name: "sort", type: "number" },
    ],
  };
  const literature = {
    name: "literature",
    fields: [
      { name: "code", type: "text" },
      { name: "title", type: "text", required: true },
      { name: "price", type: "number", required: true },
      {
        name: "stock",
        type: "number",
        required: false,
        onlyInt: true,
        min: 0,
      },
      { name: "isActive", type: "bool" },
      {
        name: "category",
        type: "relation",
        required: true,
        collectionId: "cat-id",
      },
    ],
    indexes: [],
  };
  assert.deepEqual(validateSchema([categories, literature]), []);
  assert.ok(
    validateSchema([
      categories,
      {
        ...literature,
        fields: literature.fields.filter((field) => field.name !== "stock"),
      },
    ]).includes("literature.stock must be number"),
  );
  const invalidStock = {
    ...literature,
    fields: literature.fields.map((field) =>
      field.name === "stock" ? { ...field, onlyInt: false, min: null } : field,
    ),
  };
  assert.deepEqual(validateSchema([categories, invalidStock]), [
    "literature.stock must be an integer field",
    "literature.stock must have minimum 0",
  ]);
});

test("source validation rejects duplicate title/category identities", () => {
  const source = loadSource();
  source.products[1].title = source.products[0].title;
  assert.ok(
    validateSource(source).some((error) =>
      error.includes("duplicate source title/category identity"),
    ),
  );
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
    stock: item.stock,
    isActive: item.isActive,
    category: categories.find((category) => category.name === item.categoryName)
      .id,
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
      if (apiPath.endsWith("/categories/records"))
        return { id: `cat-${++categoryCounter}` };
      return { id: "created" };
    },
    async () => "test-token",
  );
  assert.equal(
    calls.filter((call) => call.apiPath.endsWith("/categories/records")).length,
    9,
  );
  assert.equal(
    calls.filter((call) => call.apiPath.endsWith("/literature/records")).length,
    161,
  );
  assert.equal(calls[9].options.body.category, "cat-1");
  assert.equal(calls[9].options.body.code, "NAL003");
  assert.equal(calls[9].options.body.stock, 1);
  assert.equal("total" in calls[9].options.body, false);
});
