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

La inspección autenticada y de solo lectura del 2026-10-29 confirmó que las
colecciones remotas `categories` y `literature` existen con sus campos base,
relación e índices actuales; lectura pública, escritura cerrada. La última
lectura de registros fue el 2026-10-26 y encontró ambas colecciones vacías; el
conteo no se repitió el 29 porque el preflight se detuvo al faltar
`literature.stock` en el schema. No se realizaron escrituras.

## Pendiente / siguiente subetapa

La preparación local está implementada en `scripts/migrate-literature.mjs`;
`node tests/migrate-literature.test.mjs` pasó 7 casos; TypeScript compiló y
`node tests/dal.test.ts` pasó 42/42. `PUBLIC_POCKETBASE_URL= ./node_modules/.bin/astro
build` completó 32 páginas; Reflexiones registró errores de DNS hacia Google
Sheets, como fuente externa fuera de PocketBase. La inspección de destino del
2026-10-29 detectó que falta `literature.stock`; el migrador detuvo el dry-run
antes de listar registros y no produjo un plan de datos aplicable. El dry-run de
9 categorías/161 productos del 26 de octubre queda supersedido porque no incluía
stock ni los códigos genéricos.

## Siguiente subetapa: schema y nuevo dry-run

El destino necesita el campo opcional `stock` de tipo número entero, mínimo 0;
el migrador asigna 1 a las 36 filas que carecen de cantidad V1. La relación
`category` sigue requerida y `code` no debe ser único. El schema/access rules de
PocketBase no se han modificado. El dry-run de schema debe limitarse a añadir
ese campo sin cambiar campos, índices ni access rules existentes. Tras su
autorización y alta en el administrador de PocketBase, ejecutar de nuevo el
dry-run autenticado, revisar códigos genéricos, cantidades y los 9/161 payloads,
confirmar que los 161 registros deben quedar activos, y definir cómo garantizar
stock 1 en futuras altas desde el administrador. La escritura de datos requiere
autorización explícita posterior a ese dry-run.

No existe todavía una migración V1 de Literatura; PocketBase está vacío para
estas colecciones. No se realizaron escrituras en esta revisión.
