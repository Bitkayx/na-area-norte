# Lista de continuación de migración

Fuente operativa para retomar el trabajo después de una pausa o cambio de
sesión. El estado detallado y la evidencia viven en [README](README.md); las
etapas y sus criterios están en [roadmap](roadmap.md). Esta lista no concede
autorizaciones remotas.

## Estado de entrada

- Rama de trabajo: `feature/26.7`.
- Consultar `git log -1` para identificar el checkpoint más reciente.
- Distritos 1, 2, 4 y 5 migrados y verificados.
- 43 grupos migrados y verificados; directorio usa DAL sin fallback runtime.
- Schema de `radio_broadcasts` usa `broadcastDate` requerido y único; `week` ya
  no existe.
- Octubre de 2026 tiene cuatro registros y el dry-run posterior quedó en
  `UNCHANGED`; hora predeterminada `13:00`.
- Las ediciones ordinarias de radio se hacen en la administración de PocketBase.
- Conservar fuentes V1 que usan migradores; no ejecutar cambios de schema sin autorización.

## Siguiente acción

El usuario confirmó que noticias, directorio y literatura se ven bien en el
Preview después de retirar los fallbacks runtime; el reintento de Vercel pasó.
El volumen persistente está montado en `/pb_data`, pero no hay backups. El plan
actual es Free y el usuario no desea pagar por ahora; los backups nativos de
Railway requieren Pro. No cambiar el plan sin decisión explícita. Siguiente paso
de medios: el campo `posts.bodyImages` está aplicado; el usuario cargó cuatro
imágenes en el borrador `invitaciones-octubre`. Completar texto/metadata y revisar
antes de publicar. La build local pasó con 48 páginas, pero no incluyó el post
porque sigue en `draft`; revisar build/Preview cuando se decida publicarlo. Véase
la [auditoría de medios](media-assets-analysis.md). La futura configuración de
backups y restauración está en el [runbook](runbooks/backup-recovery.md).
En altas nuevas, stock 0 es válido y se captura en PocketBase.
Los cinco Events están verificados y el usuario confirmó que `/servicios/eventos`
se ve bien.

Noticias: la revisión de preview pasó según confirmación del usuario (2026-11-02).
Los Markdown se conservan como entrada de 13 scripts históricos, sin fallback
runtime. Literatura consulta DAL sin fallback JSON; nueve categorías y 161 productos están
migrados y el dry-run quedó `UNCHANGED`. Las altas nuevas deben capturar stock
real explícitamente; 0 es válido cuando no hay existencia.

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

- Noticias: integración y revisión visual completas; Markdown conservado como
  entrada de 13 scripts históricos, sin fallback runtime.
- Literatura: productos en DAL sin fallback JSON; `inventory.json` permanece
  como fuente del migrador; stock 0 aprobado para altas
  nuevas. Schema de `site_settings.literature` aplicado y singleton verificado.
- Events: cinco Events migrados, verificados y revisados visualmente.
- Site settings: singleton creado y verificado; el usuario confirmó el Preview.
  Para imágenes nuevas se propone almacenamiento en PocketBase; falta definir
  conservación. Videos y PDFs quedan fuera del alcance acordado.
- Frontend: fallbacks runtime de noticias, grupos y literatura retirados; el
  usuario confirmó la revisión del Preview. Preservar fuentes V1 usadas por
  scripts de migración.
- OPS: backups diferidos hasta decidir el plan Pro; después configurar y probar
  recuperación. Completar también seguridad, administración, QA y release.

## Al retomar

Leer `AGENTS.md`, este archivo, `docs/migration/README.md`, `roadmap.md` y el
runbook de la entidad. Ejecutar `git status --short`. No mostrar `.env`, no usar
operaciones destructivas de Git y no asumir que una autorización anterior cubre
otro mes, entidad, schema o deploy.
