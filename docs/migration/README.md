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
| Noticias                       | Inicio, listado y rutas consultan PocketBase vía DAL; se retiró el fallback runtime Markdown tras revisión del usuario. Los 13 Markdown permanecen como entrada de scripts históricos. |
| Distritos                      | **Migración y verificación completas**, registradas en `bfe7928`. Existen únicamente 1, 2, 4 y 5. El dry-run posterior reporta los cuatro `UNCHANGED`. Los tests pasaron 14/14.                                   |
| Validación remota de distritos | Completa el 2026-10-26: schema leído con autenticación, reglas list/view públicas, colección vacía y payloads revisados. Propone CREATE para 1, 2, 4 y 5; 0 updates y 0 conflictos.                               |
| Escrituras de distritos        | `--apply` fue autorizado explícitamente y ejecutado el 2026-10-26: 4 creates, 0 updates. No se modificaron schema ni access rules.                                                                                |
| Frontend                       | Se retiraron los fallbacks runtime de noticias, grupos y literatura; el usuario confirmó que el Preview se ve bien. Las fuentes V1 se conservan para scripts históricos. |
| Infraestructura/schema         | Se inspeccionaron autenticadamente las 15 colecciones el 2026-11-02. Las colecciones de contenido permiten lectura pública y reservan escrituras a superusers. `users.createRule` ahora es `null`; altas de cuentas solo por superuser. No se cambió schema. |
| Grupos                         | Migración completa: 43 grupos creados (9/10/13/11), 73 horarios, slugs únicos y relaciones válidas. El directorio consulta DAL sin fallback runtime; JSON se conserva como entrada de `migrate-groups.mjs`. |
| Literatura                     | 9 categorías y 161 productos migrados; dry-run posterior `UNCHANGED`. La página consulta DAL sin fallback runtime; `inventory.json` se conserva como entrada del migrador. Véase [análisis](literature-analysis.md). |
| `site_settings` | Campo JSON `literature` aplicado y verificado; usuario creó el singleton desde Admin el 2026-11-02. GET de lectura: 1 registro, payload coincide; próxima fecha de inventario sin configurar. Schema y reglas sin cambios en esta alta. Véase [auditoría](site-settings-analysis.md). |
| Radio                          | Octubre de 2026 completo: 4 registros con `13:00`, verificación `UNCHANGED` y build remoto correcto. Ediciones futuras se hacen en la administración de PocketBase.                                               |
| Events                         | Cinco Events creados tras autorización; dry-run `UNCHANGED` (5), 0 CREATE/conflictos. Build remota de 48 páginas; el HTML de Eventos muestra la última publicación (Literatura) y omite próximo evento futuro porque todos están archivados. Sin cambios de schema/access rules ni deploy. |
| Medios de posts                | `posts.bodyImages` aplicado; Invitaciones de Octubre publicado con 4 imágenes. El usuario confirmó el Preview. El cuerpo CMS se sanitiza antes de renderizarse; galería básica debajo del texto.                                                   |
| QA/administración              | Tests DAL 43/43, migradores 10/10 archivos, sanitizador 2/2 y build local de 49 páginas completados el 2026-11-02. Guía Admin en `runbooks/pocketbase-admin.md`.                                                         |

La idempotencia de distritos está probada localmente mediante una segunda
reconciliación simulada sin cambios y contra el estado real mediante dry-run
posterior: los cuatro quedaron `UNCHANGED`.

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
- `docs/architecture/pocketbase-schema.md` ahora existe como propuesta histórica;
  está marcado como no vigente y no debe aplicarse. Siguen faltando
  `system-architecture.md`, `data-model.md` y el directorio `diagrams/` anunciado
  por el índice. La propuesta histórica no acredita el schema actual.
- La lista de ADR pendientes del backlog no coincide con los ADR-003/004 reales.
  Consultar los archivos existentes, no reutilizar números desde esa lista.

## Estado de cierre

