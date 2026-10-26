# Roadmap de migración

Estado y evidencia: [README](README.md). Estos identificadores no renumeran las
épicas históricas de `BACKLOG.md`.

## Etapas locales

- **CTX — Contexto en repo: establecido.** Cierra con AGENTS permanente,
  estado, roadmap y runbooks enlazados, y huecos documentales explícitos.
- **DAL-LOCAL — Hardening: completo localmente, pendiente de commit.** Cerró el
  2026-10-26 con 44/44 tests y build directo de Astro con PocketBase deshabilitado.
- **DIST-LOCAL — Preparación de distritos: completo localmente, pendiente de
  commit.** Cerró el 2026-10-26 con entrada CLI operativa y 14/14 tests de
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
- **GROUP-LOCAL — Preparación local: completa, pendiente de commit.** El script
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
- **CHECKPOINT-COMMITS — Siguiente tarea.** Revisar y dividir el working tree en
  commits coherentes antes de iniciar otra entidad. No retirar todavía JSON V1.
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
