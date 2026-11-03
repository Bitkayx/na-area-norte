# Análisis de Events

Revisión: **2026-11-02**. Inspección local y lectura pública de PocketBase; no se
modificaron datos, schema ni access rules.

## Modelo y estado

ADR-001/002 fijan PocketBase como fuente de contenido operativo y ADR-003 separa
`Post` (comunicación) de `Event` (ocurrencia con fechas/ubicación); `Post.event` y
`Event.postRef` permiten relación, pero no implican que cada post sea un evento.
El DAL tipa Events con fechas, ubicación, estado y relación opcionales. No existe
una vista pública de Events consumiendo `dal.events`.

Lectura de solo lectura, sin autenticación:

- `GET /api/collections/events/records?perPage=200`: 0 registros.
- `GET /api/collections/posts/records?perPage=200`: 13 posts publicados; ninguno
  tiene relación `event`.
- `GET /api/collections/radio_broadcasts/records?perPage=200`: 4 registros de
  octubre de 2026 (5, 12, 19 y 26), todos a las 13:00. Esta es la rotación mensual
  de participación de radio, no el calendario de Events.

## Fuentes locales y posibles solapamientos

- `src/blog/eventos-areanorte-2026.md` es un post agregado con calendario anual
  por mes y categorías (Evento y Área, Inter Área, Compartimientos y Aniversario,
  Reunión de Delegados). Mezcla eventos y reuniones; no se debe convertir cada
  viñeta automáticamente en Event.
- Hay posts individuales sobre MAVE, Encuentro de Servidores, Congreso Regional,
  Encuentro Regional de Literatura y Asamblea Mexicana. El calendario anual tiene
  entradas de nombre parecido. Posibles coincidencias: MAVE (marzo), Servidores
  (mayo; el post da 17 de mayo), Congreso Regional (julio), Literatura
  (septiembre) y Asamblea (20 de marzo frente a post publicado el 28 de marzo).
  No todas están confirmadas como el mismo evento; fecha de publicación no es
  fecha de ocurrencia.
- Los posts mensuales de invitaciones contienen varios flyers; sus imágenes no
  bastan para crear Events ni recuperar fechas/ubicaciones sin inspección y
  confirmación específicas.
- `src/pages/servicios/eventos.astro` contiene promociones estáticas de Encuentro
  de Servidores y Congreso Regional. A noviembre de 2026, la etiqueta
  “Próximo Evento” para el Encuentro (17 de mayo) está desactualizada. La portada
  de `src/pages/index.astro` enlaza la invitación de agosto de 2026; también es
  una referencia temporal fija que requerirá tratamiento editorial.
- Las consultas locales muestran eventos en Posts y páginas; `dal.events` existe,
  pero la colección vacía no se refleja como fuente de contenido visible.

## Alcance confirmado y preparación local

El responsable confirmó que estos cinco elementos son Events y conforman la
primera ola; cada uno tiene un post correspondiente por slug:

| Event | Fecha de ocurrencia | Fuente local | Estado propuesto |
| --- | --- | --- | --- |
| Nuestra XLII Asamblea Mexicana | 1–4 abril 2026 | Flyer `ASAMBLEA_MEXICANA.jpg` | archived |
| Encuentro Regional de MAVE 2026 | 22 marzo 2026 | `src/blog/mave-2026.md` | archived |
| Encuentro Anual de Servidores 2026 | 17 mayo 2026 | Flyer `encuentro-servidores-2026.jpeg` | archived |
| Congreso Regional 2026 | 26 julio 2026 | Flyer `congreso_regional_2026.jpeg` | archived |
| Encuentro Regional de Literatura 2026 | 13 septiembre 2026 | Flyer `congreso_literatura.jpg` | archived |

Las fechas y ubicaciones visibles en los flyers se transcribieron al seed local;
los campos sin evidencia se dejan vacíos. Los cinco eventos ya pasaron al
2026-11-02. La información transformada está en
[`src/data/events-2026-seed.json`](../../src/data/events-2026-seed.json); el
script es create-only, enlaza por slug y rechaza conflictos.

## Interfaz y evidencia

En `/servicios/eventos`, la tarjeta antigua de “Próximo evento” estaba fija en
Encuentro de Servidores (17 de mayo, ya pasado) y “Próximamente” anunciaba un
Congreso Regional pasado. Se retiraron ambos anuncios y el video asociado de la
página. La interfaz ahora muestra “Próximo evento” solo desde Events activos con
fecha futura; muestra por separado la última publicación etiquetada `eventos`,
excluyendo invitaciones y calendario, sin afirmar que sea futura. Cuando se
registren eventos futuros en PocketBase, su post relacionado será enlazable.

Verificación remota de solo lectura, 2026-11-02:

- `node --env-file=.env scripts/migrate-events.mjs`: 13 posts, 0 Events; cinco
  `CREATE`, 0 `UNCHANGED`, 0 conflictos. No hubo escrituras.
- Tras la autorización explícita, `node --env-file=.env scripts/migrate-events.mjs
  --apply` creó cinco Events. La primera verificación reportó cinco conflictos
  aparentes por el orden de claves en el JSON de `location`; una lectura
  comparativa confirmó que sus valores coinciden. Se hizo la comparación
  insensible al orden de claves (sin cambiar datos) y el test de regresión pasó.
- El dry-run corregido reportó 5 `UNCHANGED`, 0 CREATE y 0 conflictos.
- `node --test tests/migrate-events.test.mjs`: pasó; la salida de Node agrupa
  este archivo como un test.
- `node --test tests/dal.test.ts`: pasó; misma presentación resumida de Node.
- `./node_modules/.bin/tsc -p tests/tsconfig.compile.json`: pasó.
- `./node_modules/.bin/astro build`: generó rutas estáticas, pero una lectura de
  `radio_broadcasts` falló por red durante la build. El entorno no pudo completar
  una build remota integral. No se hizo deploy.
- Repetición autorizada con acceso de red:
  `node --env-file=.env node_modules/astro/astro.js build` completó 48 páginas.
  `dist/servicios/eventos/index.html` muestra “Última publicación de eventos”
  con el post de Literatura y no muestra una tarjeta “Próximo evento” porque
  los cinco registros están archivados. No se hizo deploy.

No se ejecutó `--apply`; los registros no han sido creados. Aún se requiere una
revisión del plan y autorización explícita para esta escritura.

La portada también conserva un enlace temporal a la invitación de agosto 2026;
queda fuera de esta etapa de Events y requiere revisión de noticias por separado.
