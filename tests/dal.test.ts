import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

/**
 * DAL validation suite.
 *
 * Uses Node's built-in test runner (`node --test`). No external test framework
 * added. Covers: URL building, filter/sort/expand serialization, pagination,
 * location & schedule mapping, relations, posts.tags M2M, PocketBase file URLs,
 * unconfigured behavior (permissive + strict), HTTP error propagation, and the
 * site_settings singleton.
 *
 * The public HTTP layer is exercised against a mocked global fetch so no real
 * PocketBase is contacted (this suite never writes to PocketBase).
 */

// Set before importing the DAL so the module-level shared `dal` builds with a
// configured base URL. Each test may override via configureDal()/createDal().
process.env.PUBLIC_POCKETBASE_URL = "http://pb.test";

// The DAL is a TypeScript module with standalone `interface`/`type` declarations
// that Node's `--experimental-strip-types` cannot erase. So the test suite runs
// against the JS emitted by `tsc` (tests/tsconfig.compile.json) into
// tests/.dal-build. `npm run test:dal` compiles then runs. The compiled output
// is git-ignored and regenerated.
const { configureDal, createDal, dal } = await import("./.dal-build/index.js");
const {
  listRecords,
  listRecordsPaginated,
  listAllRecords,
  getOneRecord,
  normalizeBaseUrl,
  buildListUrl,
  buildGetUrl,
  resolveFile,
  isConfigured,
  escapeFilterValue,
  MAX_PER_PAGE,
} = await import("./.dal-build/client.js");
const { normalizeLocation } = await import("./.dal-build/types/location.js");
const { normalizeSchedules } = await import("./.dal-build/types/schedule.js");
const { mapPost } = await import("./.dal-build/mappers/post.mapper.js");
const { mapEvent } = await import("./.dal-build/mappers/event.mapper.js");

/** Recorded request so tests can assert real query params (filter/sort/expand/page). */
interface HttpCall {
  href: string;
  url: URL;
}

type RouteHandler = (url: URL) => Response;

/** Original global fetch, captured on the first mockFetch() for teardown. */
const ORIGINAL_FETCH = (globalThis as unknown as { fetch: unknown }).fetch;

/**
 * Installs a mock global fetch returning canned responses and recording every
 * request. Matching: exact full URL first (query included), then a registered
 * route key by pathname (queries may vary on that endpoint).
 *
 * Unmatched URLs FAIL the test instead of silently returning 404, so a wrongly
 * built URL cannot go unnoticed. Register an explicit 404 route when a 404 is
 * part of the case under test.
 */
