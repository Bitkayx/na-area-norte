# Runbook — ajustes operativos de Literatura

Estado: [README](../README.md). El frontend consulta `site_settings` mediante
el DAL. Este runbook separa el cambio de schema de la captura mensual de datos.

## Contrato de configuración

El campo JSON opcional `site_settings.literature` agrupa dos bloques editables:

- `nextInventory`: próximo inventario visible en Literatura.
- `salesSchedule`: horario semanal de venta.

`nextInventory` tiene esta forma:

- `date`: fecha local `YYYY-MM-DD`.
- `time`: hora local `HH:mm` o `null` si no se proporciona.
- `districts`: números vigentes de distrito, solo 1, 2, 4 o 5.
- `areaNorte`: booleano separado; Área Norte no es distrito.

`salesSchedule` tiene `days` (días ISO, lunes=1 a domingo=7), `startTime` y
`endTime` en `HH:mm`. El horario actualmente informado se representa como
`days: [2, 3, 4]`, `startTime: "17:00"`, `endTime: "18:00"`. Esto documenta el
valor confirmado por el usuario; el script no lo escribe en PocketBase.

La página muestra el bloque solo cuando existe una configuración válida y la
fecha no ha vencido. Sin fecha configurada no publica una fecha por defecto. La
administración mensual se hará desde PocketBase.

## Cambio de schema — completo

La inspección autenticada encontró 0 registros y `siteName` requerido. Tras
autorización explícita se ejecutó
`node --env-file=.env scripts/migrate-site-settings-schema.mjs --apply`; se
añadió solo `site_settings.literature`. La inspección posterior confirmó el
campo JSON y el dry-run posterior reportó `unchanged`. Se conservaron los campos
e índices y no se modificaron access rules. No se escribieron registros ni
valores.

El singleton debe crearse desde PocketBase con `siteName` y otros valores
revisados. Esa creación es una escritura de datos independiente y requiere
revisión y autorización explícitas.

## Captura y verificación mensual

Después de crear el singleton y revisar/autorización de esa escritura, configurar
`literature.salesSchedule` según el horario confirmado (`days: [2, 3, 4]`,
17:00–18:00). Configurar `literature.nextInventory` solo cuando se confirmen
fecha y participantes. No inferirlos ni cargar la fecha histórica de mayo como
próxima. Rebuild local/remoto y verificar que `/servicios/literatura` refleja
la configuración. No usar el `--apply` de schema como autorización para
editar registros o desplegar el sitio.

Astro genera salida estática; una edición de PocketBase requiere un nuevo
build/deploy para verse publicada. Confirmar el ciclo de actualización antes de
prometer publicación inmediata desde el administrador.
