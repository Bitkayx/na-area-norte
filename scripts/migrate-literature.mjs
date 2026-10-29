#!/usr/bin/env node
/**
 * Reconciles the V1 price catalog with PocketBase categories and literature.
 * Dry-run is the default and authenticates only to inspect the live schema.
 * `--apply` is the only mode that writes. V1 quantity maps to stock; total is
 * derived and never persisted.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  authenticate,
  displayBaseUrl,
  loadDotEnv,
  request,
} from "./migrate-districts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "src/data/inventory.json");
const API_CATEGORIES = "/api/collections/categories/records";
const API_LITERATURE = "/api/collections/literature/records";
const API_COLLECTIONS = "/api/collections";
const PRODUCT_FIELDS = [
  "code",
  "title",
  "price",
  "stock",
  "isActive",
  "category",
];

function getArg(flag, argv = process.argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function listAll(baseUrl, apiPath, requestFn = request, token) {
  return (async () => {
    const items = [];
    for (let page = 1; ; page++) {
      const query = new URLSearchParams({
        page: String(page),
        perPage: "200",
        sort: "id",
      });
      const result = await requestFn(baseUrl, `${apiPath}?${query}`, { token });
      const pageItems = Array.isArray(result?.items) ? result.items : [];
      const totalPages = Number(result?.totalPages ?? 1);
      if (!Number.isInteger(totalPages) || totalPages < 0)
        throw new Error(`invalid pagination response for ${apiPath}`);
      items.push(...pageItems);
      if (totalPages === 0 && page === 1 && pageItems.length === 0)
        return items;
      if (totalPages === 0)
        throw new Error(`invalid pagination response for ${apiPath}`);
      if (page >= totalPages) return items;
    }
  })();
}

function loadSource(file = SOURCE) {
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  const categories = [
    ...new Set(rows.map((row) => String(row.category ?? "").trim())),
  ];
  const codeCounts = new Map();
  for (const row of rows) {
    const code = String(row.code ?? "").trim();
    if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  return {
    categories: categories.map((name, sort) => ({ name, sort })),
    products: rows.map((row, index) => ({
      sourceIndex: index + 1,
      sourceCode: String(row.code ?? "").trim() || null,
      code: genericizeRepeatedCode(String(row.code ?? "").trim(), codeCounts),
      title: String(row.description ?? "").trim(),
      price: row.price,
      sourceQuantity: row.quantity,
      stock: row.quantity === undefined ? 1 : row.quantity,
      sourceTotal: row.total,
      isActive: true,
      categoryName: String(row.category ?? "").trim(),
    })),
  };
}

function genericizeRepeatedCode(code, counts) {
  if (!code) return null;
  if ((counts.get(code) ?? 0) < 2) return code;
  // Existing catalog conventions use the alphabetic prefix as the generic
  // family code (e.g. NAC022 -> NAC). Already generic codes remain unchanged.
  return code.replace(/\d+$/, "") || code;
}

function validateSource(source) {
  const errors = [];
  if (source.categories.length !== 9)
    errors.push(`expected 9 categories, found ${source.categories.length}`);
  if (source.products.length !== 161)
    errors.push(`expected 161 products, found ${source.products.length}`);
  const identities = new Set();
  for (const item of source.products) {
    if (!item.title) errors.push(`row ${item.sourceIndex}: missing title`);
    if (!Number.isFinite(item.price) || item.price < 0)
      errors.push(`row ${item.sourceIndex}: invalid price`);
    if (!Number.isInteger(item.stock) || item.stock < 0)
      errors.push(`row ${item.sourceIndex}: invalid stock`);
    if (
      !source.categories.some((category) => category.name === item.categoryName)
    )
      errors.push(
        `row ${item.sourceIndex}: unknown category ${item.categoryName}`,
      );
    const identity = `${item.categoryName}:${item.title}`;
    if (identities.has(identity))
      errors.push(
        `row ${item.sourceIndex}: duplicate source title/category identity`,
      );
    identities.add(identity);
  }
  return errors;
}

function sameProduct(existing, payload) {
  return PRODUCT_FIELDS.every((field) => {
    const current = field === "category" ? existing.category : existing[field];
    const expected = field === "category" ? payload.category : payload[field];
    if (field === "code") return (current || null) === (expected || null);
    return current === expected;
  });
}

function validateSchema(collections) {
  const errors = [];
  const byName = new Map(
    (collections ?? []).map((collection) => [collection.name, collection]),
  );
  const categories = byName.get("categories");
  const literature = byName.get("literature");
  if (!categories) errors.push("missing collection categories");
  if (!literature) errors.push("missing collection literature");
  if (!categories || !literature) return errors;

  const categoryFields = new Map(
    (categories.fields ?? []).map((field) => [field.name, field]),
  );
  if (categoryFields.get("name")?.type !== "text")
    errors.push("categories.name must be text");
  if (categoryFields.get("sort")?.type !== "number")
    errors.push("categories.sort must be number");

  const fields = new Map(
    (literature.fields ?? []).map((field) => [field.name, field]),
  );
  for (const [name, type] of [
    ["code", "text"],
    ["title", "text"],
    ["price", "number"],
    ["stock", "number"],
    ["isActive", "bool"],
    ["category", "relation"],
  ]) {
    if (fields.get(name)?.type !== type)
      errors.push(`literature.${name} must be ${type}`);
  }
  if (fields.get("stock")?.required)
    errors.push("literature.stock must remain optional");
  if (fields.get("stock") && fields.get("stock").onlyInt !== true)
    errors.push("literature.stock must be an integer field");
  const stockField = fields.get("stock");
  if (
    stockField &&
    (stockField.min === null ||
      stockField.min === undefined ||
      Number(stockField.min) !== 0)
  )
    errors.push("literature.stock must have minimum 0");
  const relation = fields.get("category");
  if (relation && relation.collectionId !== categories.id)
    errors.push("literature.category must relate to categories");
  if (relation && !relation.required)
    errors.push("literature.category must remain required");
  if (
    (literature.indexes ?? []).some(
      (index) => /unique/i.test(index) && /\bcode\b/i.test(index),
    )
  )
    errors.push("literature.code must allow generic duplicate values");
  return errors;
}

function buildPlan(source, existingCategories, existingProducts) {
  const categoryByName = new Map();
  const duplicateCategories = new Set();
  for (const category of existingCategories) {
    if (categoryByName.has(category.name))
      duplicateCategories.add(category.name);
    else categoryByName.set(category.name, category);
  }
  const categoryPlan = source.categories.map((category) => {
    if (duplicateCategories.has(category.name))
      return {
        ...category,
        action: "conflict",
        note: "duplicate destination category name",
      };
    const existing = categoryByName.get(category.name);
    if (!existing) return { ...category, action: "create" };
    if (Number(existing.sort) !== category.sort)
      return {
        ...category,
        id: existing.id,
        action: "conflict",
        note: "destination sort differs",
      };
    return { ...category, id: existing.id, action: "unchanged" };
  });

  const productsByIdentity = new Map();
  for (const product of existingProducts) {
    const key = `${product.category}:${String(product.title ?? "").trim()}`;
    productsByIdentity.set(key, [
      ...(productsByIdentity.get(key) ?? []),
      product,
    ]);
  }
  const productPlan = source.products.map((item) => {
    const category = categoryByName.get(item.categoryName);
    const plannedCategory = categoryPlan.find(
      (candidate) => candidate.name === item.categoryName,
    );
    const identity = category ? `${category.id}:${item.title}` : null;
    const hits = identity ? (productsByIdentity.get(identity) ?? []) : [];
    const payload = {
      code: item.code,
      title: item.title,
      price: item.price,
      stock: item.stock,
      isActive: item.isActive,
      category: category?.id ?? null,
    };
    if (plannedCategory?.action === "conflict")
      return {
        ...payload,
        sourceCode: item.sourceCode,
        sourceIndex: item.sourceIndex,
        categoryName: item.categoryName,
        action: "conflict",
        note: "destination category is ambiguous",
      };
    if (hits.length > 1)
      return {
        ...payload,
        sourceCode: item.sourceCode,
        sourceIndex: item.sourceIndex,
        categoryName: item.categoryName,
        action: "conflict",
        note: "duplicate destination product identity",
      };
    if (hits.length === 1)
      return {
        ...payload,
        sourceCode: item.sourceCode,
        sourceIndex: item.sourceIndex,
        categoryName: item.categoryName,
        id: hits[0].id,
        action: sameProduct(hits[0], payload) ? "unchanged" : "conflict",
        ...(sameProduct(hits[0], payload)
          ? {}
          : { note: "existing title/category has different fields" }),
      };
    return {
      ...payload,
      sourceCode: item.sourceCode,
      sourceIndex: item.sourceIndex,
      categoryName: item.categoryName,
      action: "create",
    };
  });
  return { categories: categoryPlan, products: productPlan };
}

function summarize(plan) {
  const counts = (items) =>
    Object.fromEntries(
      ["create", "unchanged", "conflict"].map((action) => [
        action,
        items.filter((item) => item.action === action).length,
      ]),
    );
  return {
    categories: counts(plan.categories),
    products: counts(plan.products),
  };
}

function sourceDiagnostics(source) {
  return {
    genericizedCodes: source.products.filter(
      (item) => item.sourceCode !== item.code,
    ).length,
    stockDefaultedToOne: source.products.filter(
      (item) => item.sourceQuantity === undefined,
    ).length,
    ignoredSourceTotalMismatches: source.products
      .filter(
        (item) =>
          item.sourceTotal !== undefined &&
          item.sourceTotal !== item.price * item.stock,
      )
      .map((item) => ({ sourceIndex: item.sourceIndex, title: item.title })),
  };
}

async function applyPlan(
  baseUrl,
  plan,
  requestFn = request,
  authFn = authenticate,
) {
  const token = await authFn(baseUrl, requestFn);
  const categoryIds = new Map(
    plan.categories
      .filter((item) => item.id)
      .map((item) => [item.name, item.id]),
  );
  for (const category of plan.categories) {
    if (category.action === "conflict")
      throw new Error(`cannot apply category conflict: ${category.name}`);
    if (category.action === "create") {
      const created = await requestFn(baseUrl, API_CATEGORIES, {
        method: "POST",
        token,
        body: { name: category.name, sort: category.sort },
      });
      categoryIds.set(category.name, created.id);
    }
  }
  for (const product of plan.products) {
    if (product.action === "conflict")
      throw new Error(
        `cannot apply product conflict at source row ${product.sourceIndex}`,
      );
    if (product.action === "create") {
      await requestFn(baseUrl, API_LITERATURE, {
        method: "POST",
        token,
        body: {
          code: product.code,
          title: product.title,
          price: product.price,
          stock: product.stock,
          isActive: product.isActive,
          category: categoryIds.get(product.categoryName),
        },
      });
    }
  }
}

async function runMigration({
  baseUrl,
  apply = false,
  jsonOut = false,
  requestFn = request,
  authFn = authenticate,
}) {
  if (!baseUrl) throw new Error("missing PB_URL or PUBLIC_POCKETBASE_URL");
  const source = loadSource();
  const sourceErrors = validateSource(source);
  if (sourceErrors.length) throw new Error(sourceErrors.join("; "));
  const token = await authFn(baseUrl, requestFn);
  const schemaResponse = await requestFn(baseUrl, API_COLLECTIONS, { token });
  const schemaErrors = validateSchema(schemaResponse?.items);
  if (schemaErrors.length) {
    if (jsonOut)
      console.log(JSON.stringify({ dryRun: !apply, schemaErrors }, null, 2));
    else {
      console.log(`PocketBase: ${displayBaseUrl(baseUrl)}`);
      console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN (no writes)"}`);
      for (const error of schemaErrors)
        console.log(`SCHEMA CONFLICT: ${error}`);
    }
    throw new Error(
      "destination schema is not compatible; refusing to plan or write records",
    );
  }
  const [categories, products] = await Promise.all([
    listAll(baseUrl, API_CATEGORIES, requestFn, token),
    listAll(baseUrl, API_LITERATURE, requestFn, token),
  ]);
  const plan = buildPlan(source, categories, products);
  const summary = summarize(plan);
  const diagnostics = sourceDiagnostics(source);
  if (jsonOut)
    console.log(
      JSON.stringify({ dryRun: !apply, summary, diagnostics, plan }, null, 2),
    );
  else {
    console.log(`PocketBase: ${displayBaseUrl(baseUrl)}`);
    console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN (no writes)"}`);
    console.log(`Categories: ${JSON.stringify(summary.categories)}`);
    console.log(`Literature: ${JSON.stringify(summary.products)}`);
    console.log(
      `Generic family codes applied: ${diagnostics.genericizedCodes}`,
    );
    console.log(`Stock defaulted to 1: ${diagnostics.stockDefaultedToOne}`);
    console.log(
      `Source totals ignored (do not equal price × stock): ${diagnostics.ignoredSourceTotalMismatches.length}`,
    );
    for (const item of [...plan.categories, ...plan.products]) {
      if (item.action === "conflict")
        console.log(`CONFLICT ${item.name ?? item.title}: ${item.note}`);
    }
  }
  const conflicts = summary.categories.conflict + summary.products.conflict;
  if (conflicts)
    throw new Error(`${conflicts} conflict(s); refusing migration`);
  if (apply) {
    await applyPlan(baseUrl, plan, requestFn, authFn);
    console.log(
      "Apply complete. Repeat dry-run to verify all records are unchanged.",
    );
  }
  return { summary, plan };
}

async function main(argv = process.argv) {
  loadDotEnv();
  return runMigration({
    baseUrl:
      getArg("--base-url", argv) ||
      process.env.PB_URL ||
      process.env.PUBLIC_POCKETBASE_URL ||
      "",
    apply: argv.includes("--apply"),
    jsonOut: argv.includes("--json"),
  });
}

export {
  loadSource,
  genericizeRepeatedCode,
  validateSource,
  validateSchema,
  buildPlan,
  summarize,
  sourceDiagnostics,
  listAll,
  applyPlan,
  runMigration,
  main,
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  });
}
