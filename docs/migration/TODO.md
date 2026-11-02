# Lista de continuación de migración

Fuente operativa para retomar el trabajo después de una pausa o cambio de
sesión. El estado detallado y la evidencia viven en [README](README.md); las
etapas y sus criterios están en [roadmap](roadmap.md). Esta lista no concede
autorizaciones remotas.

## Estado de entrada

- Rama de trabajo: `feature/26.7`.
- Consultar `git log -1` para identificar el checkpoint más reciente.
- Distritos 1, 2, 4 y 5 migrados y verificados.
- 43 grupos migrados y verificados; directorio usa DAL con fallback JSON.
- Schema de `radio_broadcasts` usa `broadcastDate` requerido y único; `week` ya
  no existe.
- Octubre de 2026 tiene cuatro registros y el dry-run posterior quedó en
  `UNCHANGED`; hora predeterminada `13:00`.
- Las ediciones ordinarias de radio se hacen en la administración de PocketBase.
- No retirar todavía fuentes V1 ni ejecutar cambios de schema sin autorización.

## Siguiente acción

Siguiente etapa: `EVENTS-SCOPE-REVIEW`, confirmar qué ocurrencias del calendario
se administrarán como Events y cuáles son reuniones/compartimientos. Events está
vacía; los 13 posts no tienen relación, pero cinco posts podrían corresponder a
entradas del calendario. No se han inferido fechas ni preparado escrituras. Véase
[análisis de Events](events-analysis.md).

Noticias: la revisión de preview pasó según confirmación del usuario (2026-11-02).
Se conservan Markdown como fallback local y entrada de 13 scripts históricos.
Literatura consulta DAL con JSON fallback; nueve categorías y 161 productos están
migrados y el dry-run quedó `UNCHANGED`. Definir el flujo de stock para altas
administrativas: PB asigna 0 si se omite.

Cuando llegue un nuevo mensaje mensual de WhatsApp:

1. Confirmar el año explícito.
2. Guardar el texto fuera de Git y ejecutar el parser local:

   ```sh
   node scripts/prepare-radio-schedule.mjs --year AAAA --input /ruta/mensaje.txt
   node --test tests/prepare-radio-schedule.test.mjs
   ```

3. Revisar fechas, responsables, relaciones y que la hora sea `13:00` salvo
   indicación distinta.
4. Ejecutar el dry-run mensual:

   ```sh
   node scripts/migrate-radio-schedule.mjs --year AAAA --input /ruta/mensaje.txt
   ```

5. Compartir el plan y obtener autorización explícita para ese mes.
6. Ejecutar `--apply` solo después de esa autorización.
7. Repetir el dry-run y exigir todos los registros `UNCHANGED`.
8. Ejecutar build local; cuando exista un preview de Vercel autorizado, revisar
   el banner, fecha, responsable y hora.

## Trabajo V2 pendiente

- Noticias: integración y revisión visual completas; mantener Markdown como
  fallback y archivo fuente de los scripts históricos.
- Literatura: integración DAL y builds local/remoto completados; mantener JSON
  fallback hasta decidir su retiro y resolver el default editorial de stock.
- Events: verificar duplicados entre posts, calendarios y páginas.
- Site settings y media: validar alcance, assets y estrategia para videos grandes.
- Frontend: retirar JSON V1 únicamente después de validar cada entidad y sus
  rutas públicas.
- OPS: documentar backups, recuperación, seguridad, administración, QA y release.

## Al retomar

Leer `AGENTS.md`, este archivo, `docs/migration/README.md`, `roadmap.md` y el
runbook de la entidad. Ejecutar `git status --short`. No mostrar `.env`, no usar
operaciones destructivas de Git y no asumir que una autorización anterior cubre
otro mes, entidad, schema o deploy.
