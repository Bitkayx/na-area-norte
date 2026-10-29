# Análisis de Literatura

Revisión: **2026-10-29**. Fuente V1: `src/data/inventory.json`;
consumidor: `src/pages/servicios/literatura.astro` y
`src/components/InventoryTable.tsx`.

## Inventario V1

- 161 filas en nueve categorías: Libros NA (13), Folletos/Tarjetas/Volantes NA
  (20), Carteles NA (35), Audio/Video NA (3), Libros AA (25), Revistas
  Plenitud (5), Folletos AA (52), Carteles AA (6), Audio/Video AA (2).
- 14 filas tienen código vacío o nulo; hay 134 códigos distintos no vacíos.
- Diez códigos aparecen en más de una fila: seis llevan sufijo numérico y cuatro
  ya son códigos genéricos. Decisión de transformación: para un código repetido
  con sufijo numérico, usar su prefijo alfabético (`NAL009` → `NAL`, `NAC022` →
  `NAC`, `AAPL000` → `AAPL`); mantener sin cambios los códigos ya genéricos, los
  códigos únicos y los 14 vacíos. El schema no hace único `code`.
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
- 125 filas contienen `quantity`; 36 no. `quantity` se transforma en el campo
  opcional `stock`; cuando falta en V1, el migrador asigna 1. El campo es
  entero, mínimo 0. `total` se deriva
  como `price × stock` y no se guarda en PocketBase. Tres `total` V1 no coinciden
  con esa fórmula: Oración de la Serenidad (Grande), Doce Pasos y Doce Tradiciones,
  y Plan Nacional de AA. Se ignora el valor previo de `total`.
- El inventario trae categoría como texto. Las nueve categorías se crean con sus
  nombres exactos de V1 y orden de aparición; cada producto se relaciona por
  coincidencia exacta. El migrador rechaza nombres o relaciones ambiguas.
- No hay títulos repetidos dentro de una misma categoría en el origen. La
  identidad de reconciliación es título + categoría; una repetición futura en V1
  o en el destino detiene el migrador con conflicto.

## Modelo y consumidores

El modelo DAL tiene `code` opcional no único, `title`, `price`, `stock` opcional,
`isActive` y relación requerida `category`. El DAL calcula `total` a partir de
precio y stock. La página de Literatura aún importa el JSON V1 directamente.
ADR-003 declara stock opcional.

PocketBase guarda los campos Number como no nulos y usa 0 si no se envía un
valor ([documentación de campos](https://pocketbase.io/docs/collections/)). Por
eso el migrador envía 1 cuando V1 no incluye cantidad, pero un producto futuro
creado desde el administrador sin stock quedaría en 0; garantizar default 1 en
altas futuras requiere definir un flujo adicional.

El 2026-10-29 se autorizó y aplicó un PATCH que añadió solo `literature.stock`
(NumberField opcional, entero, mínimo 0). La inspección posterior confirmó el
campo; se conservaron los demás campos, índices y access rules. No se hizo otro
cambio de schema. `node --env-file=.env scripts/migrate-literature-schema.mjs`
posterior reportó `stock` con el contrato esperado (sin PATCH).

## Pendiente / siguiente subetapa

La preparación local está implementada en `scripts/migrate-literature.mjs`;
`node tests/migrate-literature.test.mjs` pasó 7 casos; el nuevo migrador de
schema pasó 4/4, TypeScript compiló y `node tests/dal.test.ts` pasó 42/42.
`PUBLIC_POCKETBASE_URL= ./node_modules/.bin/astro build` completó 32 páginas;
Reflexiones registró errores de DNS hacia Google Sheets, fuente externa a
PocketBase. Tras añadir `stock`, el dry-run remoto autenticado del 2026-10-29
propuso 9 categorías y 161 productos, todos CREATE, 0 updates y 0 conflictos.
13 códigos se transforman a prefijo genérico; 36 filas defaultan stock a 1; se
ignoran 3 totales V1 discrepantes. No se escribieron registros.

## Siguiente subetapa: revisión y autorización de datos

Revisar el dry-run actual: 9 categorías y 161 productos CREATE, 0 updates y 0
conflictos; confirma la regla de códigos genéricos por prefijo alfabético y que
los 161 productos deben quedar activos. Para esos registros, faltantes de stock
se convierten en 1 y `total` no se guarda. Se requiere autorización explícita
posterior a esta revisión antes de ejecutar `node --env-file=.env
scripts/migrate-literature.mjs --apply`. El default de stock para futuras altas
administrativas sigue pendiente; PocketBase da 0 a un NumberField omitido.

No existe todavía una migración V1 de Literatura; PocketBase está vacío para
estas colecciones. No se realizaron escrituras en esta revisión.
