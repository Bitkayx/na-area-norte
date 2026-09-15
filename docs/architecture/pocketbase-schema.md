# PocketBase Schema — Diseño Definitivo (V2)

> **Estado:** APROBADO y alineado con el script (`scripts/create-schema.mjs`).
> **Fase:** PocketBase schema design → creación de colecciones (via script en repo), lista para revisión/ejecución.
> **Regla:** el diseño fue aprobado; la creación de colecciones se realiza mediante el script `scripts/create-schema.mjs` (revisable; **`--apply` no se ejecuta** hasta contar con credenciales/URL real y confirmación). NO se ejecutan migraciones de datos V1, NO se modifican datos existentes, NO se toca el frontend, NO se eliminan archivos V1.

Este documento define el diseño del esquema de PocketBase para V2. Está alineado con `AGENTS.md`, `ADR-001` (V1→V2), `ADR-002` (PocketBase), `ADR-003` (Domain Model) y `ADR-004` (District/Group separación).

PocketBase es la **fuente de verdad** del contenido operativo. Astro se encarga de la presentación y lógica de aplicación vía una capa de servicios (DAL).

---

## DOMAIN (reglas de dominio consolidadas)

- **Área Norte** es la organización de nivel superior. No es un District.
- **Districts existentes:** 1, 2, 4 y 5. **NO existe District 3. NO existe District 6.** Nunca se crean como entidades (ni a partir de datos legacy de radio).
- Los 4 districts pertenecen al Área Norte.
- **Group** pertenece **obligatoriamente** a exactamente un District.
- **District y Group son entidades independientes** (no se fusionan; grupos homónimos de distinto distrito conviven).
- `District.address/location` representa la **ubicación física** (no necesariamente una "oficina").
- **District y Group** pueden tener **múltiples** `schedules`.
- `schedules: []` (o null) significa **"no informado"**, no "no hay sesiones".
- **Schedule** (JSON embebido, §12):
  ```json
  { "days": [1, 2], "startTime": "10:00", "endTime": "11:30" }
  ```
  - `days`: números ISO (1=Lu … 7=Do), combinaciones arbitrarias.
  - `startTime` / `endTime`: `"HH:mm"`, `endTime > startTime`.
  - Ejemplos válidos como dos Schedule objects independientes: `[1,2] 10:00-11:30` (lunes+martes) y `[4,7] 17:00-18:30` (jueves+domingo).
  - No se limita a un único rango por día.
- **Slugs explícitos y únicos** globalmente.
- **Colisiones** (por distrito): `serenidad-d2`, `serenidad-d4`, `valor-para-cambiar-d2`, `valor-para-cambiar-d4`. No fusionar por compartir nombre.
- **Radio:** los legacy `Distrito 3` / `Distrito 6` y `Area Norte` / `Comite de Area Norte` → **`ownerIsAreaNorte=true`, `district=null`**. NO se crean District 3/6.
- **Literature:** sin stock definitivo; `total` (V1) **no se migra**; `code` nullable; **sin `unique(code)` todavía**; no inventar códigos.
- **Reflexion:** queda **fuera** de PocketBase (sigue en Google Sheets).
- **Events:** se modela, pero **NO se ejecuta todavía** la extracción/migración (revisión humana previa; no inventar fechas/lugares).
- **Media:** NO es colección (campos `file` por entidad + contenido embebido).
- **Assets V1** no se eliminan ni mueven en esta fase.
- **SiteSettings:** singleton; `navigation` pertenece a SiteSettings.
- **Tags:** colección normalizada con relación **M2M** desde Post.

---

## Convenciones / decisiones transversales

- **Campo base común (autodate):** todo registro de PocketBase incluye `created` y `updated` manejados automáticamente por el tipo `Autodate` de PocketBase. No se almacenan manualmente.
- **Identificador:** PocketBase usa un `id` autogenerado de 15 caracteres. Los slugs públicos van en campos `text` dedicados (`slug`) cuando son necesarios para URLs.
- **Nombres de campos en inglés** (convención de PocketBase y del código existente que usa `id`, `nombre`, etc. — para V2 se normaliza a inglés manteniendo la semántica de dominio; el frontend mapea a su modelo).
- **Timestamp de publicación** se almacena como `date`.
- **Campos derivados NO se almacenan** (se calculan en frontend/DAL). Ajustado a la regla "No migrar campos derivados".
- **Información original V1 no se elimina** durante la migración; los textos originales de horarios se conservan como respaldo (campo `scheduleText` cuando sea necesario para trazabilidad).

