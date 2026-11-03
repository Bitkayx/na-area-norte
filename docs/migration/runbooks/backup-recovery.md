# Runbook: backups y recuperación de PocketBase

Estado al **2026-11-02**: el usuario confirmó que no hay backups disponibles en
Railway ni en PocketBase. Confirmó que el volumen persistente está montado en
`/pb_data`. El plan actual es Free y no se cambiará ni se pagará por ahora.

## Evidencia disponible

- `Dockerfile` fija PocketBase 0.27.2 y ejecuta el servidor con `--dir=/pb_data`.
- El usuario confirmó el 2026-11-02 que no hay backups disponibles y verificó
  que el volumen persistente de Railway está montado en `/pb_data`.
- El repositorio no define programación/retención de backups, destino externo ni
  una prueba de restauración.
- `BACKLOG.md` conserva esos puntos como pendientes. La consola de Railway no se
  inspeccionó desde esta sesión.

PocketBase incluye una función de backup de `pb_data`, con copias locales o en
almacenamiento compatible con S3. Railway permite backups manuales o programados
para volúmenes; su documentación indica retenciones de 6 días (diario), 27 días
(semanal) y 89 días (mensual). Estas funciones no prueban la configuración de
este proyecto. Véanse [PocketBase: producción y backups](https://pocketbase.io/docs/going-to-production/),
[Railway: backups de volúmenes](https://docs.railway.com/volumes/backups) y
[Railway: volúmenes](https://docs.railway.com/volumes).

## Plan y decisión de backups

Referencia de planes compartida por el usuario el **2026-11-02**; revalidar
precios y condiciones en Railway antes de contratar:

| Plan | Mínimo mensual | Crédito de uso incluido |
| --- | ---: | ---: |
| Free (actual) | $0 | Railway documenta $1/mes |
| Hobby | $5 | $5/mes |
| Pro | $20 | $20/mes |

Detalles compartidos para evaluar más adelante:

- **Hobby:** hasta 48 vCPU/48 GB RAM por servicio; hasta 5 réplicas de 8 vCPU/
  8 GB cada una; hasta 5 GB de almacenamiento; un desarrollador en el workspace;
  soporte comunitario; objetivo de disponibilidad 99.9%; 7 días de logs y
  regiones globales.
- **Pro:** hasta 1,000 vCPU/1 TB RAM por servicio; hasta 42 réplicas de 24 vCPU/
  24 GB cada una; hasta 1 TB de almacenamiento; asientos ilimitados; soporte
  Railway; objetivo de disponibilidad 99.99%; 30 días de logs y regiones
  globales concurrentes.

Los créditos se aplican al uso de recursos y no convierten los planes pagados en
gratuitos. El usuario no desea pagar ni cambiar de plan ahora.

Una respuesta reciente del equipo de Railway confirma que los backups nativos
manuales y programados de volúmenes requieren **Pro** y no están disponibles en
Hobby. La documentación pública consultada no detalla el acceso del plan Free;
confirmarlo en el panel cuando el usuario decida retomar esta tarea. Para usar la
opción nativa, cambiar a Pro solo cuando el usuario lo decida.
La documentación general describe frecuencias diarias, semanales y mensuales,
con retenciones de 6, 27 y 89 días, respectivamente. Revisar también el cargo
incremental de almacenamiento antes de activar horarios.

Fuentes: [planes y precios](https://docs.railway.com/pricing/plans),
[backups de volúmenes](https://docs.railway.com/volumes/backups) y
[respuesta del equipo sobre disponibilidad por plan](https://station.railway.com/questions/volume-back-ups-and-cold-starts-adf65411).

Cuando el usuario decida pagar por esta función:

1. Revisar el costo vigente del plan Pro y el uso estimado del servicio.
2. Cambiar de plan desde Railway; no hacerlo sin decisión explícita del usuario.
3. En el servicio PocketBase, abrir **Settings → Backups**. Activar la
   programación que el usuario elija y, si está disponible, crear una copia
   manual inicial. Las frecuencias se pueden combinar.
4. Para probar restauración, crear un archivo de backup de PocketBase y
   descargarlo a almacenamiento local seguro o S3 temporal. Restaurarlo en una
   instancia de prueba con PocketBase 0.27.2 y datos aislados. No usar `Restore`
   de Railway sobre el servicio productivo para una prueba: esa acción reemplaza
   el volumen que tiene montado el servicio.

Los backups de volumen Railway solo se restauran dentro del mismo proyecto y
entorno, y eliminar el volumen borra sus backups. No son una copia independiente
del proveedor. PocketBase puede guardar sus archivos de backup en un bucket S3
compatible separado, que permitiría una restauración de prueba independiente;
eso añade costo y credenciales, y queda pendiente de decisión.

No se ha cambiado el plan ni la configuración externa. Esta propuesta no
constituye autorización para modificar Railway o PocketBase.

## Verificación futura en Railway

En la consola del proyecto, sin compartir credenciales ni valores secretos,
cuando el usuario decida habilitar backups, confirmar:

1. El servicio PocketBase conserva el volumen persistente montado en `/pb_data`.
2. Qué mecanismo crea los backups: backups de volumen Railway, backups
   internos de PocketBase o ambos.
3. Programación, última ejecución exitosa y retención visible.
4. Si existe una copia independiente fuera del volumen/servicio principal.

No dar por cubiertos los archivos subidos hasta confirmar que la copia protege
todo `/pb_data` o incluye explícitamente los archivos de PocketBase.

## Prueba de recuperación

Después de confirmar la configuración y acordar una ventana con el responsable:

1. Crear una copia manual identificable y confirmar que termina correctamente.
2. Exportar una copia PocketBase fuera del volumen de producción y restaurarla
   en un servicio de prueba aislado, con versión compatible y datos separados.
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
