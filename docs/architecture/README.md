# Arquitectura

El sitio se genera con Astro. PocketBase es la fuente de datos operativos V2 y
las páginas lo consultan mediante la DAL durante el build. Reflexiones continúa
en Google Sheets. Véase el [estado de migración](../migration/README.md).

## Decisiones existentes

- [ADR-001 — Migración V1 a V2](../adr/ADR-001-v1-to-v2.md)
- [ADR-002 — PocketBase](../adr/ADR-002-pocketbase.md)
- [ADR-003 — Modelo de dominio](../adr/ADR-003-domain-model.md)
- [ADR-004 — Separación District/Group](../adr/ADR-004-district-group-separation.md)

## Diagramas y schema

- [Flujo actual de datos](data-flow.md)
- [Propuesta inicial de schema de PocketBase](pocketbase-schema.md) — documento
  histórico; no usar para aplicar ni reconstruir el schema vigente.

El estado vigente se valida con la inspección autenticada documentada en
`docs/migration/README.md` y los runbooks por entidad.

## Documentación incompleta

`domain-model.md` existe pero está vacío. No están presentes
`system-architecture.md`, `data-model.md` ni `diagrams/`. Véanse los pendientes
en el estado de migración; no se ha inventado contenido para sustituir estos
documentos.