### Notas de implementación del script (relaciones)

- **M2M `posts.tags`:** PocketBase trata un campo `relation` como *múltiple* únicamente cuando `maxSelect > 1`; **no existe sentinel "ilimitado"** (`maxSelect <= 1` = relación simple; el campo almacena un array de ids). En el script `posts.tags` usa `maxSelect: 20` como **techo puramente técnico** para representar M2M. **No es una regla de dominio** que limite un Post a N tags; es el valor mínimo/máximo requerido por PocketBase para expresar "múltiple". Es holgado: el dataset V1 nunca supera 4 tags por post. Si un post real un día requiriera más, se relaja este número.
- **`collectionId` por nombre vs. ID real:** PocketBase 0.27.x valida que `collectionId` sea igual al **ID real** de la colección destino (`FindCachedCollectionByNameOrId` + comprobación `Id == collectionId`); un nombre como string **falla la validación**. El script define las relaciones por *nombre* y, en la fase 2, las **resuelve al ID real** de la colección creada antes del `PATCH`.

---

## 1. District

**Propósito:** unidad administrativa dentro de Área Norte. Ubicación física del distrito (no necesariamente "oficina"). Puede tener sesiones → `schedules`.

**Origen V1:** las 4 sedes extraídas de `src/data/grupos/distrito{1,2,4,5}.json` (`primer-distrito`, `segundo-distrito`, `cuarto-distrito`, `quinto-distrito`).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `name` | text | sí | – | no | – | nombre textual ("1er Distrito"…) |
| `number` | number | sí | – | **sí** | sí | 1, 2, 4, 5. Nunca 3 ni 6. |
| `slug` | text | sí | – | **sí** | sí | `primer-distrito`, … |
| `description` | text | no | null | no | – | descripción opcional |
| `location` | json | sí | – | no | – | ver `Address/Location` (§11) |
| `schedules` | json | no | [] | no | – | array de Schedule (§12) |
| `scheduleText` | text | no | null | no | – | texto V1 original, trazabilidad |
| `isActive` | bool | sí | true | no | – | – |

**Relación con Group:** 1──* (un District tiene muchos Groups). Se expresa en el lado **Group** vía `district` (relation), no en District. **Delete behavior:** al eliminar District, no se cascada borran grupos; los grupos con esa referencia bloqueados o `ON_RESTRICT` (ver §2).

**Delete behavior de la colección:** manual; al eliminar un District con Groups referenciados se debe **rechazar** (restrict) para no romper el directorio.

**Nuevo en V2:** `number` explícito, `isActive`, `slug` propio, comentarios de dominio. Nada nuevo inventado.

**Derivado (NO almacenar):** número de grupos por distrito (se calcula), "sede/oficina" se interpreta como ubicación (no campo adicional).

---

## 2. Group

**Propósito:** grupo de reunión perteneciente a exactamente un District.

**Origen V1:** los 43 grupos reales de `src/data/grupos/distrito{1,2,4,5}.json` (excluyendo las 4 sedes → District).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `name` | text | sí | – | no | sí | verbatim (no renombrar comunidad) |
| `slug` | text | sí | – | **sí** | sí | **globalmente único** (p. ej. `serenidad-d2`, `serenidad-d4`) |
| `district` | relation → District | sí | – | no | sí | FK; un grupo → un distrito |
| `location` | json | sí | – | no | – | §11 |
| `schedules` | json | no | [] | no | – | §12 |
| `scheduleText` | text | no | null | no | – | texto V1 original |
| `notes` | text | no | null | no | – | proviene de `referencias` |
| `isActive` | bool | sí | true | no | sí | filtro de visibilidad |

**Delete behavior:** cuando se elimina un District (relación hacia atrás), los Groups deben quedar con la referencia **restringida** (`ON_DELETE=RESTRICT`) para evitar huérfanos.

**Slugs / colisiones (regla AGENTS.md):** slugs globalmente únicos; grupos homónimos de distintos distritos incluyen el sufijo de distrito (`-d2`, `-d4`). **No fusionar** grupos por compartir nombre.

**Derivado (NO almacenar):** nada calculado (conteo de horarios, etc.).

---

## 3. Post

**Propósito:** comunicados / noticias publicadas por Área Norte.

