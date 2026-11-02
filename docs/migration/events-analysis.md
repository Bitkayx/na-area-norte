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

## Decisión y pendientes

No hay duplicados en la colección remota porque Events está vacía, y ningún post
está relacionado con Event. Sí hay solapamiento editorial probable entre el
calendario agregado y algunos posts. Antes de crear registros se debe confirmar
qué ocurrencias cuentan como eventos administrables, cuáles son solo reuniones
listadas en el calendario y qué posts anuncian, documentan o reportan cada
ocurrencia. No inferir fechas exactas de `pubDate`, mes de sección, flyers sin
revisión o nombre parecido.

Siguiente etapa: **EVENTS-SCOPE-REVIEW**. Confirmar con el responsable los cinco
posibles cruces anteriores y el alcance de Events frente a reuniones y
compartimientos. Después se puede diseñar un inventario local y un dry-run; aún no
se propone migrar ni relacionar registros.