Las migraciones de contenido y el post de prueba están
revisados en Preview; el usuario confirmó el 2026-11-02 que todo se ve bien.
`pnpm build` conectado generó 49 páginas, incluida Invitaciones de Octubre con
cuatro imágenes. La suite DAL pasó 43/43, tests `.mjs` 10/10 y sanitizador 2/2.
La última auditoría de dependencias tras actualizar Astro y Sharp reportó 0
hallazgos críticos/altos, 1 moderado (`postcss-selector-parser`, vía Tailwind
Typography) y 1 bajo (`esbuild`, servidor de desarrollo en Windows). No se pudo
repetir `pnpm audit` en este entorno porque el almacén de pnpm está en solo
lectura.
El 2026-11-02 el usuario decidió diferir a V2.1 el panel propio y los roles para
una persona que solo edite posts. Las capturas reales de PocketBase se integraron
en la [guía Admin](runbooks/pocketbase-admin.md), que cubre listado, creación,
estado y edición con imágenes. El 2026-11-02 se bloqueó el registro público:
`users.createRule` ahora es `null` (solo un superuser puede crear cuentas). La
consulta posterior confirmó que list/view/update/delete siguen limitadas al
dueño; no se cambió el schema ni se afectaron cuentas existentes. Verificado con
`node --env-file=.env scripts/inspect-schema.mjs users --authenticate`.
Backups se difieren a V2.1, para revisar en un mes (~2026-12-02); véanse
[medios](media-assets-analysis.md), [guía Admin](runbooks/pocketbase-admin.md)
y [runbook de backups](runbooks/backup-recovery.md). Videos y PDFs siguen
excluidos; intercalar texto e imágenes también queda para V2.1.
El [TODO de V2.1](TODO.md#propuesta-de-alcance-para-v21) reúne además los temas
propuestos sobre `site_settings`/hero y su contador, documentación, análisis
visual, analíticas reales y tutoriales administrativos.

El 2026-11-02 se retiraron los fallbacks runtime de noticias, grupos y
literatura; se conservaron fuentes que usan los scripts históricos. TypeScript
compiló y `PUBLIC_POCKETBASE_URL= npm run build` pasó con 19 páginas y PocketBase
deshabilitado. Reflexiones registró fallos DNS de Google Sheets que su fallback
tolera. Esta build valida compilación, no el contenido remoto. El usuario
confirmó que el Preview posterior a estos cambios muestra correctamente noticias,
directorio y literatura. El 2026-11-02, el build local conectado a PocketBase
terminó con 48 páginas tras un 502 transitorio reportado por Vercel. Las
comprobaciones GET posteriores dieron 200; el usuario confirmó que el build de
Vercel pasó en el reintento.

El 2026-11-02 se corrigió `package.json`: `pnpm build` ya no termina en `|| true`,
que podía ocultar errores de Astro. `PUBLIC_POCKETBASE_URL= npm run build` pasó
con DAL deshabilitada y produjo 32 páginas; Reflexiones registró errores DNS de
Google Sheets, tolerados por su fallback. `pnpm build` no pudo iniciar porque el
store de pnpm es de solo lectura en este entorno. El usuario confirmó después
que el build de Vercel pasó.

La integración del hero manual se verificó localmente el 2026-11-02:
`tsc -p tests/tsconfig.compile.json`, `node tests/dal.test.ts` (43/43) y
`PUBLIC_POCKETBASE_URL= ./node_modules/.bin/astro build` (32 páginas) pasaron.
La build no consultó PocketBase; Reflexiones reportó un error DNS de Google
Sheets tolerado por su fallback. `pnpm test:dal` no pudo iniciar por un lock de
store de solo lectura; se ejecutó directamente el compilador y el test runner.
La verificación final de `site_settings` fue de solo lectura y devolvió un
registro que coincide con el payload revisado. La build local con acceso remoto
generó 48 páginas. Un GET público confirmó que producción aún sirve el hero
anterior; no se lanzó deploy de producción. Vercel CLI rechazó el token local,
por lo que el preview de la branch no se pudo comprobar. El preview protegido
respondió `Login – Vercel` a lecturas anónimas.

El 2026-11-02 se retiraron los fallbacks runtime de noticias, grupos y literatura.
Los Markdown/JSON V1 permanecen como entradas de scripts históricos. Stock: 0 es
válido para altas nuevas y se captura en PocketBase; 1 solo aplica a filas
históricas V1 sin `quantity`. Events quedó visualmente revisado por el usuario.

Véase el [análisis de noticias](news-analysis.md) para límites y evidencia.

## Mantenimiento

Actualizar esta página y el roadmap al terminar cada tarea. Para cada validación,
registrar fecha, revisión del código (incluidos cambios sin commit), comando,
entorno sin secretos, resultado y limitaciones. Diferenciar lo inspeccionado,
lo reportado por otra sesión y lo ejecutado. Registrar el alcance de autorizaciones
sin credenciales; nunca interpretar este documento como autorización de escritura.
