# Runbook — primera ola de Events

Estado y evidencia: [README](../README.md). Fuentes y decisiones: [análisis de
Events](../events-analysis.md). El flujo no autoriza escrituras por sí mismo.

## Preparación local

Revisar `src/data/events-2026-seed.json` contra las fuentes indicadas. Confirmar
fechas de ocurrencia y campos de ubicación; dejar vacíos los datos sin evidencia.
Los cinco elementos están confirmados como Events y sus posts se enlazan por
slug exacto. Al 2026-11-02 todos son pasados y su estado propuesto es `archived`.

## Tests

```sh
node --test tests/migrate-events.test.mjs
node --test tests/dal.test.ts
./node_modules/.bin/tsc -p tests/tsconfig.compile.json
./node_modules/.bin/astro build
```

Revisar errores de red durante la build por separado de la compilación de rutas.

## Dry-run remoto de solo lectura

```sh
node --env-file=.env scripts/migrate-events.mjs
```

No usar `--apply`. Confirmar cantidad de posts/Events, cinco slugs, acciones,
relación a posts y cero conflictos. La salida no contiene credenciales.

## Revisión y autorización

Revisar cada payload en `src/data/events-2026-seed.json`, especialmente fechas,
ubicaciones, estado y `postRef`. Presentar el resultado del dry-run y obtener una
autorización explícita para crear esos cinco Events. Cualquier cambio en seed o
alcance requiere repetir el dry-run y revisar el nuevo plan.

## Apply y verificación

Solo tras esa autorización específica:

```sh
node --env-file=.env scripts/migrate-events.mjs --apply
node --env-file=.env scripts/migrate-events.mjs
```

El migrador solo crea; nunca actualiza ni borra. El segundo comando debe reportar
cinco `UNCHANGED`, 0 CREATE y 0 conflictos. Inspeccionar además relaciones y
render de `/servicios/eventos`. Documentar fecha, comandos, conteos y resultado;
no incluir secretos. La autorización no cubre cambios de schema, access rules,
otros eventos ni deploy.
