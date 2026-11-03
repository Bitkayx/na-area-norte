# Roadmap de migración

Estado y evidencia: [README](README.md). Estos identificadores no renumeran las
épicas históricas de `BACKLOG.md`.

## Etapas locales

- **CTX — Contexto en repo: establecido.** Cierra con AGENTS permanente,
  estado, roadmap y runbooks enlazados, y huecos documentales explícitos.
- **DAL-LOCAL — Hardening: completo.** Cerró el 2026-10-26 con 44/44 tests,
  build directo de Astro con PocketBase deshabilitado y commit `978ca6b`.
- **DIST-LOCAL — Preparación de distritos: completa.** Cerró el 2026-10-26 con
  entrada CLI operativa y 14/14 tests de
  transformación, validación, reconciliación, idempotencia y seguridad del dry-run.

## Distritos remotos

- **DIST-DRY — Dry-run remoto: completo.** El 2026-10-26 se confirmó con lectura
  autenticada que la colección está vacía y sus reglas list/view son públicas.
  El plan revisado crea 1, 2, 4 y 5, sin updates ni conflictos.
- **DIST-REVIEW — Revisión: completa.** Los payloads y el schema resultaron
  compatibles; la autorización explícita se limitó a crear los cuatro registros.
- **DIST-APPLY — Escritura: completa.** El 2026-10-26 se crearon 1, 2, 4 y 5;
  4 creates, 0 updates. Schema y access rules no se modificaron.
- **DIST-VERIFY — Verificación: completa.** El dry-run posterior reportó los
  cuatro registros `UNCHANGED`, sin creates, updates, duplicados ni distritos 3/6.

## Resto de V2

- **GROUP-ANALYSIS — Análisis V1: completo.** Se confirmaron 43 grupos,
  distribución 9/10/13/11, 73 horarios, dos nombres repetidos y una expresión
  de horario que requiere soporte explícito. V1 no contiene `isActive`.
- **GROUP-ACTIVE-DECISION — Decisión de dominio: completa.** El 2026-10-26 se
  aprobó migrar como activos los 43 registros publicados en V1.
- **GROUP-LOCAL — Preparación local: completa.** El script
  es dry-run por defecto, resuelve relaciones sin IDs hardcodeados y preserva
  43 grupos/73 horarios. Pasaron 11/11 tests el 2026-10-26.
- **GROUP-DRY — Dry-run remoto: completo.** El 2026-10-26 se confirmó schema,
  visibilidad pública, colección vacía y relaciones. El plan contiene 43 creates,
  0 updates y 0 conflictos.
- **GROUP-REVIEW — Revisión: completa.** Se revisaron conteos 9/10/13/11, slugs
  desambiguados, 73 horarios y relaciones obligatorias.
- **GROUP-APPLY — Escritura: completa.** Tras autorización explícita se crearon
  43 grupos, sin updates ni cambios de schema/access rules.
- **GROUP-VERIFY — Verificación: completa.** El dry-run posterior reportó 43
  `UNCHANGED`, 0 creates y 0 updates.
- **GROUP-FRONTEND — DAL sin fallback runtime.** El directorio obtiene grupos
  mediante DAL; se retiró el fallback JSON tras verificar los 43 grupos, sus
  horarios y revisar el Preview. JSON se conserva como entrada del migrador.
- **CHECKPOINT-COMMITS — Completo.** El 2026-10-26 el hardening del DAL/CI quedó
  en `978ca6b`; contexto, migraciones e integración de distritos/grupos quedaron
  en `bfe7928`. No retirar todavía JSON V1.
- **RADIO-ANALYSIS — Completo.** El calendario V2 comenzará limpio con entradas
  mensuales; el JSON histórico no será su lote inicial. El único consumidor V1
  es el banner global. Solo se admiten distritos 1, 2, 4 y 5 o el ámbito Área
  Norte. Véase [análisis de radio](radio-analysis.md).
- **RADIO-TEMPORAL-DECISION — Completa.** El formato mensual incluye día y mes;
  se eligió la fecha exacta como identidad. El capturador deberá exigir el año,
  que no aparece en el ejemplo, y no inferirá hora ni enlace ausentes.
- **RADIO-LOCAL-DESIGN — Completo.** El capturador exige año, normaliza solo
  variantes conocidas, rechaza distritos inexistentes y genera un plan local sin
  contactar PocketBase. Pasaron 4/4 tests. Existe un runbook específico.
