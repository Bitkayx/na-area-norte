# Estado de la migración V1 → V2

Última revisión local: **2026-11-02**. Entrada para retomar el proyecto junto con
[AGENTS.md](../../AGENTS.md), el [roadmap](roadmap.md) y el
[runbook de distritos](runbooks/districts.md) y la [lista de continuación](TODO.md).

Este archivo registra el estado vigente. `BACKLOG.md` conserva planificación
histórica; sus casillas, numeración de ADR y “siguiente paso” no acreditan avance.
No llamar “E2” a distritos: Épica 2 del backlog significa modelado del dominio.

## Estado conocido

| Área                           | Estado y evidencia                                                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DAL                            | Existe en `src/lib/dal/`; hardening registrado en `978ca6b`. El 2026-10-26 pasaron 44/44 casos y el build directo de Astro con `PUBLIC_POCKETBASE_URL` vacío.                                                     |
| Noticias                       | Inicio, listado y rutas usan DAL con fallback Markdown. Builds local/remoto: 32/48 páginas; 13 rutas presentes. El usuario confirmó revisión visual satisfactoria del preview el 2026-11-02. Las fuentes Markdown siguen alimentando 13 scripts históricos y el fallback local; se conservan. |
| Distritos                      | **Migración y verificación completas**, registradas en `bfe7928`. Existen únicamente 1, 2, 4 y 5. El dry-run posterior reporta los cuatro `UNCHANGED`. Los tests pasaron 14/14.                                   |
| Validación remota de distritos | Completa el 2026-10-26: schema leído con autenticación, reglas list/view públicas, colección vacía y payloads revisados. Propone CREATE para 1, 2, 4 y 5; 0 updates y 0 conflictos.                               |
| Escrituras de distritos        | `--apply` fue autorizado explícitamente y ejecutado el 2026-10-26: 4 creates, 0 updates. No se modificaron schema ni access rules.                                                                                |
| Frontend                       | Directorio, literatura y configuración global integrados con DAL/fallback. Singleton creado desde Admin y verificado. Build local con datos remotos: 48 páginas; HTML contiene hero y horario. Commits subidos a `feature/26.7`; estado del preview Vercel no confirmado porque el token de CLI guardado es inválido. No se lanzó deploy de producción. |
| Infraestructura/schema         | Existen scripts de creación e inspección. `site_settings` se leyó autenticadamente el 2026-11-02; otros schemas/infraestructura no se revalidaron en esta etapa. No ejecutar scripts generales de schema para reconstruir contexto. |
| Grupos                         | Migración completa: 43 grupos creados (9/10/13/11), 73 horarios, slugs únicos y relaciones válidas. El dry-run posterior reportó 43 `UNCHANGED`, 0 creates/updates. Tests 11/11.                                  |
| Literatura                     | 9 categorías y 161 productos migrados; dry-run posterior `UNCHANGED`. Página integrada con DAL y JSON fallback; build local/remoto verificados. Véase [análisis](literature-analysis.md). |
| `site_settings` | Campo JSON `literature` aplicado y verificado; usuario creó el singleton desde Admin el 2026-11-02. GET de lectura: 1 registro, payload coincide; próxima fecha de inventario sin configurar. Schema y reglas sin cambios en esta alta. Véase [auditoría](site-settings-analysis.md). |
| Radio                          | Octubre de 2026 completo: 4 registros con `13:00`, verificación `UNCHANGED` y build remoto correcto. Ediciones futuras se hacen en la administración de PocketBase.                                               |
| Events                         | Cinco Events creados tras autorización; dry-run `UNCHANGED` (5), 0 CREATE/conflictos. Build remota de 48 páginas; el HTML de Eventos muestra la última publicación (Literatura) y omite próximo evento futuro porque todos están archivados. Sin cambios de schema/access rules ni deploy. |

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

**SITESETTINGS-FRONT-REVIEW:** singleton creado desde PocketBase Admin y lectura
remota confirmó un registro con el payload aprobado. Build Astro con datos
remotos generó 48 páginas; comprobaciones del HTML confirmaron hero y horario
semanal de Literatura. Los commits `f2b4a52`, `4829b14` y `96b976e` están
subidos a `feature/26.7`. La consulta de estado Vercel falló porque el token de
CLI guardado es inválido; revisar visualmente portada y Literatura cuando el
preview de esa branch esté disponible. No se lanzó deploy de producción. Véase
[auditoría](site-settings-analysis.md).

La integración del hero manual se verificó localmente el 2026-11-02:
`tsc -p tests/tsconfig.compile.json`, `node tests/dal.test.ts` (43/43) y
`PUBLIC_POCKETBASE_URL= ./node_modules/.bin/astro build` (32 páginas) pasaron.
La build no consultó PocketBase; Reflexiones reportó un error DNS de Google
Sheets tolerado por su fallback. `pnpm test:dal` no pudo iniciar por un lock de
store de solo lectura; se ejecutó directamente el compilador y el test runner.
La verificación final de `site_settings` fue de solo lectura y devolvió un
registro que coincide con el payload revisado. La build remota se ejecutó con
acceso de red autorizado. La branch se subió, pero Vercel CLI no permitió
verificar el preview por token inválido; no se lanzó deploy de producción.

La auditoría frontend encontró fallbacks runtime de noticias (Markdown), grupos
(JSON) y literatura (JSON). Markdown también alimenta scripts históricos; no
retirar fuentes durante esa auditoría. Stock: 0 es válido para altas nuevas y se
captura en PocketBase; 1 solo aplica a filas históricas V1 sin `quantity`. Events
quedó visualmente revisado por el usuario el 2026-11-02; no se hizo deploy.

Véase el [análisis de noticias](news-analysis.md) para límites y evidencia.

## Mantenimiento

Actualizar esta página y el roadmap al terminar cada tarea. Para cada validación,
registrar fecha, revisión del código (incluidos cambios sin commit), comando,
entorno sin secretos, resultado y limitaciones. Diferenciar lo inspeccionado,
lo reportado por otra sesión y lo ejecutado. Registrar el alcance de autorizaciones
sin credenciales; nunca interpretar este documento como autorización de escritura.
