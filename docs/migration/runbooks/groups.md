# Runbook — migración de grupos

Estado: [README](../README.md). Análisis: [groups-analysis](../groups-analysis.md).
Este procedimiento no concede autorización de escritura.

## Preparación local — GROUP-LOCAL

- Excluir los cuatro registros cuyo ID termina en `-distrito`.
- Validar 43 grupos con distribución 9/10/13/11 y 73 horarios estructurados.
- Resolver `district` por número contra los registros reales; no hardcodear IDs.
- Usar slugs con distrito para Serenidad y Valor para cambiar en D2/D4.
- Preservar todos los horarios en `scheduleText`, incluida la excepción de sábado.
- Migrar los 43 registros publicados como `isActive: true`, decisión aprobada el
  2026-10-26.

Verificación local:

```sh
node tests/migrate-groups.test.mjs
node tests/migrate-districts.test.mjs
```

## Dry-run remoto — GROUP-DRY

Ejecutar sin `--apply`:

```sh
node scripts/migrate-groups.mjs
```

Debe realizar solo GET, confirmar los cuatro distritos, leer todos los grupos y
mostrar 43 acciones sin conflictos. Verificar mediante lectura autenticada que
las reglas no ocultan registros. Una colección vacía solo queda acreditada si su
visibilidad se confirma. Revisar la salida antes de compartirla; nunca mostrar
`.env`, tokens ni credenciales.

## Revisión y autorización

Revisar conteos por distrito, relaciones, slugs, direcciones, los 73 horarios y
cualquier create/update/conflict. Si cambia código, fuente o destino, repetir
tests y dry-run. Después presentar el plan concreto y solicitar autorización
explícita. La autorización de distritos no autoriza grupos.

## Apply — GROUP-APPLY

Solo con autorización explícita para el destino y plan revisados:

```sh
node scripts/migrate-groups.mjs --apply
```

No ampliar el alcance ni modificar schema/access rules. Ante un fallo parcial,
detenerse, releer el estado y generar un nuevo plan antes de otra escritura.

## Verificación — GROUP-VERIFY

Repetir el dry-run sin `--apply`: los 43 grupos deben quedar `UNCHANGED`, con
cero creates/updates/conflicts. Confirmar relaciones, slugs únicos, 73 horarios,
texto original y ausencia de grupos para distritos 3/6. Registrar evidencia antes
de integrar el frontend o retirar JSON V1.