function mockFetch(routes: Map<string, RouteHandler>): HttpCall[] {
  const calls: HttpCall[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = async (
    input: RequestInfo | URL,
  ) => {
    const href = String(input);
    const url = new URL(href);
    calls.push({ href, url });
    if (routes.has(href)) {
      return routes.get(href)!(url);
    }
    for (const [key, handler] of routes) {
      let keyPath: string;
      try {
        keyPath = new URL(key).pathname;
      } catch {
        keyPath = key;
      }
      if (keyPath === url.pathname) {
        return handler(url);
      }
    }
    throw new Error(
      `[test] unexpected fetch: ${href}. Register an explicit route or 404.`,
    );
  };
  return calls;
}

afterEach(() => {
  (globalThis as unknown as { fetch: unknown }).fetch = ORIGINAL_FETCH;
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("client URL building", () => {
  test("normalizeBaseUrl strips the admin UI /_/ suffix and trailing slashes", () => {
    assert.equal(normalizeBaseUrl("http://pb.test/"), "http://pb.test");
    assert.equal(normalizeBaseUrl("http://pb.test/_/"), "http://pb.test");
    assert.equal(normalizeBaseUrl("http://pb.test/_"), "http://pb.test");
    assert.equal(
      normalizeBaseUrl("http://pb.test/_/nested"),
      "http://pb.test/_/nested",
    );
    assert.equal(normalizeBaseUrl(""), "");
  });

  test("buildListUrl produces a valid collection list URL", () => {
    const url = buildListUrl("posts", { page: 2, perPage: 10 });
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/api/collections/posts/records");
    assert.equal(parsed.searchParams.get("page"), "2");
    assert.equal(parsed.searchParams.get("perPage"), "10");
  });

  test("buildListUrl serializes sort, filter (encoded once), and expand", () => {
    const url = buildListUrl("groups", {
      sort: "-pubDate",
      filter: `status='published' && author != ""`,
      expand: "district,tags",
    });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("sort"), "-pubDate");
    // The filter must round-trip exactly: URLSearchParams encodes it once and
    // decodes it once, so no manual encodeURI() may be applied on top.
    assert.equal(
      parsed.searchParams.get("filter"),
      `status='published' && author != ""`,
    );
    assert.equal(parsed.searchParams.get("expand"), "district,tags");
  });

  test("buildListUrl encodes filter with spaces exactly once", () => {
    const filter = `status='published' && slug='invitaciones-marzo-2026'`;
    const url = buildListUrl("posts", { filter });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("filter"), filter);
    // No double-encoded percent sequences (e.g. %2520) leaked into the query.
    assert.ok(!url.includes("%2520"), "filter must not be double-encoded");
    assert.ok(!url.includes("%2522"), "filter must not be double-encoded");
  });

  test("buildListUrl encodes filter with quotes and special characters once", () => {
    const filter = `status="published" && (created>"2024-01-01")`;
    const url = buildListUrl("posts", { filter });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("filter"), filter);
    assert.ok(!url.includes("%2522"), "quotes must not be double-encoded");
    assert.ok(!url.includes("%253E"), "operators must not be double-encoded");
  });

  test("buildListUrl filter round-trips for posts, groups and districts", () => {
    const cases: Array<[string, string]> = [
      ["posts", `status='published' && slug='x'`],
      ["groups", `isActive=true && slug="x"`],
      ["districts", `isActive=true && number=1`],
    ];
    for (const [collection, filter] of cases) {
      const url = buildListUrl(collection, { filter });
      const parsed = new URL(url);
      assert.equal(
        parsed.searchParams.get("filter"),
        filter,
        `${collection} filter`,
      );
      assert.ok(
        !url.includes("%25"),
        `${collection} filter must not be double-encoded`,
      );
    }
  });

  test("buildListUrl omits unset params", () => {
    const url = buildListUrl("tags");
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("sort"), null);
    assert.equal(parsed.searchParams.get("filter"), null);
    assert.equal(parsed.searchParams.get("expand"), null);
  });

  test("buildGetUrl constructs detail URL with optional expand", () => {
    const parsed = new URL(buildGetUrl("events", "pbc_abc", "postRef"));
    assert.equal(parsed.pathname, "/api/collections/events/records/pbc_abc");
    assert.equal(parsed.searchParams.get("expand"), "postRef");
  });

  test("resolveFile builds PB file URL from collectionId/recordId/filename", () => {
    const record = {
      id: "rec123",
      collectionId: "pbc_col",
      collectionName: "posts",
      created: "",
      updated: "",
    };
    assert.equal(
      resolveFile(record, "cover.jpg"),
      "http://pb.test/api/files/pbc_col/rec123/cover.jpg",
    );
    assert.equal(resolveFile(record, null), null);
    assert.equal(resolveFile(record, ""), null);
    assert.equal(resolveFile(record, undefined), null);
    assert.equal(
      resolveFile(record, ["a.png", "b.png"]),
      "http://pb.test/api/files/pbc_col/rec123/a.png",
    );
  });
});

