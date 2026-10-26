# Análisis de radio

Fecha: **2026-10-26**. Esta etapa describe la fuente V1 y las decisiones de
dominio; no acredita lectura ni escritura en PocketBase.

## Decisión operativa

- El calendario de radiodifusión se recibe mensualmente por WhatsApp.
- El calendario V2 comenzará limpio. No se migrarán como programación vigente
  los 52 registros históricos de `src/data/radiodifusion.json`.
- Solo pueden asignarse los distritos existentes **1, 2, 4 y 5**. Distrito 3 y
  Distrito 6 no existen y no deben aparecer como entidades u opciones.
- Área Norte puede ser responsable de una emisión sin convertirse en distrito.
- La captura no debe completar ni inferir datos ausentes del mensaje recibido.

## Inventario local

- `src/data/radiodifusion.json` contiene 52 registros, semanas 1–52 sin huecos
  ni duplicados. Es información histórica, no el lote inicial de V2.
- El archivo mezcla varias formas de nombrar los distritos y contiene etiquetas
  históricas para Distrito 3, Distrito 6, Área Norte y Comité de Área Norte.
- `src/components/WeeklyMotivation.astro` es el único consumidor directo. Se
  monta en `src/layouts/Layout.astro`, por lo que aparece globalmente.
- El componente calcula una semana propia a partir del día del año, busca el
  JSON y muestra siempre `13:00`; no utiliza el campo `hora` de la fuente.
- El DAL ya ofrece consultas por semana y expande la relación opcional con
  distrito. Su contrato actual limita la semana a 1–52.

## Límite del modelo actual

La colección `radio_broadcasts` propuesta identifica cada emisión únicamente
por `week`, con índice único y sin año. Esto impide conservar simultáneamente la
misma semana de años distintos y hace ambigua la transición anual. Antes de
implementar captura o poblar datos se debe decidir una identidad temporal:

1. `year + week`, conservando el concepto semanal actual; o
2. una fecha de emisión, si cada mensaje mensual proporciona la fecha exacta.

El ejemplo real de entrada incluye día y mes, por lo que se adopta **fecha de
emisión** como identidad. Evita cálculos de semana incompatibles y permite mostrar
directamente la próxima emisión. El mensaje no incluye el año: la captura debe
solicitarlo o recibirlo como parámetro explícito y mostrarlo en el dry-run. Esta
decisión requiere revisar el schema antes de cualquier escritura y todo cambio
remoto necesita autorización explícita.

La inspección autenticada y de solo lectura del 2026-10-26 confirmó el schema
remoto: `week` numérico requerido, índice único `idx_radio_week`, campos
opcionales `ownerIsAreaNorte`, `time`, `link`, `note` y relación opcional
`district`; list/view son públicas y create/update/delete no son públicas.

Propuesta mínima para revisión:

- añadir `broadcastDate` como fecha requerida;
- crear un índice único para `broadcastDate`;
- retirar `week` y su índice cuando se confirme que la colección no contiene
  datos que deban conservarse;
- conservar los demás campos y la relación actual;
- actualizar DAL y frontend en el mismo cambio local que acompañe al schema.

## Formato mensual observado

Ejemplo recibido:

```text
5 Oct 1er Dto
12 Oct 4to Dto
19 Oct 5to Dto
26 Oct Área Norte
```

Transformación esperada, una vez confirmado el año:

| Día y mes | Responsable | Relación de distrito |
| --------- | ----------- | -------------------- |
| 5 Oct     | Distrito 1  | Distrito 1           |
| 12 Oct    | Distrito 4  | Distrito 4           |
| 19 Oct    | Distrito 5  | Distrito 5           |
| 26 Oct    | Área Norte  | Ninguna              |

`Dto`, `1er`, `4to` y `5to` son variantes de entrada que se normalizan a los
nombres anteriores. El mensaje no informa hora ni enlace; ambos quedan vacíos,
sin conservar el valor `13:00` hardcodeado por el frontend actual.

## Flujo previsto

1. Recibir el mensaje mensual.
2. Transcribir únicamente fecha/semana, hora, responsable y enlace informados.
3. Validar responsables contra distritos 1, 2, 4 y 5 o Área Norte.
4. Mostrar un dry-run y revisar duplicados, huecos y datos ambiguos.
5. Solicitar autorización explícita antes de escribir en PocketBase.
6. Verificar los registros y después cambiar el banner para consumir el DAL.

## Pendiente inmediato

Diseñar localmente el schema por fecha, el capturador y su runbook. El capturador
debe exigir un año, aceptar las variantes observadas, rechazar responsables no
vigentes y producir un dry-run sin inventar hora o enlace.
