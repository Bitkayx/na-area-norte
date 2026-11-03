# Auditoría de medios

Revisión local y verificación remota: **2026-11-02**. Se corrigió el cuerpo del
post de junio y se creó el borrador de octubre. El schema aún no se modificó.

## Decisiones vigentes

- El contenido debe usar imágenes solamente. Videos y PDFs quedan fuera del
  alcance, tanto para contenido histórico como futuro.
- No borrar medios locales hasta identificar y verificar todas sus referencias.
- Propuesta para nuevas imágenes: campo multiarchivo en PocketBase; faltan
  autorización para aplicar el schema y acordar la conservación. Railway Free
  no tiene backups configurados.

## Inventario local

- `src/assets/` y `public/` contienen 129 archivos de imagen raster (57.2 MiB,
  contando archivos por ruta) y no se encontraron PDFs.
- Hay 4 archivos MP4 (32.9 MiB); uno está duplicado en `src/assets/blog` y
  `public/assets/blog`, por lo que son 3 archivos únicos por ruta relativa.
- 63 rutas relativas aparecen tanto en `src/assets/blog` como en
  `public/assets/blog`.
- `package.json` copia `src/assets/blog` a `dist/assets/blog` después de Astro.
  Algunas páginas importan medios desde `src/assets`, el hero configurado apunta
  a `/assets/blog/...` y el cuerpo de posts convierte referencias
  `../assets/...` a `/assets/...`.
- El seed `src/blog/invitaciones-junio-2026.md` tenía dos etiquetas `<video>`;
  se retiraron el 2026-11-02 según la decisión del usuario. Los archivos MP4
  siguen en el repo, pendientes de auditoría de referencias.
- El GET autenticado del 2026-11-02 encontró el cuerpo publicado del post Junio
  como un único `<h1>` con Markdown literal y seis imágenes locales. Se corrigió
  solo `body` en PocketBase a HTML estructurado, sin videos; título, slug y
  seis referencias quedaron iguales. `npm run build` consultó PocketBase y
  generó 48 páginas. La inspección de `dist/noticias/invitaciones-junio-2026/index.html`
  encontró las seis imágenes, sus archivos en `dist`, secciones correctas y
  ningún Markdown literal o video.
- Otras páginas importan imágenes locales, entre ellas Delegado, Fraterna y
  CCCP. No se comprobó cada referencia individual ni se hizo una lista de huérfanos.

## Implicaciones y decisión pendiente

1. El schema remoto de `posts` tiene `cover` (un archivo) y `body` (EditorField);
   no hay un campo multiimagen. El conteo local de los Markdown/HTML de noticias
   encontró un máximo de 14 imágenes en un post. Se preparó `bodyImages`, campo
   file opcional con hasta 20 archivos y MIME `image/avif`, `image/gif`,
   `image/jpeg`, `image/png` e `image/webp`. La página del post conserva el cuerpo
   y presenta las imágenes de ese campo en una galería, en el orden de carga.
   `node --env-file=.env scripts/migrate-post-images-schema.mjs` completó dry-run
   remoto autenticado el 2026-11-02: añadiría ese campo, preservando campos e
   índices y sin enviar reglas. Tras autorización explícita, `--apply` lo añadió;
   la inspección autenticada confirmó `bodyImages: file maxSelect=20` y el dry-run
   posterior devolvió `unchanged`. Las reglas e índices se preservaron. El script
   no imprime secretos.
2. En PocketBase existe el borrador `Invitaciones de Octubre`, slug
   `invitaciones-octubre`, estado `draft`. Se creó el 2026-11-02 con título,
   descripción provisional y cuerpo vacío. El usuario añadió cuatro archivos a
   `bodyImages`; lectura autenticada confirmó estado `draft`, cuatro archivos y
   ningún `<img>`, URI Base64 ni URL de archivo inline en `body`. La página
   presenta automáticamente `bodyImages` como galería debajo del cuerpo, así
   que no hay que relacionar cada archivo manualmente. El usuario completará el
   contenido antes de publicar.
3. PocketBase guarda por defecto los binarios bajo `pb_data/storage`; aquí sería
   `/pb_data/storage` dentro del volumen Railway. No hay backups y el usuario no
   desea pagar por ahora. Si se usan archivos PB como fuente operativa, conservar
   también los originales fuera del volumen hasta acordar una recuperación.
4. Alternativa con metadatos por archivo: colección `post_media` con relación al
   post, archivo, orden, texto alternativo y pie. Da más control y reuso, pero
   hace más laboriosa la carga en Admin. Para la primera prueba se recomienda el
   campo múltiple del propio post.
5. Para el formato actual, revisar una, seis y catorce imágenes como galerías
   después de una introducción, verificando orden, móvil y lectura. Las imágenes
   intercaladas con texto/encabezados quedan para la versión 2.1. Solo imágenes,
   sin videos ni PDFs. Tras completar el post, publicar según decisión editorial,
   ejecutar build estático y revisar Preview.
6. Antes de retirar los MP4 binarios, comprobar referencias en posts actuales y
   páginas; eliminar por antigüedad puede romper contenido. Preferir un informe
   de referencias huérfanas con revisión humana.
7. Mantener imágenes referenciadas disponibles. Un borrado anual por antigüedad
   puede romper noticias y páginas históricas; preferir primero un informe de
   imágenes sin referencias y revisión humana.
8. Opción de menor costo operativo: guardar imágenes versionadas en el repo y
   servirlas con el build estático. Esto requiere commit/deploy para cada alta y
   conservar las referencias históricas.

## Candidato para versión 2.1

Permitir alternar texto e imágenes en el orden editorial del cuerpo, con texto
alternativo y pies por imagen. La versión actual presenta los archivos de
`bodyImages` en una galería debajo del texto; es suficiente para este post si se
usa una introducción general y no se espera asociar cada archivo a un encabezado.

El schema ya contiene el campo multiimagen; el flujo de galería está preparado en
código local. `pnpm build` pasó el 2026-11-02 y generó 48 páginas, pero el post no
apareció porque sigue en `draft` y solo se generan rutas publicadas. El build
registró un aviso de ID duplicado `invitaciones-junio-2026`; no impidió la
compilación. No se hizo deploy ni se borraron binarios locales.

Referencias técnicas: [campos file de PocketBase](https://pocketbase.io/docs/collections/),
[carga, URLs y almacenamiento](https://pocketbase.io/docs/files-handling/) y
[recomendación del mantenedor para imágenes en el editor](https://github.com/pocketbase/pocketbase/issues/3265).
