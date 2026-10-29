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
- **GROUP-FRONTEND — Integración: completa.** Astro obtiene grupos mediante la
  DAL y el componente conserva JSON como fallback. El build remoto serializó 43
  grupos y ningún registro de distrito; el build local validó el fallback.
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
- **CONTENT — Contenido restante: transición parcial.** Cada entidad requiere
  análisis, decisión, tests, dry-run, revisión, autorización, apply y verificación.
  Noticias debe verificar 13 posts, URLs, tags y media; grupos, relaciones,
  horarios y slugs; radio, fechas y responsables mensuales; literatura, stock,
  códigos genéricos y total derivado; eventos, ausencia de duplicados; settings,
  alcance.
  Reflexiones permanece fuera.
- **NEWS-ANALYSIS — Completo localmente.** Se inventariaron 13 posts, 49
  referencias de imágenes locales sin rutas rotas y todos sus consumidores. La
  colección remota, tags, media y cuerpos aún no están certificados.
- **NEWS-DRY — Completo.** La lectura autenticada del 2026-10-26 encontró 13/13
  slugs publicados, 9 tags, ningún evento relacionado y schema compatible. No
  hubo escrituras.
- **NEWS-REVIEW — En curso.** El fallback local
  `public/assets/blog/news_default.jpg` cubre seis covers vacíos. Los conteos de
  imágenes embebidas coinciden: 49 en V1 y PocketBase. La equivalencia semántica
  de cuerpos requiere revisión editorial.
- **NEWS-PUBDATE-DRY — Completo.** El 2026-10-26, el script comparó las 13 fechas
  V1 con PocketBase: una vacía propone `2026-08-01`; 12 están iguales. No hubo
  escrituras.
- **NEWS-PUBDATE-APPLY — Completo.** Tras autorización se actualizó solo la fecha
  vacía a `2026-08-01`; la verificación posterior reportó 13 `UNCHANGED`.
- **NEWS-FRONT — Completo en transición.** Inicio, lista y rutas consultan DAL;
  Markdown queda de respaldo si PocketBase no tiene posts o falta un cuerpo.
  Builds local y remoto pasan: 32 y 48 páginas; lista muestra 13 posts e inicio 4.
- **NEWS-BODY-REVIEW — Pendiente.** Hay diferencias de texto en algunos posts;
  hace falta revisión semántica antes de retirar Markdown.
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
- **LITERATURE-FRONT — Completo en transición.** La página pública consulta DAL,
  mantiene fallback JSON y fue validada en builds local/remoto; HTML remoto con
  161 productos y nueve categorías. No se hizo deploy.
- **LITERATURE-STOCK-DEFAULT — Pendiente operativo.** PocketBase da 0 cuando se
  omite un NumberField; definir el flujo editorial para futuras altas sin cantidad.
- **FRONT — Integración y retiro V1: parcial.** Cierra por entidad cuando sus
  consumidores usan DAL y fuente verificada, con rutas y media preservadas. Las
  fuentes V1 solo se retiran después de validar.
- **OPS — Operación y cierre V2: pendiente.** Cierra con backups y recuperación
  probados, seguridad, actualización del sitio, administración, QA y release
  documentados. Cambios remotos y deploys conservan sus propias autorizaciones.

La existencia de un script no acredita una etapa. Recuperar o documentar con
revisión el schema faltante antes de depender de él; no reconstruir decisiones
aprobadas a partir de comentarios de implementación.

## Siguiente tarea

**NEWS-BODY-REVIEW:** comparar semánticamente los cuerpos de los 13 posts y
registrar diferencias antes de evaluar el retiro del fallback Markdown.
