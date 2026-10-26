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

La fecha es preferible si el dato de entrada la incluye: evita cálculos de semana
incompatibles y permite mostrar directamente la próxima emisión. Si solo llega
el número de semana, debe usarse `year + week`. Esta decisión puede requerir un
cambio de schema y, por tanto, autorización explícita.

## Flujo previsto

1. Recibir el mensaje mensual.
2. Transcribir únicamente fecha/semana, hora, responsable y enlace informados.
3. Validar responsables contra distritos 1, 2, 4 y 5 o Área Norte.
4. Mostrar un dry-run y revisar duplicados, huecos y datos ambiguos.
5. Solicitar autorización explícita antes de escribir en PocketBase.
6. Verificar los registros y después cambiar el banner para consumir el DAL.

## Pendiente inmediato

Confirmar un ejemplo representativo del formato mensual y elegir identidad por
fecha o por `year + week`. Después se podrá diseñar el capturador y su runbook
sin depender del JSON histórico.