**Origen V1:** los 11 Markdown de `src/blog/*.md`. `slug` = nombre de archivo (conservar para no romper URLs `/noticias/{slug}`).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `title` | text | sí | – | no | sí | – |
| `slug` | text | sí | – | **sí** | sí | nombre de archivo V1 conservado |
| `description` | text | sí | – | no | – | – |
| `author` | text/user | sí | "Área Norte" | no | – | V1 todos "Área Norte"; V2 registrar editor |
| `pubDate` | date | sí | – | no | sí | fecha de publicación |
| `cover` | file | no | null | no | – | imagen de portada |
| `body` | editor | no | null | no | – | contenido; conserva Markdown |
| `tags` | relation → Tag (many) | no | [] | no | – | muchos-a-muchos (§9); en el script `maxSelect=20` techo técnico (ver nota M2M) |
| `status` | select | sí | "published" | no | – | `published` / `draft` / `archived` |
| `event` | relation → Event | no | null | no | – | enlace opcional post→evento (§7) |

**Delete behavior:** al eliminar Post, NO borrar los Tags asociados (manejar M2M sin cascada destructiva; PocketBase no cascada en `many` por defecto → conservar tags).

**Exportar/importar:** PocketBase exporta relaciones M2M (tags) vía la tabla pivote interna; documentar en la migración.

**Nuevo en V2:** `status`, `slug` (mismo de V1), relación a Event, `author` editable. `media` se resuelve por campo file + contenido embebido (§ Media).

**Derivado (NO almacenar):** conteo de tags, URLs de tags (se derivan del slug), fecha formateada.

**Videos (regla AGENTS.md):** los videos grandes requieren estrategia de almacenamiento aparte. Ver § Media.

---

## 4. Event

**Propósito:** entidad independiente de Post. Permite consultar fecha/lugar/estado sin parsear texto.

**Origen V1:** eventos extraídos de posts (encuentro-de-servidores, mave-2026, congreso-regional-2026, asamblea-mexicana) + calendario anual + página hardcodeada `eventos.astro`. **Sin crear duplicados**; requiere consolidación humana (§ Riesgos).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `title` | text | sí | – | no | sí | – |
| `slug` | text | sí | – | **sí** | sí | – |
| `type` | select | no | null | no | sí | `encuentro` / `mave` / `congreso` / `asamblea` / `invitacion` / otro |
| `startDate` | date | no | null | no | sí | clave de consulta |
| `endDate` | date | no | null | no | – | opcional; `>= startDate` |
| `location` | json | no | null | no | – | §11 (puede ser sólo texto nombre) |
| `organizerName` | text | no | null | no | – | – |
| `description` | text | no | null | no | – | – |
| `program` | editor | no | null | no | – | programa/markdown |
| `image` | file | no | null | no | – | – |
| `postRef` | relation → Post | no | null | no | – | post original (traza biunívoca opcional) |
| `status` | select | sí | "active" | no | – | `active` / `cancelled` / `archived` |

**Delete behavior:** relación con Post bidireccional sin cascada destructiva (restringir / dejar null). No borrar posts al borrar evento ni viceversa.

**Extracción sin duplicados:** la consolidación de eventos (posts + calendario + página hardcodeada) es **revisión humana previa** a crear registros. El esquema está listo, pero **no se pobla hasta consolidar**.

**Derivado (NO almacenar):** countdown (se calcula en frontend), días restantes, "próximo evento" (query).

---

## 5. Literature

**Propósito:** catálogo de literatura/productos.

**Origen V1:** `src/data/inventory.json` (161 ítems, 9 categorías).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|---|
| `code` | text | no | null | **no (por ahora)** | parcial | nullable; NO inventar. Duplicados/genéricos requieren revisión (§ Riesgos) |
| `title` | text | sí | – | no | sí | proviene de `description` |
| `price` | number | sí | – | no | – | > 0 |
| `category` | relation → Category | sí | – | no | sí | §6 |
| `isActive` | bool | sí | true | no | – | – |

**Delete behavior:** eliminar Literature no afecta Category (relación hacia Category con `ON_DELETE=RESTRICT` para no quedarse sin categoría).

**Nuevo en V2:** `isActive`, `title` (renombrado), relación a Category normalizada.

**Derivado (NO almacenar):** `total` (V1, erróneo) — se elimina. `stock` NO se incluye como campo definitivo (el significado de `quantity` no está confirmado; se evaluará aparte sin asumir inventario real).

**Nota única `code`:** como hay códigos duplicados/genéricos pendientes de decisión, **no** se marca `unique` de forma inmediata; se activará tras la limpieza humana. Los 14 códigos faltantes quedan `null`.

