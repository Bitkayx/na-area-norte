# Análisis de Literatura

Revisión local: **2026-10-26**. Fuente V1: `src/data/inventory.json`;
consumidor: `src/pages/servicios/literatura.astro` y
`src/components/InventoryTable.tsx`.

## Inventario V1

- 161 filas en nueve categorías: Libros NA (13), Folletos/Tarjetas/Volantes NA
  (20), Carteles NA (35), Audio/Video NA (3), Libros AA (25), Revistas
  Plenitud (5), Folletos AA (52), Carteles AA (6), Audio/Video AA (2).
- 14 filas tienen código vacío o nulo; hay 134 códigos distintos no vacíos.
- Diez códigos aparecen en más de una fila (`NAL009`, `NAC`, `NAC022`, `NAC010`,
  `NAC012`, `NAC011`, `AAL`, `AAPL000`, `AAF`, `AAC`). Algunos son códigos
  genéricos y otros parecen reutilizados entre títulos distintos. No corregir ni
  fusionar sin revisión de la fuente editorial.
- Detalle para revisión editorial:
  - `NAL009`: Compendio de acuerdos de asamblea / Manual de información al público.
  - `NAC`: Atrévete a vivir (cartel para grupo) / Atrévete a vivir para jóvenes IP.
  - `NAC022`: Búsquenos para grupo color verde / Yo soy responsable instituciones correccionales.
  - `NAC010`, `NAC011`, `NAC012`: cada uno aparece en la versión “Enunciado de…”
    y en la versión completa de Tradiciones, Pasos y Conceptos, respectivamente.
  - `AAL`: Libro de trabajo de correccionales / Nuestra gran responsabilidad.
  - `AAPL000`: Plenitud compendio #5 / #10 / Criterios profesionales.
  - `AAF`: cuatro folletos con el mismo prefijo genérico.
  - `AAC`: Fotografía de Bill W. / Fotografía del Dr. Bob.
- Los 14 registros sin código son: Historia de NA; Programa Nacional de Estudio
  de la Literatura; Volante para I.P. Semáforo; Estados Emocionales CH y GDE;
  II Convención Guadalajara; Libro Azul AA de Bolsillo; Manual de Servicio y
  los 12 Conceptos; Plenitud Compendio #1; A.A. en las Instituciones
  Correccionales; El miembro de A.A., los medicamentos y otras drogas; Guía de
  Funcionamiento del Política y Admon.; Declaración de la Unidad; Yo soy
  Responsable.
- 125 filas contienen `quantity` y `total`; 36 no los contienen. La tabla pública
  solo muestra descripción, código y precio. No está determinado qué significan
  esas cantidades; `total` es derivable y no forma parte del modelo V2.
- El inventario trae categoría como texto. V2 relaciona cada registro a una
  categoría independiente; no se debe asignar por aproximación si el nombre no
  coincide exactamente.
- No hay títulos exactamente repetidos dentro de una misma categoría; título
  más categoría puede servir como clave de reconciliación, sujeto a verificar
  conflictos remotos.

## Modelo y consumidores

El tipo DAL `Literature` y `scripts/create-schema.mjs` describen `code` opcional,
`title`, `price`, `isActive` y relación requerida `category`; no hay campo de
stock. El repositorio DAL pagina todos los registros activos y expande categoría,
pero la página de Literatura aún importa el JSON V1 directamente. El ADR-003
deja `stock?` como pregunta, no como decisión aprobada.

La inspección autenticada y de solo lectura del 2026-10-26 confirmó que las
colecciones remotas `categories` y `literature` existen con esos campos,
relación e índices; lectura pública, escritura cerrada. La lectura autenticada
de registros confirmó ambas colecciones vacías (0 categorías, 0 productos). No
se realizaron escrituras.

## Pendiente / siguiente subetapa

La preparación local está implementada en `scripts/migrate-literature.mjs`;
`node tests/migrate-literature.test.mjs` pasó 5 casos. El dry-run remoto
de solo lectura del 2026-10-26 propuso 9 categorías y 161 productos, todo CREATE,
sin conflictos. `quantity` y `total` no aparecen en payloads; códigos vacíos se
representan como `null`, y el resto se conserva tal como está.

## Siguiente subetapa: revisión humana

Antes de autorizar cualquier escritura, la persona responsable debe revisar los
códigos duplicados/genéricos y los 14 códigos ausentes detallados arriba,
confirmar que no se deben corregir ni deduplicar, y confirmar que los 161 precios
publicados deben quedar activos. Luego revisar el plan de dry-run completo.
Solo después de esa revisión se solicitará autorización explícita para `--apply`.
No se realizaron escrituras.

No existe todavía una migración V1 de Literatura; PocketBase está vacío para
estas colecciones. No se realizaron escrituras en esta revisión.