describe("mapping (location, schedules, relations, M2M)", () => {
  test("normalizeLocation maps partial objects and defaults missing strings", () => {
    const loc = normalizeLocation({
      linea1: "Calle A",
      colonia: "Col B",
      ciudad: "CDMX",
      estado: "CDMX",
      mapQuery: "q",
    });
    assert.equal(loc.linea1, "Calle A");
    assert.equal(loc.referencias, "");
    assert.equal(loc.mapQuery, "q");
    assert.deepEqual(normalizeLocation(null), {
      linea1: "",
      colonia: "",
      referencias: "",
      ciudad: "",
      estado: "",
      mapQuery: "",
    });
  });

  test("normalizeSchedules keeps valid schedules and drops invalid entries", () => {
    const scheds = normalizeSchedules([
      { days: [1, 2], startTime: "10:00", endTime: "11:30" },
      { days: [4, 7], startTime: "17:00", endTime: "18:30" },
      { days: [9], startTime: "10:00", endTime: "11:00" }, // day 9 invalid
      { days: [1], startTime: "11:00", endTime: "10:00" }, // end before start
      { days: [], startTime: "10:00", endTime: "11:00" }, // empty days
    ]);
    assert.equal(scheds.length, 2);
    assert.deepEqual(scheds[0].days, [1, 2]);
    assert.equal(scheds[1].endTime, "18:30");
  });

  test("normalizeSchedules treats null/[] as 'not informed'", () => {
    assert.deepEqual(normalizeSchedules(null), []);
    assert.deepEqual(normalizeSchedules(undefined), []);
    assert.deepEqual(normalizeSchedules([]), []);
  });

  test("mapPost resolves M2M tags from expand.tags and single event from expand.event", async () => {
    const record = {
      id: "post1",
      collectionId: "pbc_p",
      collectionName: "posts",
      created: "t0",
      updated: "t1",
      title: "Título",
      slug: "titulo",
      description: "desc",
      author: "Área Norte",
      pubDate: "2026-04-09",
      cover: "portada.jpg",
      body: "## Markdown",
      status: "published",
      tags: ["tagA", "tagB"],
      event: "ev1",
      expand: {
        tags: [
          { id: "tagA", name: "Eventos", slug: "eventos" },
          { id: "tagB", name: "Literatura", slug: "literatura" },
        ],
        event: {
          id: "ev1",
          collectionId: "pbc_e",
          collectionName: "events",
          created: "t0",
          updated: "t1",
          title: "Un Evento",
          slug: "un-evento",
          status: "active",
        },
      },
    };
    mockFetch(
      new Map([
        [
          "http://pb.test/api/collections/posts/records",
          () => jsonResponse(200, { items: [record], totalItems: 1 }),
        ],
      ]),
    );
    const [post] = await listRecords("posts", mapPost, {});
    assert.equal(post.slug, "titulo");
    assert.equal(post.status, "published");
    assert.equal(
      post.coverUrl,
      "http://pb.test/api/files/pbc_p/post1/portada.jpg",
    );
    assert.deepEqual(post.tagIds, ["tagA", "tagB"]);
    assert.equal(post.tags.length, 2);
    assert.equal(post.tags[0].slug, "eventos");
    assert.equal(post.event!.slug, "un-evento");
    assert.ok(post.pubDate instanceof Date);
  });

  test("mapGroup expands district relation", async () => {
    const { mapGroup } = await import("./.dal-build/mappers/entity.mapper.js");
    const record = {
      id: "g1",
      collectionId: "pbc_g",
      collectionName: "groups",
      created: "",
      updated: "",
      name: "Serenidad",
      slug: "serenidad-d2",
      location: {
        linea1: "Av 3-A",
        colonia: "Santa Rosa",
        ciudad: "GAM",
        estado: "CDMX",
        mapQuery: "q",
      },
      schedules: [{ days: [1, 3, 5], startTime: "19:00", endTime: "20:30" }],
      scheduleText: "Lunes, Miércoles y Viernes",
      notes: null,
      isActive: true,
      district: "d2",
      expand: {
        district: {
          id: "d2",
          collectionId: "pbc_d",
          collectionName: "districts",
          created: "",
          updated: "",
          name: "2do Distrito",
          number: 2,
          slug: "segundo-distrito",
          isActive: true,
        },
      },
    };
    mockFetch(
      new Map([
        [
          "http://pb.test/api/collections/groups/records",
          () => jsonResponse(200, { items: [record], totalItems: 1 }),
        ],
      ]),
    );
    const [group] = await listRecords("groups", mapGroup, {});
    assert.equal(group.districtId, "d2");
    assert.equal(group.district?.number, 2);
    assert.equal(group.schedules.length, 1);
    assert.equal(group.scheduleText, "Lunes, Miércoles y Viernes");
  });
});