---

## 6. Category

**Propósito:** normalización de las 9 categorías de inventario.

**Origen V1:** valores de `inventory[].category` (9).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `name` | text | sí | – | **sí** | sí | nombre verbatim ("Libros NA", …) |
| `sort` | number | no | 0 | no | – | orden de despliegue opcional |

**Relación:** Category ── * Literature. Se expresa en Literature (`category` relation).

**Delete behavior:** `ON_DELETE=RESTRICT` desde Literature (no permitir borrar categoría con productos).

**Derivado (NO almacenar):** número de productos por categoría (query).

---

## 7. RadioBroadcast

**Propósito:** programación semanal de radio (52 semanas). Pertenece a un **District** **o** al **Área Norte** (no es un District).

**Origen V1:** `src/data/radiodifusion.json` (52 semanas). Requiere transformación de nombres legacy.

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `week` | number | sí | – | **sí** | sí | 1–52, sin duplicados |
| `district` | relation → District | no | null | no | sí | **opcional**; null si pertenece al Área |
| `ownerIsAreaNorte` | bool | sí | false | no | – | true → pertenece al Área Norte |
| `time` | text/`HH:mm` | no | null | no | – | hora (V1 12:00 / 13:00) |
| `link` | url | no | null | no | – | enlace de emisión |
| `note` | text | no | null | no | – | dato de trazabilidad (valor legacy original) |

**Invariante de dominio:** `district` y `ownerIsAreaNorte` son mutuamente excluyentes (validación a nivel de aplicación/migración; opcionalmente check/constraint documentado). **No hay District 3 ni 6**; los valores legacy se transforman según la decisión de migración y **no crean distritos ficticios**.

**Mapeo legacy (APROBADO):**
- `Distrito 1/2/4/5`, `1er/2do/4to/5to Distrito` → respectivo District + `ownerIsAreaNorte=false`.
- `Distrito 3` / `Distrito 6` (6 semanas c/u) → **`ownerIsAreaNorte=true`, `district=null`** (NO se crean Distritos 3/6).
- `Area Norte` / `Comite de Area Norte` (3 semanas) → `ownerIsAreaNorte=true`, `district=null`.

**Delete behavior:** eliminar District referenciado → `ON_DELETE=RESTRICT` (o reasignar a null, según decisión). No cascada.

**Derivado (NO almacenar):** "semana actual" (se calcula en frontend), semana de la fecha (cálculo), la hora mostrada "13:00" actualmente hardcodeada en la UI debe **respetar `time`**.

---

## 8. SiteSettings

**Propósito:** configuración global del sitio (identidad, contacto, SEO, redes, hero, logo, map).

**Origen V1:** datos hardcodeados en `Layout.astro` (navigation, meta/description, og), `Ubicacion.astro` (dirección, teléfono, email, mapa), `Header.astro`/`Footer.astro` (identidad), `index.astro` (hero). No hay archivo canonical; son constantes de presentación.

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `siteName` | text | sí | – | – | – | "NA Área Norte CDMX" |
| `description` | text | sí | – | – | – | meta description |
| `addressLine` | text | no | null | – | – | dirección del Área (Ubicacion) |
| `phone` | text | no | null | – | – | – |
| `email` | email | no | null | – | – | – |
| `mapEmbedUrl` | url | no | null | – | – | iframe Google Maps |
| `logo` | file | no | null | – | – | logo del Área |
| `socialLinks` | json | no | {} | – | – | mapa de redes sociales |
| `hero` | json | no | null | – | – | hero/banner configuración |
| `seo` | json | no | {} | – | – | og/twitter/SEO adicional |
| `navigation` | json | no | [] | – | – | menú de navegación (opcional) |

**Decisión:** **singleton**. Se elige **colección normal con un único registro** y regla de acceso restringida en escritura; el frontend lee el primer (único) registro. Motivo: más simple y mantenible que key/value para un proyecto pequeño; permite editar los campos con el editor visual de PocketBase y consultar todo en una sola petición.

**Información NO migrar a SiteSettings (presentación):**
- Estilos/componentes de UI (siguen en el frontend).
- Contenido operativo (grupos/posts/eventos/literatura) → sus colecciones.
- `navigation` (configurable mediante SiteSettings, según decisión aprobada) → campo `navigation` en SiteSettings.

**Derivado (NO almacenar):** año del footer (se calcula), canonical URL.

---

## 9. Tag

