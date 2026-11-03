# Runbook — calendario mensual de radio

Estado: [README](../README.md). Diseño: [análisis de radio](../radio-analysis.md).
Este procedimiento no autoriza cambios de schema ni escrituras.

## Preparación local

Guardar el mensaje mensual como texto fuera de Git y ejecutar:

```sh
node scripts/prepare-radio-schedule.mjs --year AAAA --input /ruta/al/mensaje.txt
```

El año es obligatorio. El comando acepta fechas con meses en español y variantes
observadas como `1er Dto`, `4to Dto` y `Área Norte`. Solo admite distritos 1, 2,
4 y 5. Muestra un JSON local y nunca contacta PocketBase.

Verificación:

```sh
node --test tests/prepare-radio-schedule.test.mjs
```

Revisar fechas, responsables y cualquier error. Cuando el mensaje no incluye
hora se usa `13:00`; enlace y nota permanecen nulos si no se proporcionan.

## Cambio de schema pendiente

La colección remota existente usa `week` único 1–52. El diseño aprobado requiere
un campo de fecha único, propuesto como `broadcastDate`. Antes de cambiarla:

1. inspeccionar el schema remoto en modo lectura;
2. preparar y revisar el cambio exacto y su compatibilidad con el DAL;
3. solicitar autorización explícita para modificar schema;
4. verificar el schema después del cambio.

Dry-run remoto del 2026-10-26: la colección está vacía y el plan contiene un
único PATCH que reemplaza `week`/`idx_radio_week` por
`broadcastDate`/`idx_radio_date`. Conserva todos los demás campos, relación,
índices y access rules. No se realizaron escrituras.

Aplicación del 2026-10-26: tras autorización explícita se ejecutó el único PATCH.
La inspección posterior confirmó `broadcastDate` requerido, índice único
`idx_radio_date`, relación e índice de distrito intactos y las mismas access
rules. La colección permaneció vacía; esta autorización no incluyó registros.

## Dry-run remoto y apply

El reconciliador remoto se implementará después de aprobar el schema. Deberá
resolver IDs de distrito por número, comparar por fecha, ser idempotente y hacer
solo GET en dry-run. Tras revisar ese plan se necesitará otra autorización
explícita para escribir el calendario. Una autorización de schema no autoriza los
registros y una autorización mensual no autoriza meses posteriores.

Comando mensual de dry-run:

```sh
node scripts/migrate-radio-schedule.mjs --year AAAA --input /ruta/al/mensaje.txt
```

Solo después de revisar el plan y obtener autorización explícita para ese mes:

```sh
node scripts/migrate-radio-schedule.mjs --year AAAA --input /ruta/al/mensaje.txt --apply
```

Repetir sin `--apply`; todos los registros del mes deben quedar `UNCHANGED`.

Octubre de 2026 se aplicó con autorización explícita: 4 creates, 0 updates. El
dry-run posterior reportó 4 `UNCHANGED`; el build remoto mostró la participación
del 26 de octubre de Área Norte sin inventar hora ni enlace.

Después se aprobó `13:00` como hora predeterminada: se actualizaron los cuatro
registros y la verificación quedó `UNCHANGED`. Para operación habitual, crear y
editar desde la administración de PocketBase. Informar fecha, responsable y
`13:00`, salvo que el rol indique otra hora; para Área Norte activar
`ownerIsAreaNorte` y dejar `district` vacío, y para un distrito hacer lo inverso.
El banner usa `13:00` como respaldo si el campo queda vacío.
