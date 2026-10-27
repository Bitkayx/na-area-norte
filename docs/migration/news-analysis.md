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
- `congreso-regional-2026` tiene `pubDate` remoto vacío, aunque V1 declara
  `2026-08-01`; requiere revisión editorial antes de actualizar.
- Seis registros no tienen `cover` remoto (`eventos-areanorte-2026` y cinco
  invitaciones), aunque sus cuerpos o frontmatter contienen referencias de
  imágenes; distinguir cover de imágenes embebidas antes de cambiar media.
- Los cuerpos remotos tienen contenido no vacío. Falta comparar contenido y
  referencias de media con hashes o un inventario detallado; no se imprimieron
  cuerpos completos.
