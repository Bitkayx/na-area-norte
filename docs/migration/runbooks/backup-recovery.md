# Runbook: backups y recuperación de PocketBase

Estado: **auditoría local completa; configuración de Railway sin confirmar**.
Este documento no afirma que existan backups activos.

## Evidencia disponible

- `Dockerfile` fija PocketBase 0.27.2 y ejecuta el servidor con `--dir=/pb_data`.
- El repositorio no define el volumen de Railway, programación/retención de
  backups, destino externo ni una prueba de restauración.
- `BACKLOG.md` conserva esos puntos como pendientes. La consola de Railway no se
  inspeccionó desde esta sesión.

PocketBase incluye una función de backup de `pb_data`, con copias locales o en
almacenamiento compatible con S3. Railway permite backups manuales o programados
para volúmenes; su documentación indica retenciones de 6 días (diario), 27 días
(semanal) y 89 días (mensual). Estas funciones no prueban la configuración de
este proyecto. Véanse [PocketBase: producción y backups](https://pocketbase.io/docs/going-to-production/),
[Railway: backups de volúmenes](https://docs.railway.com/volumes/backups) y
[Railway: volúmenes](https://docs.railway.com/volumes).

## Verificación pendiente en Railway

En la consola del proyecto, sin compartir credenciales ni valores secretos,
confirmar:

1. El servicio PocketBase tiene un volumen persistente montado en `/pb_data`.
2. Si hay backups, qué mecanismo los crea: backups de volumen Railway, backups
   internos de PocketBase o ambos.
3. Programación, última ejecución exitosa y retención visible.
4. Si existe una copia independiente fuera del volumen/servicio principal.

No dar por cubiertos los archivos subidos hasta confirmar que la copia protege
todo `/pb_data` o incluye explícitamente los archivos de PocketBase.

## Prueba de recuperación

Después de confirmar la configuración y acordar una ventana con el responsable:

1. Crear una copia manual identificable y confirmar que termina correctamente.
2. Restaurarla en un servicio/proyecto aislado, con versión compatible de
   PocketBase y su propio volumen; nunca ensayar primero sobre producción.
3. Comprobar inicio de PocketBase, colecciones, registros y apertura de medios.
   Registrar conteos sin incluir datos personales o secretos.
4. Documentar fecha, origen de la copia, duración, resultado y límites. No borrar
   la copia ni el servicio de prueba hasta revisar el resultado.

La restauración de Railway puede sustituir el volumen adjunto y requiere aplicar
la restauración/despliegue desde su consola. PocketBase también reinicia el
proceso al restaurar una copia. Una restauración en producción necesita una
revisión y autorización separadas.

## Criterio de cierre

Cerrar `OPS-BACKUP-RECOVERY` cuando el operador confirme la configuración real,
la cobertura de la base y archivos, destino/retención y una restauración aislada
exitosa. La auditoría local por sí sola no satisface este criterio.
