import assert from "node:assert/strict";
import test from "node:test";
import { marked } from "marked";
import { sanitizePostBody } from "../src/lib/security/sanitize-post-body.mjs";

test("keeps ordinary post formatting and safe images and links", () => {
  const dirty = marked.parse(
    '# Invitaciones\n\nTexto **importante**.\n\n![Cartel](/assets/cartel.jpg)\n\n[Más información](https://example.org)',
  );

  const clean = sanitizePostBody(dirty);

  assert.match(clean, /<h1>Invitaciones<\/h1>/);
  assert.match(clean, /<strong>importante<\/strong>/);
  assert.match(clean, /<img[^>]+src="\/assets\/cartel\.jpg"[^>]+alt="Cartel"/);
  assert.match(clean, /<a href="https:\/\/example\.org">Más información<\/a>/);
});

test("removes script tags, event handlers, unsafe URLs, and embedded active content", () => {
  const clean = sanitizePostBody(
    '<h2 onclick="alert(1)">Título</h2><script>alert(2)</script><img src="/assets/a.jpg" onerror="alert(3)"><a href="javascript:alert(4)">link</a><iframe src="https://evil.example"></iframe><video><source src="/movie.mp4"></video>',
  );

  assert.match(clean, /<h2>Título<\/h2>/);
  assert.match(clean, /<img src="\/assets\/a\.jpg"\s*\/>/);
  assert.match(clean, /<a>link<\/a>/);
  assert.doesNotMatch(clean, /script|onclick|onerror|javascript:|iframe|video|source/i);
});
