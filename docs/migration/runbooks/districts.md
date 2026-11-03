# Runbook — migración de distritos

Estado: [README](../README.md). Etapas: [roadmap](../roadmap.md).
Este procedimiento no concede autorización ni certifica que el script esté listo.

## 1. Preparación local — DIST-LOCAL

- Inspeccionar git status, AGENTS y ADR-004; preservar cambios existentes.
- Fuente: registros cuyo id termina en `-distrito` de
  `src/data/grupos/distrito{1,2,4,5}.json`. No tratarlos como grupos.
- La entrada CLI invoca `main()` únicamente cuando el archivo es el entrypoint.
  Importar helpers para tests no inicia llamadas remotas.
- Revisar payloads, slugs, ubicación, horarios estructurados y texto original.
  Ausencia de horarios es información no disponible; no inventarla.
- Revisar reconciliación: coincidencias slug/número consistentes, conflictos,
  lectura completa y comparación estable con valores devueltos por PocketBase.
  La idempotencia está demostrada localmente; falta contrastarla con el destino.
- No contactar PocketBase en esta fase; no corregir schema ni access rules.

## 2. Tests locales — cierre DIST-LOCAL

Los tests específicos usan HTTP simulado. Deben cubrir transformación de los
cuatro distritos, datos inválidos,
horarios ambiguos y trazabilidad, create/update/unchanged, conflictos cruzados,
idempotencia y entrada CLI. Comprobar que el modo por defecto solo realiza GET,
no autentica y nunca envía POST/PATCH/DELETE; los conflictos deben impedir writes.

Ejecutar `node tests/migrate-districts.test.mjs` y documentar el resultado.
Ejecutar `pnpm run test:dal` para regresión del DAL (compila JS generado local).
No confundir sus 44 casos existentes con tests de migración de distritos.
Registrar resultados y comando exacto antes de habilitar la fase remota.

## 3. Dry-run remoto de solo lectura — DIST-DRY

Solo tras cerrar la fase local y contar con alcance autorizado para la lectura:
confirmar el destino de forma privada y usar el script **sin `--apply`**.
El comando previsto, una vez reparada y probada su entrada CLI, es:

```sh
node scripts/migrate-districts.mjs
```

La URL procede de configuración local; nunca imprimir `.env`, credenciales ni
tokens. El script elimina credenciales, query y fragmento al mostrarla; aun así,
revisar toda la salida antes de compartirla.

Confirmar visibilidad completa de registros: una lista vacía no demuestra por sí
sola que no existan datos. Ante restricciones, errores o schema incompatible,
detenerse y registrar el bloqueo; no modificar access rules ni schema para pasar.
Conservar evidencia sanitizada del plan y advertencias. Una URL inválida, salida
vacía o exit code cero sin plan no acredita un dry-run válido.

## 4. Revisión — DIST-REVIEW

Revisar cada create/update/unchanged y sus campos frente a V1 y el destino.
Resolver conflictos y ambigüedades sin inventar datos. Confirmar compatibilidad
con el schema real mediante lecturas autorizadas; el documento de schema falta.
Definir recuperación ante fallo parcial antes de aplicar. Si cambia código,
fuente o destino de manera que afecte al plan, repetir tests/dry-run y revisión.

## 5. Autorización explícita

Solicitar autorización después de presentar el dry-run: destino, cuatro distritos,
operaciones y campos concretos. Registrar el alcance aprobado sin secretos.
No hay autorización actual para `--apply`. Cambios de schema/access rules
requieren aprobación independiente; no quedan implícitos en migrar datos.

## 6. Apply — DIST-APPLY

Únicamente con la autorización anterior, ejecutar la versión revisada del script
con `--apply` y configuración privada. No ampliar el alcance. Registrar IDs,
operaciones y errores sanitizados. Ante fallo parcial, detenerse, releer el estado
y generar un nuevo plan; no reintentar escrituras fuera de lo autorizado.

## 7. Verificación — DIST-VERIFY

Leer los registros resultantes: números 1,2,4,5, slugs únicos, direcciones,
mapas, horarios y texto original. Comparar con V1 y el plan aprobado; comprobar
que no se introdujeron duplicados ni distritos 3/6. Repetir dry-run de solo lectura:
no debe proponer cambios inesperados. Registrar evidencia y actualizar estado y
roadmap. No retirar datos V1 ni escribir correcciones automáticamente.
