# Estado de la migración V1 → V2

Última revisión local: **2026-10-30**. Entrada para retomar el proyecto junto con
[AGENTS.md](../../AGENTS.md), el [roadmap](roadmap.md) y el
[runbook de distritos](runbooks/districts.md) y la [lista de continuación](TODO.md).

Este archivo registra el estado vigente. `BACKLOG.md` conserva planificación
histórica; sus casillas, numeración de ADR y “siguiente paso” no acreditan avance.
No llamar “E2” a distritos: Épica 2 del backlog significa modelado del dominio.

## Estado conocido

| Área                           | Estado y evidencia                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DAL                            | Existe en `src/lib/dal/`; hardening registrado en `978ca6b`. El 2026-10-26 pasaron 44/44 casos y el build directo de Astro con `PUBLIC_POCKETBASE_URL` vacío.                                                     |
| Noticias                       | Inicio, listado y rutas usan DAL con fallback Markdown. Builds local/remoto: 32/48 páginas; 13 rutas presentes. Smoke test local reportado: inicio, imagen optimizada, noticias, 2 posts y directorio respondieron 200. 49 imágenes resuelven en build; falta preview visual completo. |
| Distritos                      | **Migración y verificación completas**, registradas en `bfe7928`. Existen únicamente 1, 2, 4 y 5. El dry-run posterior reporta los cuatro `UNCHANGED`. Los tests pasaron 14/14.                                   |
| Validación remota de distritos | Completa el 2026-10-26: schema leído con autenticación, reglas list/view públicas, colección vacía y payloads revisados. Propone CREATE para 1, 2, 4 y 5; 0 updates y 0 conflictos.                               |
| Escrituras de distritos        | `--apply` fue autorizado explícitamente y ejecutado el 2026-10-26: 4 creates, 0 updates. No se modificaron schema ni access rules.                                                                                |
| Frontend                       | Directorio y literatura integrados con DAL y fallback JSON. El banner de radio consulta la próxima fecha mediante DAL y muestra estado pendiente si no existe; builds local/remoto de literatura verificados. |
| Infraestructura/schema         | Existen scripts de creación e inspección. La transferencia reporta PocketBase en Railway con volumen y superusuario; el estado remoto no fue verificado. No ejecutar scripts de schema para reconstruir contexto. |
| Grupos                         | Migración completa: 43 grupos creados (9/10/13/11), 73 horarios, slugs únicos y relaciones válidas. El dry-run posterior reportó 43 `UNCHANGED`, 0 creates/updates. Tests 11/11.                                  |
| Literatura                     | 9 categorías y 161 productos migrados; dry-run posterior `UNCHANGED`. Página integrada con DAL y JSON fallback; build local/remoto verificados. Véase [análisis](literature-analysis.md). |
| Radio                          | Octubre de 2026 completo: 4 registros con `13:00`, verificación `UNCHANGED` y build remoto correcto. Ediciones futuras se hacen en la administración de PocketBase.                                               |

La idempotencia de distritos está probada localmente mediante una segunda
reconciliación simulada sin cambios. Aún falta validarla contra el estado real.
El script `pnpm build` puede ocultar fallos por su operador final; la validación
registrada usó directamente el binario de Astro.

## Evidencia local — 2026-10-26

- `node tests/migrate-districts.test.mjs`: 14/14, con HTTP simulado.
- `./node_modules/.bin/tsc -p tests/tsconfig.compile.json && node tests/dal.test.ts`:
  44/44.
- `PUBLIC_POCKETBASE_URL= ./node_modules/.bin/astro build`: build completo,
  32 páginas. Reflexiones intentó su fuente Google Sheets y registró errores de
  red tolerados; no forma parte de PocketBase.
- La invocación CLI se comprobó contra `127.0.0.1:1`: inició el dry-run y falló
  localmente como se esperaba. No constituye un dry-run remoto.
- `node scripts/migrate-districts.mjs`: dry-run remoto exitoso; CREATE 1, 2, 4
  y 5, sin updates ni conflictos. No realizó escrituras.
- La inspección autenticada confirmó campos compatibles, reglas list/view
  públicas e índices únicos para `number` y `slug`. El dry-run con `--json`
  confirmó los cuatro payloads y el mismo plan. No hubo escrituras.
- Tras autorización explícita, `node scripts/migrate-districts.mjs --apply`
  creó cuatro registros y no actualizó ninguno. PocketBase normalizó textos
  opcionales `null` a `""`; la comparación se ajustó y quedó cubierta por test.
- El dry-run posterior reportó 4 `UNCHANGED`, 0 creates y 0 updates.
- `node scripts/migrate-groups.mjs`: dry-run remoto exitoso; 43 creates, 0
  updates y 0 conflictos. La inspección autenticada confirmó schema compatible,
  reglas list/view públicas, relación obligatoria a `districts` e índice único
  de slug. No hubo escrituras en `groups`.
- Tras autorización explícita, `node scripts/migrate-groups.mjs --apply` creó
  43 registros y no actualizó ninguno. El dry-run posterior reportó los 43
  `UNCHANGED`, con 0 creates y 0 updates.
- `./node_modules/.bin/astro build` con fuentes remotas: build completo de 48
  páginas. `dist/directorio/index.html` contiene 43 grupos serializados, incluidos
  los cuatro slugs desambiguados, y cero registros V1 de distrito. El build local
  con PocketBase deshabilitado también pasó usando el fallback JSON.

## Huecos y contradicciones documentales

- README todavía habla de cinco distritos. La regla aprobada es únicamente
  **1, 2, 4 y 5** (ADR-004 y AGENTS); no deducir distritos adicionales.
- El nombre correcto es **Neuróticos Anónimos**; se corrigió la referencia
  incorrecta de AGENTS durante esta transición.
- `docs/architecture/domain-model.md`, `docs/migration/domain-model.md` y
  `docs/migration/data-cleanup-plan.md` existen, pero están vacíos. ADR-003/004
  aportan decisiones parciales, no reemplazan documentación detallada faltante.
- Faltan `docs/architecture/pocketbase-schema.md` (citado por scripts y tipos),
  `system-architecture.md`, `data-model.md` y el directorio `diagrams/` que anuncia
  el índice de arquitectura. No asumir aprobado un schema por esos comentarios.
- La lista de ADR pendientes del backlog no coincide con los ADR-003/004 reales.
  Consultar los archivos existentes, no reutilizar números desde esa lista.

## Siguiente tarea exacta

**NEWS-MEDIA-PREVIEW:** revisar en navegador las páginas remotas de noticias
cuando exista un preview de Vercel autorizado. El build empaquetado resuelve las
49 imágenes embebidas y las 10 URLs remotas respondieron 200; el smoke test local
reportado cubre inicio, listado, 2 posts y directorio. Falta revisar visualmente
encuadre y presentación completa; conservar Markdown de fallback.

Véase el [análisis de noticias](news-analysis.md) para límites y evidencia.

## Mantenimiento

Actualizar esta página y el roadmap al terminar cada tarea. Para cada validación,
registrar fecha, revisión del código (incluidos cambios sin commit), comando,
entorno sin secretos, resultado y limitaciones. Diferenciar lo inspeccionado,
lo reportado por otra sesión y lo ejecutado. Registrar el alcance de autorizaciones
sin credenciales; nunca interpretar este documento como autorización de escritura.
