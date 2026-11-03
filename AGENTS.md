# Área Norte — contexto de ingeniería

## Proyecto y arquitectura

Sitio de **Neuróticos Anónimos Área Norte CDMX**. Astro presenta el contenido;
PocketBase es el backend/CMS de V2. El contenido operativo migrado y verificado
tiene su fuente de verdad en PocketBase. No añadir copias operativas hardcodeadas.
Las páginas consumen una DAL; mantener los detalles de PocketBase fuera de la
presentación cuando sea práctico.

## Lectura al iniciar

1. Inspeccionar `git status` y la implementación relevante.
2. Leer [estado de migración](docs/migration/README.md),
   [roadmap](docs/migration/roadmap.md) y el runbook de la entidad.
3. Consultar los [ADR existentes](docs/architecture/README.md) antes de cambiar
   arquitectura o dominio. Un documento vacío o ausente no acredita una decisión.

El progreso temporal vive en `docs/migration/README.md`, no en este archivo.

## Reglas de dominio

- Área Norte tiene únicamente distritos **1, 2, 4 y 5**; Área Norte no es un distrito.
- District es una unidad administrativa; Group pertenece a exactamente un distrito.
  No convertir registros de distrito en grupos. La dirección del distrito es su
  ubicación física, no necesariamente una oficina.
- Distrito y grupo pueden tener varios horarios. Cada horario contiene `days`
  (ISO: lunes=1 a domingo=7), `startTime` y `endTime`. Sin horarios significa
  información no disponible, no ausencia de sesiones. Conservar el texto original
  para trazabilidad y no adivinar horarios ambiguos.
- Los slugs de grupos son globalmente únicos. Para nombres repetidos entre
  distritos, incluir el distrito (`serenidad-d2`, `serenidad-d4`); no fusionarlos.
- En radio, solo pueden asignarse los distritos vigentes 1, 2, 4 y 5. Distrito 3
  y Distrito 6 no existen y nunca deben crearse como entidades u opciones. El
  calendario nuevo se recibe mensualmente y comienza limpio; no migrar como
  calendario vigente los registros históricos de radio. Área Norte puede seguir
  siendo un ámbito propio, pero no es un distrito. Identificar cada participación
  por su fecha exacta; el año debe confirmarse porque puede no venir en el mensaje.
  Si el rol mensual no indica hora, usar la hora operativa predeterminada `13:00`.
  Las altas y ediciones ordinarias se realizan desde la administración de
  PocketBase; los scripts son para preparación, migración y verificación.
- Reflexiones permanece fuera de PocketBase, mediante Google Sheets, salvo
  decisión explícita posterior.
- Posts y Events son entidades distintas. Evitar duplicar eventos presentes en
  posts, calendarios y páginas. Preservar contenido, slugs y URLs públicas.
- El contenido admite imágenes; videos y PDFs quedan fuera de alcance, también
  para contenido histórico. Auditar referencias antes de retirar archivos de
  media existentes; no borrar assets locales antes de verificar la migración.
- En literatura, `quantity` de V1 representa stock; si falta, asignar 1 al
  migrar. `stock` es opcional en el dominio. `total` es derivado
  (`price * stock`) y no se persiste. Para códigos repetidos con sufijo numérico,
  usar el prefijo alfabético como código genérico; conservar códigos únicos y
  genéricos ya existentes, y dejar faltantes nulos. No fusionar productos:
  reconciliar por título y categoría y detenerse ante identidades duplicadas.
  El stock 0 es válido para productos nuevos sin existencia y debe capturarse
  explícitamente desde PocketBase; no forzar 1 en altas nuevas. PocketBase
  almacena NumberFields con default 0 si se omiten. La regla de asignar 1 solo
  aplica a filas históricas de V1 sin `quantity` durante su migración.
- No inventar información faltante ni descartar información silenciosamente.

## Trabajo y migraciones

- Preservar todo trabajo local existente. No usar reset, restore, checkout,
  clean, stash ni otras operaciones destructivas de Git para limpiar el árbol.
- Nunca mostrar secretos ni el contenido de `.env` en salidas o documentación.
- No modificar schema ni access rules de PocketBase sin autorización explícita.
- Toda escritura de migración en PocketBase requiere autorización explícita
  **después de revisar un dry-run** del destino y alcance correspondientes.
  La autorización de una etapa no autoriza las siguientes.
- Seguir: analizar → transformar → validar → revisar → migrar → verificar.
  Preferir scripts repetibles, dry-run por defecto y detección de conflictos.
- No retirar fuentes V1 hasta validar datos, relaciones, media y consumidores V2.
- Hacer cambios pequeños y revisables, sin refactors ajenos a la tarea.
- Mantener los contratos del DAL: paginar consultas que prometen todos los
  registros, escapar valores en filtros y propagar errores reales de API/red.
- Ejecutar verificaciones adecuadas al cambio. Distinguir código implementado,
  tests ejecutados y verificación remota; no inferir éxito solo del exit code.
- Al cerrar una tarea, actualizar estado y roadmap con evidencia sanitizada:
  fecha, comando, entorno, resultado y pendientes. No declarar migrado algo
  únicamente porque existe un script o un commit lo afirma.
