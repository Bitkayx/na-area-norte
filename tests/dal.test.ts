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
const { configureDal, createDal } = await import("./.dal-build/index.js");
const {
  listRecords,
  listRecordsPaginated,
  getOneRecord,
  normalizeBaseUrl,
  buildListUrl,
  buildGetUrl,
  resolveFile,
  isConfigured,
} = await import("./.dal-build/client.js");
const { normalizeLocation } = await import("./.dal-build/types/location.js");
const { normalizeSchedules } = await import("./.dal-build/types/schedule.js");
const { mapPost } = await import("./.dal-build/mappers/post.mapper.js");
const { mapEvent } = await import("./.dal-build/mappers/event.mapper.js");

/** Installs a mock global fetch returning canned per-path responses. */
function mockFetch(routes: Map<string, () => Response>) {
  (globalThis as unknown as { fetch: unknown }).fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    const reqPath = new URL(url).pathname;
    // 1) exact URL key, 2) key whose pathname equals the requested pathname
    // (ignores query params so paginated/sort/filter URLs share one mock).
    const from = (hitRaw: () => Response) => hitRaw();
    if (routes.has(url)) {
      return from(routes.get(url)!);
    }
    for (const [key, hitRaw] of routes) {
      let keyPath: string;
      try {
        keyPath = new URL(key).pathname;
      } catch {
        keyPath = key;
      }
      if (keyPath === reqPath) {
        return from(hitRaw);
      }
    }
    return jsonResponse(404, {});
  };
}

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
    assert.equal(normalizeBaseUrl("http://pb.test/_/nested"), "http://pb.test/_/nested");
    assert.equal(normalizeBaseUrl(""), "");
  });

  test("buildListUrl produces a valid collection list URL", () => {
    const url = buildListUrl("posts", { page: 2, perPage: 10 });
    const parsed = new URL(url);
    assert.equal(parsed.pathname, "/api/collections/posts/records");
    assert.equal(parsed.searchParams.get("page"), "2");
    assert.equal(parsed.searchParams.get("perPage"), "10");
  });

  test("buildListUrl serializes sort, filter (encoded), and expand", () => {
    const url = buildListUrl("groups", {
      sort: "-pubDate",
      filter: `status='published' && author != ""`,
      expand: "district,tags",
    });
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get("sort"), "-pubDate");
    assert.equal(decodeURIComponent(parsed.searchParams.get("filter")!), `status='published' && author != ""`);
    assert.equal(parsed.searchParams.get("expand"), "district,tags");
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
    assert.equal(resolveFile(record, "cover.jpg"), "http://pb.test/api/files/pbc_col/rec123/cover.jpg");
    assert.equal(resolveFile(record, null), null);
    assert.equal(resolveFile(record, ""), null);
    assert.equal(resolveFile(record, undefined), null);
    assert.equal(resolveFile(record, ["a.png", "b.png"]), "http://pb.test/api/files/pbc_col/rec123/a.png");
  });
});

describe("mapping (location, schedules, relations, M2M)", () => {
  test("normalizeLocation maps partial objects and defaults missing strings", () => {
    const loc = normalizeLocation({ linea1: "Calle A", colonia: "Col B", ciudad: "CDMX", estado: "CDMX", mapQuery: "q" });
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
    mockFetch(new Map([["http://pb.test/api/collections/posts/records", () => jsonResponse(200, { items: [record], totalItems: 1 })]]));
    const [post] = await listRecords("posts", mapPost, {});
    assert.equal(post.slug, "titulo");
    assert.equal(post.status, "published");
    assert.equal(post.coverUrl, "http://pb.test/api/files/pbc_p/post1/portada.jpg");
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
      location: { linea1: "Av 3-A", colonia: "Santa Rosa", ciudad: "GAM", estado: "CDMX", mapQuery: "q" },
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
    mockFetch(new Map([["http://pb.test/api/collections/groups/records", () => jsonResponse(200, { items: [record], totalItems: 1 })]]));
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
    mockFetch(new Map([["http://pb.test/api/collections/tags/records", () => jsonResponse(200, body)]]));
    const raw = await listRecordsPaginated("tags", () => ({}), { page: 2, perPage: 10 });
    assert.equal(raw.totalItems, 25);
    assert.equal(raw.totalPages, 3);
    assert.equal(raw.page, 2);
    assert.deepEqual(raw.items, []);
  });

  test("getOneRecord returns undefined on 404, throws on 500", async () => {
    mockFetch(
      new Map([
        ["http://pb.test/api/collections/events/records/absent", () => jsonResponse(404, {})],
        ["http://pb.test/api/collections/events/records/boom", () => jsonResponse(500, {})],
      ]),
    );
    assert.equal(await getOneRecord("events", "absent", mapEvent), undefined);
    await assert.rejects(() => getOneRecord("events", "boom", mapEvent), /500/);
  });

  test("HTTP errors are thrown, not swallowed into []", async () => {
    mockFetch(new Map([["http://pb.test/api/collections/posts/records", () => jsonResponse(500, {})]]));
    await assert.rejects(() => listRecords("posts", mapPost, {}), /500|Network/);
  });

  test("network failure is wrapped and thrown", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = async () => {
      throw new TypeError("boom");
    };
    await assert.rejects(() => listRecords("posts", mapPost, {}), /Network error/);
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
    assert.throws(() => createDal({ strictMode: true }), /PUBLIC_POCKETBASE_URL/);
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
    mockFetch(new Map([["http://pb.test/api/collections/site_settings/records", () => jsonResponse(200, { items: [record], totalItems: 1 })]]));
    const dal2 = createDal();
    const settings = await dal2.siteSettings.get();
    assert.ok(settings);
    assert.equal(settings.siteName, "NA Área Norte CDMX");
    assert.equal(settings.mapEmbedUrl, "https://maps.example");
    assert.equal(settings.logoUrl, "http://pb.test/api/files/pbc_s/s1/logo.png");
    assert.deepEqual(settings.navigation, [
      { label: "Inicio", href: "/" },
      { label: "Directorio", href: "/directorio/" },
    ]);
    assert.equal(settings.socialLinks.facebook, "https://fb.example");
    assert.equal(settings.hero?.slug, "/x");
    assert.equal(settings.seo?.ogImage, "/og.png");
  });
});
