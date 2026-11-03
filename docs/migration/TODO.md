# Lista de continuación de migración

Fuente operativa para retomar el trabajo después de una pausa o cambio de
sesión. El estado detallado y la evidencia viven en [README](README.md); las
etapas y sus criterios están en [roadmap](roadmap.md). Esta lista no concede
autorizaciones remotas.

## Estado de entrada

- Rama de trabajo: `feature/26.7`.
- Consultar `git log -1` para identificar el checkpoint más reciente.
- Distritos 1, 2, 4 y 5 migrados y verificados.
- 43 grupos migrados y verificados; directorio usa DAL sin fallback runtime.
- Schema de `radio_broadcasts` usa `broadcastDate` requerido y único; `week` ya
  no existe.
- Octubre de 2026 tiene cuatro registros y el dry-run posterior quedó en
  `UNCHANGED`; hora predeterminada `13:00`.
- Las ediciones ordinarias de radio se hacen en la administración de PocketBase.
- Conservar fuentes V1 que usan migradores; no ejecutar cambios de schema sin autorización.

## Siguiente acción

El usuario confirmó que noticias, directorio y literatura se ven bien en el
Preview después de retirar los fallbacks runtime; el reintento de Vercel pasó.
El volumen persistente está montado en `/pb_data`, pero no hay backups. El plan
actual es Free y el usuario no desea pagar por ahora; los backups nativos de
Railway requieren Pro. El usuario decidió revisar esta decisión en V2.1 dentro
de un mes (~2026-12-02); no cambiar plan antes. Siguiente paso
de medios: `invitaciones-octubre` está publicado con cuatro imágenes; el usuario
confirmó el Preview. El build conectado pasó con 49 páginas y renderizó la
galería. La sanitización está implementada. La guía Admin ya incluye capturas
reales del listado, creación, estado y edición de posts. El registro público de
`users` se bloqueó el 2026-11-02 y se verificó; las cuentas existentes y las
demás reglas no cambiaron. El usuario decidió diferir a V2.1 el panel propio con
rol limitado a posts. Véanse la [guía Admin](runbooks/pocketbase-admin.md) y la
[auditoría de medios](media-assets-analysis.md).
En altas nuevas, stock 0 es válido y se captura en PocketBase.
Los cinco Events están verificados y el usuario confirmó que `/servicios/eventos`
se ve bien.

Noticias: la revisión de preview pasó según confirmación del usuario (2026-11-02).
Los Markdown se conservan como entrada de 13 scripts históricos, sin fallback
runtime. Literatura consulta DAL sin fallback JSON; nueve categorías y 161 productos están
migrados y el dry-run quedó `UNCHANGED`. Las altas nuevas deben capturar stock
real explícitamente; 0 es válido cuando no hay existencia.

Cuando llegue un nuevo mensaje mensual de WhatsApp:

1. Confirmar el año explícito.
2. Guardar el texto fuera de Git y ejecutar el parser local:

   ```sh
   node scripts/prepare-radio-schedule.mjs --year AAAA --input /ruta/mensaje.txt
   node --test tests/prepare-radio-schedule.test.mjs
   ```

3. Revisar fechas, responsables, relaciones y que la hora sea `13:00` salvo
   indicación distinta.
4. Ejecutar el dry-run mensual:

   ```sh
   node scripts/migrate-radio-schedule.mjs --year AAAA --input /ruta/mensaje.txt
   ```

5. Compartir el plan y obtener autorización explícita para ese mes.
6. Ejecutar `--apply` solo después de esa autorización.
7. Repetir el dry-run y exigir todos los registros `UNCHANGED`.
8. Ejecutar build local; cuando exista un preview de Vercel autorizado, revisar
   el banner, fecha, responsable y hora.

## Trabajo V2 pendiente

- Noticias: integración y revisión visual completas; Markdown conservado como
  entrada de 13 scripts históricos, sin fallback runtime.
- Literatura: productos en DAL sin fallback JSON; `inventory.json` permanece
  como fuente del migrador; stock 0 aprobado para altas
  nuevas. Schema de `site_settings.literature` aplicado y singleton verificado.
- Events: cinco Events migrados, verificados y revisados visualmente.
- Site settings: singleton creado y verificado; el usuario confirmó el Preview.
  Los posts guardan imágenes en PocketBase; conservar originales externos porque
  no hay backups activos. Videos y PDFs quedan fuera del alcance acordado.
- Frontend: fallbacks runtime de noticias, grupos y literatura retirados; el
  usuario confirmó la revisión del Preview. Preservar fuentes V1 usadas por
  scripts de migración.
- OPS: backups diferidos a V2.1 para revisar dentro de un mes (~2026-12-02).
  El panel propio para editor de posts y los roles de usuarios también se
  difieren a V2.1. Registro público de cuentas cerrado y verificado. Guía visual
  de posts documentada con capturas.