**Propósito:** normalizar los tags (11 en V1) como datos estructurados en lugar de strings libres; además habilita URLs `/tags/{slug}` (hoy rotas).

| Campo | Tipo PB | Req | Default | Unique | Index | Relación / notas |
|---|---|---|---|---|---|---|
| `name` | text | sí | – | **sí** | sí | display ("eventos", "literatura"…) |
| `slug` | text | sí | – | **sí** | sí | para URL `/tags/{slug}` |

**Relación:** Tag ── * Post (muchos-a-muchos). Se modela como `tags` relation (many) en Post.

**Decisión:** **SÍ aporta valor** una colección Tag (no basta un campo estructurado), porque:
1. Los tags se reutilizan entre posts (11 tags en 11 posts) — normalizar evita repetir strings e inconsistencias.
2. Existía intención de URLs `/tags/*` (layout ya las genera, rotas en V1). Una colección con `slug` permite generar rutas `/tags/{slug}` de forma coherente.
3. No se eliminan tags existentes: los 11 se migran a la colección.

**Delete behavior:** relación M2M con Post sin cascada destructiva; si un tag se borra, los posts conservan resto de tags.

**Derivado (NO almacenar):** conteo de posts por tag (query), URLs (se derivan del slug).

---

## 10. Media (decisión)

**Análisis del consumo real:**
- **Post:** `cover` (file) + `body` (editor) con imágenes en línea; 5 posts de invitaciones son **galerías de muchas imágenes**; 2 posts tienen **videos** (`/junio/*.mp4`).
- **Event:** `image` (file).
- **District/Group:** sin imágenes.
- **SiteSettings:** `logo` (file).
- Recursos actuales: assets locales, público (`public/junio/*.mp4`), URLs remotas (Unsplash), videos.

**Decisión propuesta — combinación, evitando normalización innecesaria:**
1. **Campos `file` dentro de cada entidad** para imágenes singulares: `Post.cover`, `Event.image`, `SiteSettings.logo`. Cubre la gran mayoría de casos sin colección Media.
2. **Contenido (galerías y videos) se hospeda como `file`/URL embebidos en el campo `editor` del body** del Post. No se crea tabla Media para reutilización porque no hay reutilización cruzada de un mismo archivo entre entidades distintas.
3. **Estrategia separada para videos grandes** (regla AGENTS.md): no subir archivos grandes a PocketBase; se referencian por URL (remota o CDN) dentro del contenido, o se hospedan en un objeto storage y se enlazan. Documentar `maxFileSize` / reglas de file de PocketBase al configurar.

**Cuándo reconsiderar una colección Media independiente:** solo si en el futuro un archivo debe referirse desde varias entidades con metadata propia (p. ej. una biblioteca de imágenes compartida). No es el caso hoy; se evita por simplicidad.

**Derivado (NO almacenar):** tamaño de imagen, dimensiones (PocketBase las deriva), thumbnails (PocketBase los genera).

---

## 11. Address / Location (decisión)

**Análisis:** District y Group comparten la misma estructura de dirección + `mapQuery`. Página `Ubicacion.astro` tiene dirección/mapa del Área (va a SiteSettings sección de contacto/map).

**Decisión propuesta — JSON embebido** (evitar normalización innecesaria, como prefieres):

```json
{
  "linea1": "Calle Sur 26 Mz. 32 Lote 61",
  "colonia": "...",
  "referencias": "Cerca de...",
  "ciudad": "Ecatepec de Morelos",
  "estado": "Estado de México",
  "mapQuery": "texto para embed Google Maps"
}
```

- Se incrusta en `District.location`, `Group.location` y `Event.location`.
- `mapQuery` se conserva (evita re-geocodificar y romper mapas); en V2 se puede derivar de la dirección si se quiere, pero **conservar el valor actual** para no perder el punto exacto.

**No se crea colección Address** porque: no hay operaciones transaccionales sobre direcciones compartidas, cada entidad tiene su propia ubicación, y la normalización añadiría relaciones sin beneficio tangible.

**(opcional) `mapEmbedUrl`** para el Área central vive en `SiteSettings`.

---

## 12. Schedule (decisión + estructura JSON)

**Verificación contra el código real:** `Grupo.horarios[]` con `dias` (texto libre), `horaInicio`, `horaFin`. El componente `Directorio.tsx` itera `horarios` como array y los muestra. No hay ninguna operación que trate a un Schedule como entidad independiente (no se referencia a un horario desde otro lugar, no se buscan horarios por id). Ambos (District y Group) pueden tener múltiples horarios.

