# Análisis de noticias

Análisis inicial: **2026-10-26**. Revisión de cuerpos: **2026-10-30**.
La revisión remota fue de solo lectura; no modificó la colección `posts`.

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

- `src/pages/noticias.astro` obtiene la lista mediante `getNewsItems()`, que
  consulta `dal.posts.getPublished()`.
- `src/pages/noticias/[slug].astro` obtiene slugs y cuerpos publicados mediante
  DAL y detiene la build si falta un registro o un body.
- `src/pages/index.astro`, `BannerPromocional.astro` y páginas de servicios
  enlazan slugs públicos concretos, conservados en PocketBase.

## Auditoría de retiro V1 — 2026-11-02

- Runtime antes del retiro: `src/lib/news.ts` y la ruta dinámica consultaban
  Astro Content como respaldo; el layout calculaba `tagCounts` sin usarlo.
- Mantenimiento/migración: 13 scripts (`scripts/migrate-*.mjs`) leen los archivos
  `src/blog/*.md` como entrada. Borrarlos rompería la reproducibilidad de esos
  scripts aunque no afectaría la lectura normal de PocketBase.
- Assets: `src/assets/blog/` también se importa desde páginas de inicio y
  servicios; no es seguro eliminar el directorio completo al retirar posts.
- La revisión de preview se confirmó satisfactoria por el usuario el 2026-11-02.
- **Decisión anterior (supersedida):** mantener el fallback runtime en ese
  checkpoint; los archivos siguen siendo fuente de los scripts históricos.

## Retiro del fallback runtime — 2026-11-02

Tras la confirmación del usuario sobre el Preview y la validación de los 13 posts,
se retiró el fallback runtime de `src/lib/news.ts` y
`src/pages/noticias/[slug].astro`. La generación de rutas y los cuerpos publicados
dependen ahora de PocketBase; un post publicado sin cuerpo detiene la build para
no generar una página incompleta. Inicio y listado muestran un estado vacío si no
hay posts. `MarkdownPostLayout.astro` dejó de consultar Astro Content para el
`tagCounts` que no se usaba.

Los Markdown permanecen porque 13 scripts históricos los usan como entrada
reproducible. Los assets locales también se conservan hasta definir la política
de imágenes del punto 4.

## Verificación posterior

La revisión de Events y duplicados está documentada en `events-analysis.md`.
Los archivos Markdown siguen conservados para los 13 scripts históricos.

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
- Revisión automatizada del 2026-10-30: una comparación de texto visible
  normalizado encontró los 13 cuerpos iguales. Se ignoró la sintaxis Markdown/HTML
  de enlaces e imágenes y entidades HTML (`&nbsp;`); no se imprimieron cuerpos.
  Las 49 imágenes de V1 también están representadas en PocketBase: 47 como
  imágenes Markdown y 2 como `<img>` HTML. No se encontraron enlaces en línea.
  Esto confirma equivalencia textual y conteos de media, no la carga visual de
  cada archivo ni aprobación editorial humana.
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

## Siguiente paso

Listado y rutas consultan DAL cuando hay posts remotos, conservando Markdown como
fallback. El build local del 2026-10-30 produjo 32 páginas y mostró 13 tarjetas,
13 rutas existentes. El build remoto produjo 48 páginas; el listado generado
contiene las mismas 13 tarjetas/rutas y seis covers predeterminados.

El usuario confirmó el **2026-11-02** que la revisión visual del preview pasó:
listado, posts con distintas formas de imagen, orden de imágenes y vista móvil.
Esta comprobación visual fue realizada por el usuario, no por Codex. Junto con el
build empaquetado remoto del 2026-10-30, que produjo 48 páginas, en las
13 rutas de post se encontraron 75 usos de `<img>`, con las 49 imágenes embebidas
resueltas a archivos locales existentes y 10 URLs remotas que respondieron HTTP
200 con MIME de imagen. Estos checks automatizados no inspeccionan encuadre ni
presentación. Codex no tuvo acceso a navegador/preview. El smoke test local que reportó el
usuario mostró HTTP 200 para inicio, `/_image`, listado, dos posts y directorio.
La revisión visual de medios queda completa según confirmación del usuario.

La revisión visual de medios está completa según confirmación del usuario. Los
13 Markdown se conservan como entrada de scripts históricos, sin fallback
runtime. La revisión de Events y duplicados ya está documentada en
`events-analysis.md`.

El usuario reportó el **2026-11-02** este smoke test manual del servidor local:
`/`, `/_image`, `/noticias/`, `/noticias/invitaciones-agosto-2026`,
`/noticias/invitaciones-septiembre-2026` y `/directorio/` respondieron HTTP 200.
Es evidencia aportada por el usuario; confirma esas solicitudes puntuales, no la
carga visual de todas las imágenes ni el preview de Vercel.