describe("PocketBase HTTP behavior (mocked fetch)", () => {
  test("listRecordsPaginated returns the full pagination envelope", async () => {
    const body = {
      page: 2,
      perPage: 10,
      totalItems: 25,
      totalPages: 3,
      items: [],
    };
    mockFetch(
      new Map([
        [
          "http://pb.test/api/collections/tags/records",
          () => jsonResponse(200, body),
        ],
      ]),
    );
    const raw = await listRecordsPaginated("tags", () => ({}), {
      page: 2,
      perPage: 10,
    });
    assert.equal(raw.totalItems, 25);
    assert.equal(raw.totalPages, 3);
    assert.equal(raw.page, 2);
    assert.deepEqual(raw.items, []);
  });

  test("getOneRecord returns undefined on 404, throws on 500", async () => {
    mockFetch(
      new Map([
        [
          "http://pb.test/api/collections/events/records/absent",
          () => jsonResponse(404, {}),
        ],
        [
          "http://pb.test/api/collections/events/records/boom",
          () => jsonResponse(500, {}),
        ],
      ]),
    );
    assert.equal(await getOneRecord("events", "absent", mapEvent), undefined);
    await assert.rejects(() => getOneRecord("events", "boom", mapEvent), /500/);
  });

  test("HTTP errors are thrown, not swallowed into []", async () => {
    mockFetch(
      new Map([
        [
          "http://pb.test/api/collections/posts/records",
          () => jsonResponse(500, {}),
        ],
      ]),
    );
    await assert.rejects(
      () => listRecords("posts", mapPost, {}),
      /500|Network/,
    );
  });

  test("network failure is wrapped and thrown", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = async () => {
      throw new TypeError("boom");
    };
    await assert.rejects(
      () => listRecords("posts", mapPost, {}),
      /Network error/,
    );
  });
});

describe("unconfigured behavior (no PUBLIC_POCKETBASE_URL)", () => {
  const origEnv = process.env.PUBLIC_POCKETBASE_URL;

  beforeEach(() => {
    delete process.env.PUBLIC_POCKETBASE_URL;
  });
  afterEach(() => {
    if (origEnv !== undefined) process.env.PUBLIC_POCKETBASE_URL = origEnv;
    else delete process.env.PUBLIC_POCKETBASE_URL;
    configureDal();
  });

  test("permissive mode returns empty array without throwing", async () => {
    mockFetch(new Map());
    const dal2 = createDal({ strictMode: false });
    assert.equal(isConfigured(), false);
    assert.deepEqual(await dal2.districts.getAll(), []);
  });

  test("strict mode throws when PUBLIC_POCKETBASE_URL is missing", () => {
    mockFetch(new Map());
    assert.throws(
      () => createDal({ strictMode: true }),
      /PUBLIC_POCKETBASE_URL/,
    );
  });

  test("unconfigured siteSettings singleton returns undefined", async () => {
    mockFetch(new Map());
    const dal2 = createDal({ strictMode: false });
    assert.equal(await dal2.siteSettings.get(), undefined);
  });
});