## Propuesta de alcance para V2.1

Esta lista reúne trabajo diferido y nuevas ideas para planear en otra sesión.
No implica autorización para modificar PocketBase, contratar servicios ni
publicar cambios. Confirmar alcance y prioridad antes de iniciar cada etapa.

### Pendientes ya acordados

- **Acceso editorial:** evaluar un panel propio con login y permisos para que una
  persona edite posts sin acceso a schema, reglas u otras colecciones. El Admin
  actual solo permite cuentas superuser; el registro público está cerrado.
- **Backups y recuperación:** revisar opciones y procedimiento alrededor del
  2026-12-02. Railway sigue en plan Free; no cambiar de plan ni infraestructura
  sin una decisión explícita. Definir respaldo, retención y una prueba de
  restauración antes de considerar resuelto el riesgo.
- **Noticias e imágenes:** decidir si hace falta presentar imágenes intercaladas
  con el texto. Hoy se cargan en `posts.bodyImages` y se muestran en una galería
  debajo del cuerpo. Videos y PDFs quedan excluidos, también en contenido
  histórico.
- **Guía de administración:** completar material amigable en español para
  editar grupos y horarios y para crear eventos, además de la guía existente de
  noticias. El usuario planea convertir la guía a PDF/tutorial.

### Nuevos temas propuestos

- **`site_settings` y hero:** revisar el modelo y el formulario de contenido
  dinámico. El hero guardado actualmente conserva `imagen` como ruta local del
  sitio (`/assets/...`), por lo que depende de que ese archivo exista en el
  build del repositorio. Evaluar un flujo de imagen alojada en PocketBase u otra
  fuente administrable y definir fallback, validación y compatibilidad antes de
  cambiar schema o datos.
- **Contador del hero:** el componente `Hero.astro` ya contiene una variante
  con cuenta regresiva; revisar cómo hacer que esa sección pueda configurarse
  desde `site_settings.hero`, qué campos necesita (fecha/hora, zona horaria,
  textos y visibilidad) y qué mostrar cuando el evento inicia o termina. Evitar
  duplicar esos datos en Posts o Events sin una decisión de dominio.
- **Documentación:** evaluar reducir, reorganizar o retirar archivos de `docs/`
  redundantes, vacíos o superados. Primero inventariar enlaces y referencias;
  conservar ADR, runbooks operativos y evidencia que aún sea fuente de verdad.
  No borrar documentos solo por su antigüedad.
- **Análisis del diseño web:** hacer una revisión del sitio completo en desktop y
  móvil, con hallazgos concretos sobre consistencia visual, navegación,
  legibilidad, accesibilidad y estados de carga/error. Proponer prioridades antes
  de rediseñar.
- **Analíticas:** decidir si se necesitan métricas reales de visitas y elegir una
  opción compatible con privacidad, costo y mantenimiento. No inventar ni
  presentar cifras estimadas como actividad real; si se necesitan datos de
  demostración, etiquetarlos claramente como ficticios.

### Orden sugerido para planear

1. Aclarar objetivos y criterios de cierre de cada tema; hacer primero el
   inventario de `docs/` y la revisión visual del sitio, que no requieren cambios
   remotos.
2. Diseñar la solución de `site_settings.hero` y revisar la variante de contador;
   identificar campos/schema actual antes de proponer cambios.
3. Comparar alternativas de analíticas y backups según costo, privacidad y
   operación real.
4. Definir la arquitectura y los permisos del panel editorial; después preparar
   tutoriales para grupos, horarios y eventos.
5. Implementar por etapas pequeñas, con pruebas y revisión. Para toda escritura
   en PocketBase, presentar primero dry-run/alcance y pedir autorización
   explícita posterior.

### Preguntas abiertas para la siguiente sesión

- ¿La imagen del hero debe subirse a PocketBase Admin, o basta con elegir una
  imagen ya cargada en otra colección?
- ¿El contador representa siempre un evento de `Events` o también puede ser una
  campaña independiente? ¿Debe ocultarse al terminar?
- ¿Qué reportes de analíticas necesita el equipo y quién los consultará?
- ¿Qué persona(s) editarán posts y qué acciones exactas podrán hacer?
- ¿Qué contenido de `docs/` consideran útil conservar como referencia histórica?
- ¿La revisión visual debe enfocarse primero en móvil, desktop o ambos por igual?

## Al retomar

Leer `AGENTS.md`, este archivo, `docs/migration/README.md`, `roadmap.md` y el
runbook de la entidad. Ejecutar `git status --short`. No mostrar `.env`, no usar
operaciones destructivas de Git y no asumir que una autorización anterior cubre
otro mes, entidad, schema o deploy.