- **RADIO-SCHEMA-REVIEW — Completa.** Tests locales y dry-run remoto confirmaron
  colección vacía. El plan hace un único PATCH: reemplaza `week` requerido por
  `broadcastDate` requerido y su índice único; conserva campos, relación y reglas.
- **RADIO-SCHEMA-APPLY — Completa.** Tras autorización explícita se aplicó un
  único PATCH. La verificación confirmó `broadcastDate` requerido y único, sin
  `week`, y preservó campos, relación, índice de distrito y access rules. La
  colección continúa vacía.
- **RADIO-DAL — Completa.** Tipos, mapper y repositorio consultan por fecha y
  exponen la próxima participación. El banner usa DAL y no muestra el JSON
  histórico. Pasaron 41/41 tests; builds local (32 páginas) y remoto (48) correctos.
- **RADIO-MONTHLY-DRY — Completa.** Para octubre de 2026 el plan crea cuatro
  fechas: 5/D1, 12/D4, 19/D5 y 26/Área Norte; 0 updates y conflictos. Hora,
  enlace y nota quedaron definidos según la captura (`13:00` por defecto,
  enlace y nota vacíos). No se realizaron escrituras en esa etapa.
- **RADIO-MONTHLY-APPLY — Completa.** Tras autorización se crearon cuatro
  registros. El dry-run posterior reportó 4 `UNCHANGED`, 0 creates/updates. El
  build remoto de 48 páginas mostró “26 de octubre: Área Norte a las 13:00”.
- **RADIO-NEXT-MONTH — Operación recurrente.** Cada mensaje nuevo requiere año,
  preparación, dry-run, revisión y autorización propia antes de escribir.
- **RADIO-DEFAULT-TIME — Completa.** Tras autorización se actualizaron los cuatro
  registros a `13:00`; el dry-run posterior quedó `UNCHANGED` y el build remoto
  mostró “Área Norte a las 13:00”. El banner usa la misma hora si el campo queda
  vacío. La operación editorial ordinaria se realiza desde PocketBase.