describe("site_settings singleton via repository", () => {
  test("siteSettings.get returns the single record with mapped JSON fields", async () => {
    const record = {
      id: "s1",
      collectionId: "pbc_s",
      collectionName: "site_settings",
      created: "",
      updated: "",
      siteName: "NA Área Norte CDMX",
      description: "meta",
      addressLine: "Calle X",
      phone: "55 1234 5678",
      email: "a@b.c",
      mapEmbedUrl: "https://maps.example",
      logo: "logo.png",
      socialLinks: { facebook: "https://fb.example", twitter: null },
      hero: { titulo: "Hola", slug: "/x", imagen: "/img.png" },
      seo: { ogImage: "/og.png" },
      navigation: [
        { label: "Inicio", href: "/" },
        { label: "Directorio", href: "/directorio/" },
      ],
    };
    mockFetch(
      new Map([
        [
          "http://pb.test/api/collections/site_settings/records",
          () => jsonResponse(200, { items: [record], totalItems: 1 }),
        ],
      ]),
    );
    const dal2 = createDal();
    const settings = await dal2.siteSettings.get();
    assert.ok(settings);
    assert.equal(settings.siteName, "NA Área Norte CDMX");
    assert.equal(settings.mapEmbedUrl, "https://maps.example");
    assert.equal(
      settings.logoUrl,
      "http://pb.test/api/files/pbc_s/s1/logo.png",
    );
    assert.deepEqual(settings.navigation, [
      { label: "Inicio", href: "/" },
      { label: "Directorio", href: "/directorio/" },
    ]);
    assert.equal(settings.socialLinks.facebook, "https://fb.example");
    assert.equal(settings.hero?.slug, "/x");
    assert.equal(settings.seo?.ogImage, "/og.png");
  });
});