**Decisión propuesta — JSON embebido** (confirmada contra el código):

Un campo `schedules: json` en `District` y `Group`. Estructura exacta de **cada elemento**:

```json
{
  "days": [1, 2],
  "startTime": "10:00",
  "endTime": "11:30"
}
```

- `days`: array de números ISO (1=Lu … 7=Do), valores permitidos [1..7].
- `startTime` / `endTime`: strings `"HH:mm"`, con `endTime > startTime`.

**Multiplicidad:** el campo es un array de estos objetos, por lo que **representa múltiples horarios por District y por Group** sin limitación:

```json
{
  "schedules": [
    { "days": [1, 2], "startTime": "10:00", "endTime": "11:30" },
    { "days": [4, 7], "startTime": "17:00", "endTime": "18:30" }
  ]
}
```

**Semántica:** `schedules: []` (vacío o null) = **no informado**, no "no existen sesiones" (AGENTS.md). Se respeta literalmente.

**Razones:** no tratamos Schedule como entidad independiente (sin búsquedas/referencias propias), y el JSON evita una colección + relaciones extra. La validación de estructura (días 1-7, fin>inicio, bucket) se hace en la **capa de servicios (DAL)** y en la migración, no con colecciones.

**Trazabilidad:** el `scheduleText` (texto V1 original como "Lunes a Sábado") se conserva como respaldo durante la migración.

---

## 13. Resumen de relaciones

```
SiteSettings (singleton, 1 registro)

District 1──* Group
Scheme      (JSON embebido)

Category 1──* Literature
Tag    *──* Post      (M2M)
       └── Event  (opcional: postRef/post —— post (1-1 opcional para traza))

RadioBroadcast ── District (opcional, 0..1)
RadioBroadcast ── Área Norte (vía ownerIsAreaNorte=true)
```

| Origen → Destino | Tipo | Campo origen | Delete behavior |
|---|---|---|---|
| Group → District | `relation` many→1 | `Group.district` | `RESTRICT` (distrito no borrable con grupos) |
| Literature → Category | `relation` many→1 | `Literature.category` | `RESTRICT` |
| Post → Tag | `relation` M2M | `Post.tags` | sin cascada destructiva |
| Post → Event | `relation` 1→1 opcional | `Post.event` | sin cascada |
| RadioBroadcast → District | `relation` many→1 opcional | `RadioBroadcast.district` | `RESTRICT`/decision |
| SiteSettings | singleton | – | – |

---

## 14. Reglas de acceso (implementadas por el script + objetivo de roles)

El script `scripts/create-schema.mjs` fija por defecto las reglas de las 9 colecciones con `PUBLIC_READ`:

```js
listRule: ""      // lectura lista: pública ("" = cualquiera)
viewRule: ""      // lectura detalle: pública
createRule: null  // escritura: SOLO superuser (null = denegado)
updateRule: null  // escritura: SOLO superuser
deleteRule: null  // escritura: SOLO superuser
```

**Decisión deliberada:** lectura pública del contenido operativo + escritura restringida a superuser. PocketBase permite a los superusers administrar vía `createRule/updateRule/deleteRule = null` (denegado a roles no-superuser), por lo que cualquier edición ocurre desde el panel/API administrativa, nunca desde el frontend. Esto es coherente con AGENTS.md: Astro/DAL usa solo lectura y PocketBase es la fuente de verdad.

**Notas:**
- Las reglas actuales aplican a **todas** las colecciones por igual (incluidos borradores/ocultos). En una fase posterior se pueden afinar por colección (p. ej. `posts.listRule` que exponga solo `status = "published"` y `groups/viewRule` que filtre `isActive = true`), pero ello queda fuera del alcance de esta fase y no se implementa ahora para no complicar la revisión. No se modifican estas reglas arbitrariamente.
- El editor de contenido (rol distinto del superuser) NO está definido todavía; se documenta como objetivo de una fase posterior (ver tabla de roles abajo).
- `SiteSettings` lectura pública; escritura restringida a superuser.

| Rol | Alcance | Reglas mínimas propuestas |
|---|---|---|
| **Superuser (admin PB)** | Total del panel y API administrativa | acceso nativo de superuser; crea/actualiza/borra vía API admin (`createRule/updateRule/deleteRule = null` para el resto) |
| **Editor de contenido** (futuro) | CRUD de contenido operativo | habilitar reglas por rol a editores; sin acceso a gestión de superusers/seguridad |
| **Público / API (Astro)** | Lectura de contenido publicado | `listRule`/`viewRule` = pública (`""`) actualmente; posteriormente filtrar `status=published` / `isActive=true` |

