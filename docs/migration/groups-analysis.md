# Análisis V1 — grupos

Fecha: **2026-10-26**. Fuentes inspeccionadas:
`src/data/grupos/distrito{1,2,4,5}.json`. Este análisis es local; no consultó ni
modificó la colección `groups` de PocketBase.

## Inventario

Los cuatro archivos contienen 47 registros: 4 distritos ya migrados y **43
grupos reales**. Los grupos se distribuyen así:

| Distrito | Registros totales | Registro de distrito | Grupos |
| -------- | ----------------- | -------------------- | ------ |
| 1        | 10                | 1                    | 9      |
| 2        | 11                | 1                    | 10     |
| 4        | 14                | 1                    | 13     |
| 5        | 12                | 1                    | 11     |

Todos los grupos tienen `id`, nombre, distrito, dirección principal, `mapQuery`
y al menos un horario. No hay IDs repetidos ni grupos cuyo campo `distrito`
contradiga el archivo que los contiene.

## Slugs y nombres repetidos

Los IDs V1 son candidatos a slug y ya son globalmente únicos. Existen dos pares
de nombres repetidos entre distritos que deben conservarse como grupos distintos:

| Nombre normalizado | Distrito 2           | Distrito 4              | Slugs V2 requeridos                              |
| ------------------ | -------------------- | ----------------------- | ------------------------------------------------ |
| Serenidad          | `serenidad`          | `serenidad-d4`          | `serenidad-d2`, `serenidad-d4`                   |
| Valor para cambiar | `valor-para-cambiar` | `valor-para-cambiar-d4` | `valor-para-cambiar-d2`, `valor-para-cambiar-d4` |

Los dos slugs de Distrito 2 cambian respecto al ID V1 para cumplir la decisión
permanente de incluir distrito en nombres repetidos. La inspección del frontend
actual solo encontró estos IDs como valores internos y keys de React dentro del
directorio; no se encontraron rutas, anchors ni enlaces públicos construidos con
ellos. La migración del frontend debe volver a comprobar este contrato.

## Horarios

Hay **73 bloques de horario**; 21 grupos tienen más de uno. El modelo debe
conservar el arreglo completo y nunca reducirlo a un único horario.

El análisis inicial encontró un bloque que el parser no soportaba:

- `un-nuevo-sendero` (Distrito 1): “Lunes a Domingo (excepto sábado)”,
  18:30–20:00.

La expresión contiene una excepción explícita y se transforma de manera
determinista a `[1, 2, 3, 4, 5, 7]`. La regla quedó implementada y probada; los
73 bloques producen estructura sin descartes. En todos los casos se preserva el
texto V1 completo en `scheduleText`.

## Transformación propuesta

Cada grupo se transforma a los campos existentes del schema local:

- `name`: `nombre`, sin correcciones editoriales silenciosas.
- `slug`: ID V1, salvo las dos desambiguaciones aprobadas anteriores.
- `district`: relación obligatoria resuelta por número contra los cuatro
  registros reales de `districts`; no hardcodear IDs de PocketBase.
- `location`: dirección V1 más `mapQuery`, preservando cadenas existentes.
- `schedules`: todos los horarios estructurados.
- `scheduleText`: representación completa de todos los horarios V1.
- `notes`: `null`; V1 no aporta este campo.
- `isActive`: `true`. La decisión fue aprobada el 2026-10-26 para los 43 grupos
  actualmente publicados en el directorio V1.

El script debe validar exactamente 43 grupos, distribución 9/10/13/11, distritos
1/2/4/5, slugs únicos, relaciones resueltas y cero horarios descartados. Un
distrito ausente, duplicado o no aprobado debe bloquear el plan.

## Riesgos antes del dry-run

- Mantener probada la compatibilidad de los dos cambios de slug con el frontend.
- Mantener probada la expresión con excepción de sábado y la preservación del texto.
- Tratar `null` y texto vacío como equivalentes para `notes` y `scheduleText`,
  siguiendo la normalización observada en PocketBase.
- Paginar tanto `districts` como `groups`; detectar colisiones cruzadas entre
  slug, fuente y destino.
- Dry-run por defecto, sin autenticación ni métodos de escritura. `--apply`
  requiere un nuevo dry-run remoto, revisión y autorización explícita.

## Mejoras posibles para V2.1

Estas mejoras no bloquean ni invalidan los 43 grupos migrados:

- Editor administrativo de horarios que evite manipular JSON directamente.
- Auditoría editorial de direcciones, referencias y consultas de mapas.
- Campo `legacyId` en PocketBase si se desea trazabilidad independiente de los
  archivos V1 conservados.
- Rutas públicas de grupos y aliases/redirecciones si en el futuro los slugs
  forman parte de URLs compartidas.
- Historial de cambios o responsable de la última revisión de cada grupo.

## Retiro del fallback runtime — 2026-11-02

El directorio recibe los 43 grupos desde la DAL y ya no importa JSON si la
respuesta está vacía. En ese caso presenta un estado vacío explícito. Los cuatro
JSON se conservan como entrada de `scripts/migrate-groups.mjs`, no como fuente de
presentación. La distribución, horarios, relaciones y slugs se verificaron antes
del retiro; el usuario confirmó el Preview para avanzar al punto 2.