describe("getBySlug respects publication/active status", () => {
  test("posts.getBySlug returns post only when published", async () => {
    const routes = new Map([
      [
        "http://pb.test/api/collections/posts/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [
              {
                id: "p1",
                collectionId: "posts",
                collectionName: "posts",
                created: "2025-01-01T00:00:00Z",
                updated: "2025-01-01T00:00:00Z",
                title: "Publicado",
                slug: "publicado",
                description: "",
                author: null,
                pubDate: "2025-01-01",
                cover: "",
                body: "body",
                status: "published",
                tags: [],
              },
            ],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const p = await dal.posts.getBySlug("publicado");
    assert.equal(p?.slug, "publicado");
    assert.equal(p?.status, "published");
    // The status predicate must travel to the server: without it the query
    // could match drafts (and this test would pass vacuously).
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      "status='published'&&slug=\"publicado\"",
    );
  });

  test("posts.getBySlug returns undefined if only draft exists", async () => {
    const routes = new Map([
      [
        "http://pb.test/api/collections/posts/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 0,
            totalPages: 0,
            items: [],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const p = await dal.posts.getBySlug("borrador");
    assert.equal(p, undefined);
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      "status='published'&&slug=\"borrador\"",
    );
  });

  test("events.getBySlug returns event only when active", async () => {
    const routes = new Map([
      [
        "http://pb.test/api/collections/events/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [
              {
                id: "e1",
                collectionId: "events",
                collectionName: "events",
                created: "2025-01-01T00:00:00Z",
                updated: "2025-01-01T00:00:00Z",
                title: "Activo",
                slug: "activo",
                type: "congreso",
                startDate: "2026-12-01",
                endDate: "2026-12-02",
                location: "",
                organizer: null,
                organizerName: null,
                description: "",
                program: "",
                image: "",
                status: "active",
              },
            ],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const e = await dal.events.getBySlug("activo");
    assert.equal(e?.slug, "activo");
    assert.equal(e?.status, "active");
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      "status='active'&&slug=\"activo\"",
    );
  });

  test("events.getBySlug returns undefined if inactive", async () => {
    const routes = new Map([
      [
        "http://pb.test/api/collections/events/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 0,
            totalPages: 0,
            items: [],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const e = await dal.events.getBySlug("inactivo");
    assert.equal(e, undefined);
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      "status='active'&&slug=\"inactivo\"",
    );
  });
});

describe("filter value escaping", () => {
  test("escapeFilterValue serializes like the JS SDK pb.filter() (JSON string)", () => {
    assert.equal(escapeFilterValue("eventos"), '"eventos"');
    assert.equal(
      escapeFilterValue("x' || status='draft"),
      "\"x' || status='draft\"",
    ); // ' taken literally inside ""
    assert.equal(escapeFilterValue('say "hi"'), '"say \\"hi\\""');
    assert.equal(escapeFilterValue("te\\st"), '"te\\\\st"');
    assert.equal(escapeFilterValue("a\nb"), '"a\\nb"');
  });

  test("posts.getBySlug escapes quote/injection payloads in the filter param", async () => {
    const slug = "x' || status='draft";
    const routes = new Map([
      [
        "http://pb.test/api/collections/posts/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [
              {
                id: "p1",
                collectionId: "posts",
                collectionName: "posts",
                created: "",
                updated: "",
                title: "Publicado",
                slug: "whatever", // mock returns by path; the filter is what is asserted
                status: "published",
                pubDate: "2025-01-01",
                body: "b",
              },
            ],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const p = await dal.posts.getBySlug(slug);
    assert.ok(p);
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      `status='published'&&slug=${escapeFilterValue(slug)}`,
    );
    assert.equal(calls[0].url.searchParams.get("expand"), "tags,event");
    assert.equal(calls[0].url.searchParams.get("perPage"), "1");
  });

  test("events.getBySlug escapes quote/injection payloads in the filter param", async () => {
    const slug = "x' || status='active";
    const routes = new Map([
      [
        "http://pb.test/api/collections/events/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [
              {
                id: "e1",
                collectionId: "events",
                collectionName: "events",
                created: "",
                updated: "",
                title: "T",
                slug: "whatever",
                status: "active",
                startDate: "2100-01-01",
              },
            ],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const e = await dal.events.getBySlug(slug);
    assert.ok(e);
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      `status='active'&&slug=${escapeFilterValue(slug)}`,
    );
  });

  test("groups.getBySlug escapes double quotes and backslashes", async () => {
    const slug = 'bad"\\slug';
    const routes = new Map([
      [
        "http://pb.test/api/collections/groups/records",
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [
              {
                id: "g1",
                collectionId: "pbc_g",
                collectionName: "groups",
                created: "",
                updated: "",
                name: "G",
                slug: "whatever",
                isActive: true,
                district: "d2",
                expand: {
                  district: {
                    id: "d2",
                    collectionId: "pbc_d",
                    collectionName: "districts",
                    created: "",
                    updated: "",
                    name: "2do Distrito",
                    number: 2,
                    slug: "segundo-distrito",
                    isActive: true,
                  },
                },
              },
            ],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const g = await dal.groups.getBySlug(slug);
    assert.ok(g);
    assert.equal(g.district?.number, 2);
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      `isActive=true && slug=${escapeFilterValue(slug)}`,
    );
    assert.equal(calls[0].url.searchParams.get("expand"), "district");
  });

  test("tags.getBySlug searches by the slug field, not the record id", async () => {
    const routes = new Map([
      [
        buildListUrl("tags", { filter: 'slug="eventos"', perPage: 1 }),
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [
              {
                id: "t1",
                collectionId: "pbc_t",
                collectionName: "tags",
                created: "",
                updated: "",
                name: "Eventos",
                slug: "eventos",
              },
            ],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const tag = await dal.tags.getBySlug("eventos");
    assert.ok(tag);
    assert.equal(tag.name, "Eventos");
    assert.equal(tag.slug, "eventos");
    // GET by id route must NOT be used for slugs
    assert.equal(
      new URL(calls[0].href).pathname,
      "/api/collections/tags/records",
    );
    assert.equal(calls[0].url.searchParams.get("filter"), 'slug="eventos"');
  });

  test("tags.getBySlug escapes special characters and returns undefined when absent", async () => {
    const slug = 'o"brien\\';
    const routes = new Map([
      [
        buildListUrl("tags", {
          filter: `slug=${escapeFilterValue(slug)}`,
          perPage: 1,
        }),
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 0,
            totalPages: 0,
            items: [],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const tag = await dal.tags.getBySlug(slug);
    assert.equal(tag, undefined);
    assert.equal(
      calls[0].url.searchParams.get("filter"),
      `slug=${escapeFilterValue(slug)}`,
    );
  });
});

describe("pagination (real getAll/getRecent/getNext contracts)", () => {
  function pageBody(
    items: unknown[],
    page: number,
    perPage: number,
    totalPages: number,
  ) {
    return {
      page,
      perPage,
      totalItems: (page - 1) * perPage + items.length,
      totalPages,
      items,
    };
  }

  const postRecord = (id: string) => ({
    id,
    collectionId: "posts",
    collectionName: "posts",
    created: "",
    updated: "",
    title: `Publicación ${id}`,
    slug: id,
    status: "published",
    pubDate: `2025-0${(id.charCodeAt(id.length - 1) % 8) + 1}-01`,
    body: `cuerpo ${id}`,
  });

  const eventRecord = (id: string, startDate: string) => ({
    id,
    collectionId: "events",
    collectionName: "events",
    created: "",
    updated: "",
    title: id,
    slug: id,
    status: "active",
    startDate,
  });

  test("listAllRecords walks every page, requests pages in order, and stops at totalPages", async () => {
    const routes = new Map([
      [
        buildListUrl("demo", { page: 1, perPage: 2 }),
        () => jsonResponse(200, pageBody([{ id: "a" }, { id: "b" }], 1, 2, 2)),
      ],
      [
        buildListUrl("demo", { page: 2, perPage: 2 }),
        () => jsonResponse(200, pageBody([{ id: "c" }], 2, 2, 2)),
      ],
    ]);
    const calls = mockFetch(routes);
    const mapped: string[] = [];
    const items = await listAllRecords(
      "demo",
      (r) => {
        mapped.push(String((r as { id: string }).id));
        return (r as { id: string }).id;
      },
      { perPage: 2 },
    );
    assert.deepEqual(items, ["a", "b", "c"]);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url.searchParams.get("page"), "1");
    assert.equal(calls[1].url.searchParams.get("page"), "2");
  });

  test("listAllRecords does not loop on a single-page response", async () => {
    const routes = new Map([
      [
        buildListUrl("solo", { page: 1, perPage: 10 }),
        () => jsonResponse(200, pageBody([{ id: "a" }], 1, 10, 1)),
      ],
    ]);
    const calls = mockFetch(routes);
    const items = await listAllRecords(
      "solo",
      (r) => (r as { id: string }).id,
      { perPage: 10 },
    );
    assert.deepEqual(items, ["a"]);
    assert.equal(calls.length, 1);
  });

  test("literature.getAll returns ALL records across pages (contract: 161 items > one page)", async () => {
    const make = (id: string) => ({
      id,
      collectionId: "pbc_l",
      collectionName: "literature",
      created: "",
      updated: "",
      code: null,
      title: `Libro ${id}`,
      price: 10,
      isActive: true,
    });
    const routes = new Map([
      [
        buildListUrl("literature", {
          filter: "isActive=true",
          sort: "title,id",
          expand: "category",
          page: 1,
          perPage: MAX_PER_PAGE,
        }),
        () =>
          jsonResponse(
            200,
            pageBody([make("l1"), make("l2")], 1, MAX_PER_PAGE, 2),
          ),
      ],
      [
        buildListUrl("literature", {
          filter: "isActive=true",
          sort: "title,id",
          expand: "category",
          page: 2,
          perPage: MAX_PER_PAGE,
        }),
        () => jsonResponse(200, pageBody([make("l3")], 2, MAX_PER_PAGE, 2)),
      ],
    ]);
    const calls = mockFetch(routes);
    const all = await dal.literature.getAll();
    assert.deepEqual(
      all.map((l) => l.id),
      ["l1", "l2", "l3"],
    );
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url.searchParams.get("page"), "2");
    assert.equal(
      calls[0].url.searchParams.get("perPage"),
      String(MAX_PER_PAGE),
    );
  });

  test("posts.getRecent(n) keeps requesting pages until it has n items", async () => {
    const routes = new Map([
      [
        buildListUrl("posts", {
          filter: "status='published'",
          sort: "-pubDate,id",
          expand: "tags",
          page: 1,
          perPage: 3,
        }),
        () =>
          jsonResponse(
            200,
            pageBody([postRecord("p1"), postRecord("p2")], 1, 3, 2),
          ),
      ],
      [
        buildListUrl("posts", {
          filter: "status='published'",
          sort: "-pubDate,id",
          expand: "tags",
          page: 2,
          perPage: 3,
        }),
        () => jsonResponse(200, pageBody([postRecord("p3")], 2, 3, 2)),
      ],
    ]);
    const calls = mockFetch(routes);
    const recent = await dal.posts.getRecent(3);
    assert.equal(recent.length, 3);
    assert.deepEqual(
      recent.map((p) => p.id),
      ["p1", "p2", "p3"],
    );
    assert.equal(calls.length, 2);
  });

  test("posts.getRecent(0) and negative n return [] without fetching", async () => {
    const calls = mockFetch(new Map());
    assert.deepEqual(await dal.posts.getRecent(0), []);
    assert.deepEqual(await dal.posts.getRecent(-2), []);
    assert.equal(calls.length, 0);
  });

  test("events.getNext() keeps paging past stale events to find the upcoming one", async () => {
    // Page 1 is entirely past events; the next event lives on page 2.
    const routes = new Map([
      [
        buildListUrl("events", {
          filter: "status='active'",
          sort: "startDate,id",
          page: 1,
          perPage: 200,
        }),
        () =>
          jsonResponse(
            200,
            pageBody(
              [
                eventRecord("e0", "2020-01-01"),
                eventRecord("e1", "2020-02-01"),
              ],
              1,
              200,
              2,
            ),
          ),
      ],
      [
        buildListUrl("events", {
          filter: "status='active'",
          sort: "startDate,id",
          page: 2,
          perPage: 200,
        }),
        () =>
          jsonResponse(
            200,
            pageBody([eventRecord("e2", "2100-01-01")], 2, 200, 2),
          ),
      ],
    ]);
    const calls = mockFetch(routes);
    const next = await dal.events.getNext();
    assert.ok(next);
    assert.equal(next.slug, "e2");
    assert.equal(calls.length, 2);
  });
});

describe("radio repository (date contract)", () => {
  const radioRecord = (id: string, broadcastDate: string) => ({
    id,
    collectionId: "pbc_r",
    collectionName: "radio_broadcasts",
    created: "",
    updated: "",
    broadcastDate,
    ownerIsAreaNorte: false,
    time: "19:00",
    link: null,
    note: null,
    district: "d2",
  });

  test("getByDate returns the mapped broadcast and expands district", async () => {
    const date = "2026-10-12";
    const filter = `broadcastDate=${escapeFilterValue(`${date} 00:00:00.000Z`)}`;
    const routes = new Map([
      [
        buildListUrl("radio_broadcasts", {
          filter,
          expand: "district",
          perPage: 1,
        }),
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [radioRecord("r12", "2026-10-12 00:00:00.000Z")],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const result = await dal.radio.getByDate(date);
    assert.ok(result?.broadcastDate instanceof Date);
    assert.equal(
      result?.broadcastDate?.toISOString(),
      "2026-10-12T00:00:00.000Z",
    );
    assert.equal(result?.districtId, "d2");
    assert.equal(calls[0].url.searchParams.get("expand"), "district");
  });

  test("getNext requests the earliest participation on or after a date", async () => {
    const date = "2026-10-13";
    const filter = `broadcastDate>=${escapeFilterValue(`${date} 00:00:00.000Z`)}`;
    const routes = new Map([
      [
        buildListUrl("radio_broadcasts", {
          filter,
          expand: "district",
          perPage: 1,
          sort: "broadcastDate,id",
        }),
        () =>
          jsonResponse(200, {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [radioRecord("r19", "2026-10-19 00:00:00.000Z")],
          }),
      ],
    ]);
    const calls = mockFetch(routes);
    const result = await dal.radio.getNext(date);
    assert.equal(result?.id, "r19");
    assert.equal(calls[0].url.searchParams.get("sort"), "broadcastDate,id");
  });

  test("invalid calendar dates return undefined without fetching", async () => {
    const calls = mockFetch(new Map());
    assert.equal(await dal.radio.getByDate("2026-02-30"), undefined);
    assert.equal(await dal.radio.getNext("not-a-date"), undefined);
    assert.equal(calls.length, 0);
  });
});