---

## 15. Origen de la información por colección

| Colección | Viene de V1 | Nuevo en V2 |
|---|---|---|
| District | 4 sedes de `grupos/distrito*.json` | `number`, `slug`, `isActive`, `scheduleText` |
| Group | 43 grupos reales | `slug` con sufijo de distrito, `district` FK, `isActive`, `scheduleText`, `notes` |
| Post | 11 Markdown (slug=filename) | `status`, `event` relación, `author` editable |
| Event | posts + calendario + `eventos.astro` | consolidación sin duplicados (revisión humana) |
| Literature | 161 ítems de `inventory.json` | `title`, `isActive`, `Category` FK; `total` eliminado |
| Category | 9 categorías | `slug?`, `sort` |
| RadioBroadcast | 52 semanas de `radiodifusion.json` | `district` FK, `ownerIsAreaNorte`, `note` |
| SiteSettings | constantes hardcodeadas (Layout/Header/Footer/Ubicacion/index) | singleton editable |
| Tag | 11 tags de posts | `slug` (habilita URLs `/tags/*`) |
| Media | file/URL embebidos | file en entidades + estrategia de videos |

---

## 16. Riesgos y puntos de revisión humana

1. **Events duplicados:** la misma info aparece en posts, calendario anual y `eventos.astro`. **No se extrae/migra de forma definitiva todavía**; el modelo queda preparado y no se inventan fechas/lugares no confirmados. No se elimina información de los posts.
2. **Radio semanas 3,6,24,27,30,33,36,39,42,45,48,51 ("Distrito 3"/"Distrito 6"):** **decidido** → migrar con `ownerIsAreaNorte=true`, `district=null`. No se crean District 3/6.
3. **Radio semanas 12,18,23 (Área Norte):** **decidido** → `ownerIsAreaNorte=true`, `district=null`.
4. **Literature `code`:** 14 faltantes (mantener null), 10 duplicados/genéricos (revisar humana), posibles productos duplicados (NAC010/011/012). **No activar `unique` hasta depurar.**
5. **Literature `stock`:** **decidido** → NO se crea campo definitivo; `quantity` no se asume como inventario real.
6. **Slugs de grupos:** colisiones Serenidad/Valor para Cambiar → aplicar regla `-d2`/`-d4` y decidir display con distrito.
7. **Horario "excepto sábado"** (`un-nuevo-sendero`): confirmar interpretación al migrar a days[].
8. **`radio.time`:** la UI muestra "13:00" hardcodeado; posteriormente debe respetar `time`.
9. **Videos grandes:** estrategia de almacenamiento separada (no subir a PB).
10. **Slugs de posts:** no cambiar (rompería URLs `/noticias/{slug}`).

---

## 17. Preguntas que requieren decisión humana

- [ ] ¿Consolidar los eventos identificados en posts/calendario/página (y cuáles)? → poblar `Event` (posterior a la creación del schema; sin inventar fechas/lugares).
- [ ] ¿Depurar códigos duplicados/genéricos de Literature antes de activar `unique(code)`?

**Decisiones ya resueltas (base aprobada):** radio Distrito 3/6 y "Área Norte"/"Comite" → `ownerIsAreaNorte=true`; Literature `stock` NO se crea; `navigation` configurable vía SiteSettings; tags Sí colección M2M; Media sin colección (file embebido); Reflexion fuera de PocketBase.

---

## 18. Schema final (lo que crea exactamente `scripts/create-schema.mjs`)

Ocho colecciones `type="base"` + una `site_settings` (singleton), todas con reglas `PUBLIC_READ` (lectura pública, escritura superuser). Los campos `relation` se definen por *nombre* en el script y se resuelven a su **ID real** en la fase 2 (ver notas §0). `posts.tags` es M2M con `maxSelect=20` (techo técnico, no regla de dominio).

### 18.1 `districts`
Propósito: unidades administrativas de Área Norte (1, 2, 4, 5; nunca 3 ni 6).

| Campo | Tipo | Req | Nota |
|---|---|---|---|
| `name` | text | sí | |
| `number` | number | sí | min 1, max 9 |
| `slug` | text | sí | |
| `description` | text | no | |
| `location` | json | no | estructura §11 |
| `schedules` | json | no | estructura §12; `[]` = no informado |
| `scheduleText` | text | no | texto V1 original (trazabilidad) |
| `isActive` | bool | no | |

