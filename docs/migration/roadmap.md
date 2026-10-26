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
- **RADIO-DAL — Siguiente tarea.** Adaptar tipos, mapper, repositorio y tests a
  fechas; exponer la próxima participación e integrar el banner con fallback
  temporal. No crear registros remotos durante esta etapa.
- **CONTENT — Contenido restante: transición parcial.** Cada entidad requiere
  análisis, decisión, tests, dry-run, revisión, autorización, apply y verificación.
  Noticias debe verificar 13 posts, URLs, tags y media; grupos, relaciones,
  horarios y slugs; radio, 52 semanas y ámbito Área Norte; literatura, códigos y
  significado de `quantity`; eventos, ausencia de duplicados; settings, alcance.
  Reflexiones permanece fuera.
- **FRONT — Integración y retiro V1: parcial.** Cierra por entidad cuando sus
  consumidores usan DAL y fuente verificada, con rutas y media preservadas. Las
  fuentes V1 solo se retiran después de validar.
- **OPS — Operación y cierre V2: pendiente.** Cierra con backups y recuperación
  probados, seguridad, actualización del sitio, administración, QA y release
  documentados. Cambios remotos y deploys conservan sus propias autorizaciones.

La existencia de un script no acredita una etapa. Recuperar o documentar con
revisión el schema faltante antes de depender de él; no reconstruir decisiones
aprobadas a partir de comentarios de implementación.
