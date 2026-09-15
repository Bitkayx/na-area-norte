# Data Flow — Área Norte V1 → V2

> **Estado:** PROPUESTA.
> Complementa `pocketbase-schema.md` y `ADR-001`.

Este documento describe quién produce/dueña cada dato y el recorrido desde la edición hasta el usuario final.

---

## Flujo V1 (actual)

```text
GitHub
  ├── src/blog/*.md        (posts)
  ├── src/data/grupos/     (grupos + distritos)
  ├── src/data/inventory.json
  ├── src/data/radiodifusion.json
  ├── src/pages/*.astro    (hardcode: hero, eventos, ubicación, literatura)
  └── src/assets, public/  (media)
          │
          ▼
      Astro (SSG estático)
          │
          ▼
      Vercel ──► Usuario
```

Cambiar contenido = editar archivos → commit → push → deploy. Requiere conocimientos técnicos.

---

## Flujo V2 (objetivo)

```text
   Editor (no técnico)
          │
          ▼
     PocketBase (Railway)
      CMS + API (fuente de verdad)
          │
      API pública (lectura)
          │
          ▼
      Astro (presentación)
       Servicios / DAL
          │
          ▼
      Vercel ──► Usuario
```

Editor escribe en PocketBase → Astro lee vía DAL en build → genera estático → usuario.

---

## Responsabilidad de cada parte

### PocketBase (responsable del contenido operativo — fuente de verdad)

- **District** (1,2,4,5), **Group**, **Post**, **Event**, **Literature**, **Category**, **RadioBroadcast**, **Tag**, **SiteSettings** (singleton).
- **Media** operativa asociada a esas entidades (portadas, imágenes de eventos, logo).
- Campo `body`/`program` de posts/eventos (contenido).
- `scheduleText` / textos originales cuando se requiera trazabilidad.

### Frontend / Astro (responsable de presentación y lógica de aplicación)

- Renderizado y estilos (componentes, Tailwind).
- **Capa de servicios / DAL**: traduce los modelos de PocketBase a los modelos de dominio del frontend. El frontend **no accede a PocketBase directamente** (regla AGENTS.md); los componentes usan la capa de servicios.
- Reglas de negocio de presentación: countdown de eventos, semana actual de radio, orden de posts, filtrado del directorio, agrupación/computo de tags.
- **Formateo** (fechas, moneda) — presentación, no dominio.
- **Assets de UI** que no son contenido operativo (favicon, iconos de UI).

### Datos que SÍ permanecen como responsabilidad del frontend (no migrar salvo decisión)

- **Reflexion**: sigue viniendo de **Google Sheets** (`PUBLIC_SHEET_URL`). Fuera de PocketBase en esta fase (AGENTS.md / ADR-003).
- **Texto de presentación** (copy estático de páginas como "servicios", "contacto", términos, aviso de privacidad) salvo que se decida migrar a SiteSettings.
- **Estructura de navegación** (candidato a SiteSettings; decisión pendiente).
- **Estilos, componentes, enrutamiento, XML sitemap.**

---

## Lectura vs escritura

| Acción | Ruta | Acceso |
|---|---|---|
| Editar/crear contenido | Editor → panel PocketBase | Admin/Editor (api administrativa) |
| Leer contenido publicado | PocketBase → API pública → Astro (build) | Público (baja: `PUBLIC_POCKETBASE_URL`) |
| Escritura desde el frontend | **No permitida** | – |

El frontend es **solo lectura** vía API pública. Toda escritura ocurre en el panel de edición.

---

## Peticiones de datos (build)

Astro (SSG) en tiempo de build consulta PocketBase vía DAL:

1. `/districts` → página de directorio (sedes/sesiones) y mapa.
2. `/groups` (+ expand `district`, `paginate`) → directorio.
3. `/posts` (status=published) → `/noticias`, home (últimos 4).
4. `/events` · `/postRef` → página de eventos / evento del mes.
5. `/literature` (+ expand `category`) → `/servicios/literatura`.
6. `/radio_broadcast` → banner semanal (`week` actual, respetando `time`).
7. `/site_settings` (singleton) → SEO, contacto, logo, navegación, hero.
8. `/tags` (slug) → enlaces `/tags/{slug}` (hoy rotos en V1).
9. Reflexiones siguen viniendo de Google Sheets (`getReflexiones*`).

---

## Reglas de consistencia con AGENTS.md

- Astro **no debe contener datos operativos duplicados** (regla "no hardcodear datos de dominio").
- El frontend se mantiene **desacoplado** de detalles de PocketBase vía DAL.
- No se elimina el código V1 hasta validar la migración; durante la fase de transición puede haber fuentes en paralelo (feature flags del DAL).

---

## Migración (validable antes de producción)

1. **Analyze → Transform → Validate → Review → Migrate → Verify** (AGENTS.md).
2. Migraciones **dry-run/de análisis** antes de cualquier operación destructiva.
3. No modificar producción sin aprobación explícita.
4. Preservar slugs, textos originales de horarios, media y URLs.