Índices: unique `number`, unique `slug`, `isActive`. Sin relaciones.

### 18.2 `groups`
Propósito: grupos de reunión pertenecientes obligatoriamente a un District.

| Campo | Tipo | Req | Nota |
|---|---|---|---|
| `name` | text | sí | verbatim |
| `slug` | text | sí | único global (`serenidad-d2`, …) |
| `location` | json | no | §11 |
| `schedules` | json | no | §12 |
| `scheduleText` | text | no | V1 original |
| `notes` | text | no | |
| `isActive` | bool | no | |
| `district` | relation → districts | **sí** | simple (`maxSelect=1`) |

Índices: unique `slug`, `district`, `isActive`.

### 18.3 `tags`
Propósito: normaliza los tags (11 en V1); habilita URLs `/tags/{slug}`.

| Campo | Tipo | Req |
|---|---|---|
| `name` | text | sí |
| `slug` | text | sí |

Índices: unique `name`, unique `slug`. Sin relaciones.

### 18.4 `categories`
Propósito: normaliza las 9 categorías de inventario.

| Campo | Tipo | Req |
|---|---|---|
| `name` | text | sí |
| `sort` | number | no |

Índices: unique `name`. Sin relaciones.

### 18.5 `literature`
Propósito: catálogo de literatura/productos. `code` nullable, **sin `unique` todavía**, `total` no se migra, **sin campo de stock definitivo**.

| Campo | Tipo | Req | Nota |
|---|---|---|---|
| `code` | text | no | null; sin unique hasta depurar |
| `title` | text | sí | |
| `price` | number | sí | min 0 |
| `isActive` | bool | no | |
| `category` | relation → categories | **sí** | simple |

Índices: `category`, `isActive`.

### 18.6 `radio_broadcasts`
Propósito: programación semanal (52 semanas). Owner es un District **o** el Área Norte; nunca ambos, nunca District 3/6.

| Campo | Tipo | Req | Nota |
|---|---|---|---|
| `week` | number | sí | min 1, max 52, único |
| `ownerIsAreaNorte` | bool | no | true → pertenece al Área |
| `time` | text | no | |
| `link` | url | no | |
| `note` | text | no | dato legacy original |
| `district` | relation → districts | no | **opcional**; null si es Área |

Índices: unique `week`, `district`.

### 18.7 `posts`
Propósito: comunicados/noticias (11 Markdown V1; slug = filename).

| Campo | Tipo | Req | Nota |
|---|---|---|---|
| `title` | text | sí | |
| `slug` | text | sí | único |
| `description` | text | sí | |
| `author` | text | no | |
| `pubDate` | date | no | |
| `cover` | file | no | |
| `body` | editor | no | conserva Markdown |
| `status` | select | sí | `published` / `draft` / `archived` |
| `tags` | relation → tags | no | **M2M** (`maxSelect=20`) |
| `event` | relation → events | no | simple opcional |

Índices: unique `slug`, `pubDate`, `status`.

### 18.8 `events`
Propósito: eventos como entidad independiente. Modelado pero **no poblado** hasta consolidación humana.

| Campo | Tipo | Req | Nota |
|---|---|---|---|
| `title` | text | sí | |
| `slug` | text | sí | único |
| `type` | select | no | `encuentro` / `mave` / `congreso` / `asamblea` / `invitacion` / `otro` |
| `startDate` | date | no | |
| `endDate` | date | no | |
| `location` | json | no | |
| `organizerName` | text | no | |
| `description` | text | no | |
| `program` | editor | no | |
| `image` | file | no | |
| `status` | select | sí | `active` / `cancelled` / `archived` |
| `postRef` | relation → posts | no | simple opcional |

Índices: unique `slug`, `startDate`.

### 18.9 `site_settings`
Propósito: configuración global (singleton, 1 registro).

| Campo | Tipo | Req |
|---|---|---|
| `siteName` | text | sí |
| `description` | text | no |
| `addressLine` | text | no |
| `phone` | text | no |
| `email` | email | no |
| `mapEmbedUrl` | url | no |
| `logo` | file | no |
| `socialLinks` | json | no |
| `hero` | json | no |
| `seo` | json | no |
| `navigation` | json | no |

Sin índices ni relaciones.

> Este documento refleja el diseño **aprobado** y se implementa mediante el script `scripts/create-schema.mjs`. No se ejecutan migraciones de datos V1 hasta nueva instrucción.
