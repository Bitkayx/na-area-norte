# Análisis de noticias

Fecha: **2026-10-26**. Análisis local; no se consultó ni modificó la colección
`posts` de PocketBase.

## Inventario V1

`src/blog/` contiene **13 posts** y sus slugs son:

`asamblea-mexicana`, `congreso-regional-2026`, `encuentro-de-servidores`,
`encuentro-regional-literatura-2026`, `eventos-areanorte-2026`, `fraterna_80`,
`invitaciones-abril-2026`, `invitaciones-agosto-2026`,
`invitaciones-junio-2026`, `invitaciones-marzo-2026`, `invitaciones-mayo-2026`,
`invitaciones-septiembre-2026`, `mave-2026`.

El frontmatter exige `title`, `pubDate`, `description`, `author`, `image` y
`tags`. Todas las fechas son de 2026, todos los posts tienen autor `Área Norte`
y cada uno tiene al menos dos tags. Hay **49 referencias Markdown de imágenes**;
las referencias locales inspeccionadas existen. Las URLs externas del frontmatter
requieren revisión de disponibilidad y licencia durante el dry-run de media.

## Consumidores actuales

- `src/pages/noticias.astro` obtiene toda la lista desde Astro Content y genera
  tarjetas desde Markdown; todavía no usa `dal.posts.getPublished()`.
- `src/pages/noticias/[slug].astro` genera rutas desde Astro Content. Solo para
  los 13 slugs conocidos intenta `dal.posts.getBySlug()`, y vuelve a Markdown si
  falta el registro o el body remoto está vacío.
- `src/pages/index.astro`, `BannerPromocional.astro` y páginas de servicios
  enlazan slugs públicos concretos. No retirar Markdown hasta validar esos
  enlaces y el contenido remoto.

## Riesgos y decisiones pendientes

- Confirmar que la colección `posts` contiene exactamente estos slugs o definir
  cómo tratar publicaciones nuevas administradas solo en PocketBase.
- Comparar cuerpo, descripción, autor, `pubDate`, tags, cover y media sin
  descartar imágenes Markdown embebidas.
- Resolver si el cuerpo se almacenará en el editor de PocketBase como HTML o
  Markdown; el renderer actual transforma Markdown remoto con `marked`.
- Confirmar la estrategia para covers locales y URLs externas antes de subir
  assets. No inventar tags ni sustituir media faltante.
- Para presentación cuando falte un cover, el frontend usa el asset local
  `public/assets/blog/news_default.jpg`; esto no rellena el campo `cover` remoto.
- Eliminar la allowlist de slugs solo después de que `getStaticPaths()` y la
  lista consulten una fuente verificada y se haya probado build/preview.

## Siguiente verificación

Leer el schema y registros de `posts` y `tags` en modo lectura, sin mostrar
secretos. Preparar un inventario comparativo y un dry-run de reconciliación. No
usar `--apply` hasta revisar slugs, tags, media y cuerpos.

## Evidencia remota — 2026-10-26

- Schema autenticado: `posts` y `tags` tienen list/view públicas, escrituras
  restringidas, slug único y relación M2M de tags; `posts.event` es opcional.
- La colección remota contiene **13 posts**, exactamente los 13 slugs V1, todos
  con `status=published`; no hay posts extra en esta lectura.
- Hay **9 tags** remotos. Los tags expandidos coinciden con los tags V1
  normalizados por slug en los 13 registros.
- Ningún post tiene evento relacionado. No se debe crear relación por inferencia.
- `congreso-regional-2026` tenía `pubDate` remoto vacío. Tras autorización se
  actualizó a `2026-08-01`, igual que V1; el dry-run posterior dejó los 13 posts
  `UNCHANGED`.
- Seis registros no tienen `cover` remoto (`eventos-areanorte-2026` y cinco
  invitaciones). El fallback local cubre esta diferencia de presentación sin
  escribir en PocketBase.
- Los conteos de imágenes embebidas coinciden en los 13 posts: 49 en V1 y
  PocketBase. PocketBase puede renombrar los assets subidos, así que las rutas
  locales no necesariamente comparten basename.
- Los cuerpos son no vacíos. Una comparación normalizada de palabras muestra
  diferencias textuales en varios posts; esa heurística no determina si los
  cambios son intencionales. La revisión semántica sigue pendiente; no se
  imprimieron cuerpos completos.
- `node scripts/migrate-news-pubdates.mjs --apply` actualizó únicamente
  `pubDate` de `congreso-regional-2026` a `2026-08-01` tras autorización.
  Repetir `node scripts/migrate-news-pubdates.mjs` reportó 13 `UNCHANGED`.
- Se integraron inicio, listado y rutas estáticas con DAL; Markdown queda como
  fallback cuando PocketBase no tiene posts, no tiene el slug o un cuerpo está
  vacío. No se retiró ninguna fuente V1.
- Builds: `PUBLIC_POCKETBASE_URL= ./node_modules/.bin/astro build` produjo 32
  páginas con fallback local; `node --env-file=.env node_modules/astro/astro.js
  build` produjo 48 páginas con PocketBase. La página de noticias contiene 13
  slugs; el inicio muestra los 4 más recientes.