- **CONTENT — Transición por entidad.** Noticias, grupos, distritos, literatura,
  radio de octubre y primera ola de Events están migrados/verificados según sus
  etapas abajo. Radio mensual continúa como operación recurrente. El singleton
  `site_settings` está creado y verificado; los fallbacks runtime de noticias,
  grupos y literatura se retiraron. Backups y el panel propio con cuentas por rol
  quedan diferidos a V2.1. El registro público de `users` se cerró en el cierre
  actual. Reflexiones permanece fuera. Los pendientes acordados y temas
  propuestos para V2.1 están recopilados en [TODO](TODO.md#propuesta-de-alcance-para-v21).
- **NEWS-ANALYSIS — Completo localmente.** Se inventariaron 13 posts, 49
  referencias de imágenes locales sin rutas rotas y todos sus consumidores. La
  migración remota y las verificaciones posteriores se registran en las etapas
  NEWS-DRY, NEWS-BODY-REVIEW y NEWS-MEDIA-REVIEW.
- **NEWS-DRY — Completo.** La lectura autenticada del 2026-10-26 encontró 13/13
  slugs publicados, 9 tags, ningún evento relacionado y schema compatible. No
  hubo escrituras.
- **NEWS-REVIEW — Completa.** El
  fallback `public/assets/blog/news_default.jpg` cubre seis covers remotos vacíos.
  Los textos visibles coinciden 13/13 y las 49 imágenes embebidas están
  representadas; la revisión visual satisfactoria del usuario consta en
  `NEWS-MEDIA-REVIEW`.
- **NEWS-PUBDATE-DRY — Completo.** El 2026-10-26, el script comparó las 13 fechas
  V1 con PocketBase: una vacía propone `2026-08-01`; 12 están iguales. No hubo
  escrituras.
- **NEWS-PUBDATE-APPLY — Completo.** Tras autorización se actualizó solo la fecha
  vacía a `2026-08-01`; la verificación posterior reportó 13 `UNCHANGED`.
- **NEWS-FRONT — DAL sin fallback runtime.** Inicio, lista y rutas consultan DAL;
  un post sin cuerpo detiene la build. Los 13 Markdown quedan como fuentes de
  scripts históricos. Se validaron 13 posts y revisión visual del Preview.
- **NEWS-BODY-REVIEW — Comparación automatizada completa.** El 2026-10-30 una
  lectura remota de solo lectura encontró texto visible normalizado igual en
  13/13 posts y 49/49 imágenes representadas (47 Markdown, 2 HTML). No equivale a
  aprobación editorial por sí sola; la revisión visual posterior se registra en
  `NEWS-MEDIA-REVIEW`.
- **NEWS-LIST-DAL — Completa.** `getNewsItems()` consulta
  `dal.posts.getPublished()` sin fallback a Astro Content. El 2026-10-30 los
  builds local/remoto completaron 32/48 páginas; el
  listado remoto tiene 13 slugs y existen sus rutas, con seis covers predeterminados.
- **NEWS-MEDIA-REVIEW — Completa.**
  Build remoto empaquetado (48 páginas) del 2026-10-30: 75 usos de imágenes en
  páginas de post; las 49 embebidas tienen referencias locales existentes y las
  10 URLs remotas respondieron HTTP 200 con MIME de imagen. Codex no tuvo acceso
  al preview ni a navegador automatizado. El usuario confirmó revisión visual
  satisfactoria en preview el 2026-11-02: listado, posts con covers/imágenes,
  orden de imágenes y revisión móvil. El smoke test local reportado dio HTTP 200
  para inicio, `/_image`, listado, dos posts y directorio. Se conserva Markdown.
- **NEWS-V1-RETIREMENT-REVIEW — Runtime completa; fuentes conservadas.** Tras
  validar 13/13 posts, cuerpos/media y Preview, se retiró el fallback de Astro
  Content de inicio, listado y rutas. Markdown permanece como entrada de 13
  scripts históricos; `tagCounts` no usado se retiró del layout.
- **EVENTS-ANALYSIS — Completa.** El responsable confirmó cinco eventos para la
  primera ola. La colección estaba vacía y 13 posts no tenían relaciones; radio
  es una entidad separada. Véase [análisis de Events](events-analysis.md).
- **EVENTS-LOCAL — Completa.** Seed local de cinco eventos archivados, migrador
  create-only con resolución de posts por slug, tests y página de Eventos usando
  DAL. Tests del migrador y DAL pasaron, TypeScript compiló. Build Astro generó
  rutas estáticas, pero tuvo error de red al consultar radio.
- **EVENTS-DRY — Completa.** Dry-run previo a apply: 13 posts, 0 Events; cinco
  CREATE, 0 conflictos.
- **EVENTS-APPLY — Completa.** Tras autorización explícita del usuario el
  2026-11-02 se crearon cinco Events; no se modificaron schema ni access rules.
- **EVENTS-VERIFY — Completa.** La primera comparación detectó solo diferencia
  de orden de claves en `location`; se corrigió la igualdad profunda y se añadió
  un test. El dry-run posterior reportó cinco UNCHANGED, 0 CREATE/conflictos.
- **EVENTS-FRONT-VERIFY — Completa técnicamente.** Build remoto estático terminó
  con 48 páginas; HTML de Eventos muestra última publicación de Literatura y
  omite próximo evento porque los cinco están archivados. No se hizo deploy.
- **EVENTS-FRONT-REVIEW — Completa.** El usuario confirmó el 2026-11-02 que la
  página se ve bien. No se hizo deploy.
- **LITERATURE-ANALYSIS — Completo.** Inventario V1, consumidores y contrato
  local/remoto del schema revisados. La lectura autenticada confirmó ambas
  colecciones vacías frente a 161 productos y 9 categorías V1. Véase
  [análisis de Literatura](literature-analysis.md).
- **LITERATURE-LOCAL — Completo.** Transformación usa prefijos genéricos para
  códigos numéricos repetidos, `stock` desde `quantity` (default 1) y `total`
  derivado. Pasaron 7 pruebas del migrador, 42/42 del DAL; build local 32 páginas.
- **LITERATURE-SCHEMA-REVIEW — Completo.** Dry-run del 2026-10-29 propuso un
  único campo opcional `stock`, entero, mínimo 0; colección vacía. No se propuso
  alterar campos, índices ni reglas.
- **LITERATURE-SCHEMA-APPLY — Completo.** Tras autorización se añadió `stock`;
  la inspección confirmó el campo y preservación de campos, índices y reglas;
  un dry-run posterior reportó `stock` sin cambios.
- **LITERATURE-DRY — Completo.** El 2026-10-29 propuso 9 categorías y 161
  productos, todos CREATE, 0 updates/conflictos.
- **LITERATURE-APPLY — Completo.** Tras autorización se crearon 9 categorías y
  161 productos, con los códigos genéricos y stocks revisados. No hubo updates.
- **LITERATURE-VERIFY — Completo.** El dry-run posterior dejó las 9 categorías y
  161 productos `UNCHANGED`, sin creates, updates ni conflictos.
- **LITERATURE-FRONT — DAL sin fallback runtime.** La página consulta PocketBase;
  se retiró el fallback `inventory.json` tras validar 161 productos y nueve
  categorías. El JSON permanece como entrada del migrador.
- **LITERATURE-STOCK-DEFAULT — Completa.** El 2026-11-02 se confirmó que 0 es
  stock válido para nuevas altas sin existencia; capturarlo desde PocketBase.
  El 1 solo se asigna a filas históricas V1 que carecen de `quantity`.
- **FRONT-V1-CONSUMER-AUDIT — Completa (2026-11-02).** Se retiraron los
  fallbacks runtime de noticias, grupos y literatura tras revisar registros,
  rutas, media y Preview. Los archivos fuente siguen disponibles para
  migradores históricos.
- **LITERATURE-SETTINGS-LOCAL — Completa.** DAL valida el contrato opcional de
  inventario y horario de venta. La página muestra solo datos válidos y no
  inventa fechas. Tests DAL/schema pasaron; build local completó 32 páginas.
- **LITERATURE-SETTINGS-SCHEMA-DRY — Completa.** Lectura autenticada encontró
  que falta el campo y 0 registros singleton. Dry-run propuso un JSON opcional,
  preservando campos/índices y omitiendo reglas.
- **LITERATURE-SETTINGS-SCHEMA-APPLY — Completa.** Tras autorización explícita,
  el 2026-11-02 se añadió solo `site_settings.literature`; no se modificaron
  access rules ni se escribieron registros.
- **LITERATURE-SETTINGS-VERIFY — Completa.** Inspección autenticada confirmó el
  campo JSON y el dry-run posterior `unchanged`; en esa fecha aún no existía el
  singleton (se creó posteriormente en SITESETTINGS-SINGLETON-APPLY).
- **SITESETTINGS-DYNAMIC-DATA-AUDIT — Completa.** Se clasificaron contenidos
  configurables, contenido editorial y entidades propias en
  [auditoría](site-settings-analysis.md).
- **SITESETTINGS-FRONT-WIRING — Completa técnicamente.** Layout/Header/Footer y
  Ubicacion consumen identidad, logo, navigation, metadata y contacto desde DAL,
  con fallback. En el cierre de esta etapa el singleton ya existe; DAL cachea la lectura por build.
  TypeScript, DAL y build estático local pasaron.
- **SITESETTINGS-DATA-REVIEW — Completa.** El usuario confirmó identidad,
  dirección, teléfono y correo; eligió hero manual y aceptó actualización en el
  siguiente build/deploy estático. Se quitó el hero vencido de la portada.
- **SITESETTINGS-HERO-LOCAL — Completa.** La portada obtiene el hero de la DAL,
  solo lo renderiza con campos suficientes y no muestra el banner vencido cuando
  no hay configuración. TypeScript, 43/43 tests DAL y build local de 32 páginas
  pasaron el 2026-11-02. No se usó PocketBase.
- **SITESETTINGS-SINGLETON-DRY — Completa.** El 2026-11-02 la inspección
  autenticada confirmó el schema y un GET remoto de solo lectura encontró 0
  registros. El payload candidato propone un CREATE e incluye solo nombre,
  contacto confirmado, horario de venta de Literatura y hero anterior de agosto
  de 2026, que el usuario actualizará después. No hubo escrituras.
- **SITESETTINGS-SINGLETON-REVIEW — Completa.** El usuario revisó el payload y
  autorizó el CREATE el 2026-11-02.
- **SITESETTINGS-SINGLETON-APPLY — Completa.** El usuario creó el registro desde
  PocketBase Admin el 2026-11-02 con el payload autorizado. No se cambió schema
  ni access rules.
- **SITESETTINGS-SINGLETON-VERIFY — Completa.** GET de solo lectura encontró un
  registro y todos los campos aprobados coinciden; próxima fecha de inventario
  ausente como se decidió. Build Astro con datos remotos generó 48 páginas; el
  HTML contiene el hero y horario de Literatura.
- **SITESETTINGS-FRONT-REVIEW — Completa según confirmación del usuario.** El
  usuario confirmó el Preview y corrigió después el fallo de build de Vercel.
- **OPS-VERSIONED-BUILD — Completa localmente (2026-11-02).** Se quitó el `|| true`
  final de `package.json`, que podía convertir en éxito un fallo de Astro.
  `PUBLIC_POCKETBASE_URL= npm run build` pasó con 32 páginas y fallback local;
  Reflexiones registró errores DNS tolerados. `pnpm build` no pudo iniciar por
  el store de pnpm de solo lectura. La conexión de Vercel a PocketBase queda por
  comprobar en el siguiente Preview.
- **FRONT-RUNTIME-FALLBACKS — Completa (2026-11-02).** Noticias, grupos y
  literatura ya no sustituyen respuestas vacías de PocketBase por datos V1.
  TypeScript y build offline pasaron; el usuario confirmó visualmente el Preview
  posterior. Markdown/JSON se preservan como fuentes de migradores.
- **FRONT — Integración runtime implementada para noticias, grupos y literatura.**
  El usuario confirmó que las páginas se ven bien en Preview. Las fuentes V1 se
  conservan únicamente para reproducir migraciones; el manejo de medios
  corresponde al punto 4.
- **OPS-BACKUP-RECOVERY — Diferida a V2.1.** El 2026-11-02 el usuario decidió
  revisar backups en un mes (objetivo de seguimiento: 2026-12-02). No hay backups
  disponibles; el plan es Free y el volumen está en `/pb_data`. No cambiar plan
  ni infraestructura hasta nueva decisión. Véase `runbooks/backup-recovery.md`.
- **VERCEL-BUILD-TRANSIENT-502 — Observado (2026-11-02).** El deployment
  `ce7556e` falló porque el GET a `site_settings` recibió HTTP 502 de Railway.
  Después, GET `/api/health` y `site_settings` dieron 200; build local con
  PocketBase completó 48 páginas. La causa interna del 502 no se determinó.
  El usuario confirmó que el reintento del build pasó; la causa interna del 502
  sigue sin determinar.

La existencia de un script no acredita una etapa. Recuperar o documentar con
revisión el schema faltante antes de depender de él; no reconstruir decisiones
aprobadas a partir de comentarios de implementación.

## Cierre de migración

**SECURITY-ADMIN-CLOSE — Completo (2026-11-02):** el usuario confirmó que Vercel muestra
Invitaciones de Octubre publicado; el post tiene cuatro imágenes. Build local
conectado generó 49 páginas. La sanitización HTML está implementada y probada;
los tests DAL pasaron 43/43 y los diez archivos de tests `.mjs` pasaron. La
revisión autenticada de 15 colecciones encontró lectura pública/escritura
superuser-only para contenido. La regla `users.createRule` permitía registro
público, innecesario porque el frontend no usa esas cuentas. Con autorización
del usuario, el 2026-11-02 se cambió a `null` y una consulta autenticada confirmó
el bloqueo. Las reglas list/view/update/delete siguen limitadas al dueño; el
schema y las cuentas existentes no cambiaron. El usuario decidió diferir a V2.1
el panel propio y los roles para la persona editora de posts. La guía Admin ya
incluye capturas reales de listado, creación, estado y edición con imágenes; no
incluye confirmación tras guardar. La última auditoría
tras actualizar Astro y Sharp reportó 0 hallazgos
críticos/altos, 1 moderado (`postcss-selector-parser`, vía Tailwind Typography)
y 1 bajo (`esbuild`, servidor de desarrollo en Windows); no se pudo repetir en
este entorno porque el almacén pnpm está en solo lectura. Backups quedan
diferidos a V2.1, con seguimiento en un mes (~2026-12-02).
Véanse `runbooks/pocketbase-admin.md`, `media-assets-analysis.md` y
`runbooks/backup-recovery.md`.
