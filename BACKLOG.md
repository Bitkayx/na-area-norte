# NA Área Norte — V2 Architecture & CMS

> [!info] Objetivo
> Evolucionar NA Área Norte desde una arquitectura estática dependiente de Git/Markdown/JSON hacia una arquitectura desacoplada donde el contenido sea administrable por usuarios no técnicos mediante PocketBase, manteniendo Astro como frontend y Vercel como plataforma de despliegue.

---

## Contexto

### V1

La aplicación actualmente utiliza:

- Astro como frontend.
- Markdown para publicaciones.
- JSON para información de grupos y otros datos.
- Assets locales dentro del repositorio.
- GitHub como fuente de verdad del código y contenido.
- Vercel para el deployment.

### Problema

Para modificar contenido es necesario:

1. Modificar Markdown/JSON.
2. Conocer la estructura del proyecto.
3. Hacer commit.
4. Hacer push.
5. Esperar el deployment.

Esto hace que la organización dependa de una persona con conocimientos técnicos.

### Objetivo V2

Separar:

```text
Código
  ↓
GitHub

Contenido
  ↓
PocketBase
```

Permitiendo que una persona sin conocimientos técnicos pueda administrar:

- Noticias.
- Grupos.
- Distritos.
- Horarios.
- Eventos.
- Materiales/literatura.
- Configuración del sitio.

---

# Arquitectura V2

```text
                         Usuario
                            │
                            ▼
                    ┌───────────────┐
                    │     Astro     │
                    │  Presentation  │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │   Services    │
                    │     / DAL     │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  PocketBase   │
                    │      API      │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ SQLite / Data │
                    └───────────────┘
                            │
                            ▼
                         Railway


PocketBase
    │
    │ Webhook
    ▼
  Vercel
    │
    ▼
 Nuevo Build
    │
    ▼
 Sitio actualizado
```

---

# Principios arquitectónicos

- [ ] Separation of Concerns.
- [ ] Single Responsibility Principle.
- [ ] Layered Architecture.
- [ ] Data Access Layer (DAL).
- [ ] Bajo acoplamiento.
- [ ] Alta cohesión.
- [ ] Single Source of Truth.
- [ ] Domain-oriented modeling.
- [ ] Separación entre código y contenido.
- [ ] Infraestructura reemplazable.

---

# Épica 1 — Infraestructura de PocketBase

**Objetivo:** Tener una instancia persistente de PocketBase funcionando en Railway.

### Tareas

- [x] Crear branch `feature/26.7`.
- [x] Crear `Dockerfile`.
- [x] Configurar PocketBase.
- [x] Crear deployment en Railway.
- [x] Configurar volumen persistente.
- [x] Crear superusuario.
- [ ] Documentar configuración de Railway.
- [ ] Documentar configuración del volumen.
- [ ] Documentar procedimiento de recuperación.
- [ ] Definir estrategia de backups.

### Entregable

PocketBase funcionando en Railway con almacenamiento persistente.

---

# Épica 2 — Modelado del dominio

**Objetivo:** Definir las entidades del negocio antes de implementar la base de datos.

### Entidades

- [ ] `districts`
- [ ] `groups`
- [ ] `schedules`
- [ ] `posts`
- [ ] `events`
- [ ] `literature`
- [ ] `site_settings`

### Tareas

- [ ] Analizar todos los JSON existentes.
- [ ] Analizar todos los Markdown existentes.
- [ ] Identificar entidades.
- [ ] Identificar Value Objects.
- [ ] Identificar relaciones.
- [ ] Identificar campos obligatorios.
- [ ] Identificar campos opcionales.
- [ ] Identificar datos derivados.
- [ ] Identificar datos que no deben migrarse.
- [ ] Crear ERD.
- [ ] Revisar el modelo antes de implementarlo.

### Decisiones

- [ ] Definir si `schedules` será colección independiente.
- [ ] Definir relaciones `district → groups`.
- [ ] Definir relación `groups → events`.
- [ ] Definir relación `districts → posts`.
- [ ] Definir estructura de `site_settings`.
- [ ] Definir estrategia para archivos/media.
- [ ] Definir estrategia para Rich Text.

### Entregable

Modelo de dominio V2 aprobado.

---

# Épica 3 — Diseño de PocketBase

**Objetivo:** Convertir el modelo de dominio en colecciones reales de PocketBase.

### Collections

- [ ] Crear `districts`.
- [ ] Crear `groups`.
- [ ] Crear `schedules`.
- [ ] Crear `posts`.
- [ ] Crear `events`.
- [ ] Crear `literature`.
- [ ] Crear `site_settings`.

### Campos

- [ ] Configurar campos requeridos.
- [ ] Configurar campos opcionales.
- [ ] Configurar campos únicos.
- [ ] Configurar relaciones.
- [ ] Configurar archivos.
- [ ] Configurar fechas.
- [ ] Configurar booleanos.
- [ ] Configurar Rich Text.

### API Rules

- [ ] Definir List Rules.
- [ ] Definir View Rules.
- [ ] Definir Create Rules.
- [ ] Definir Update Rules.
- [ ] Definir Delete Rules.
- [ ] Probar acceso público.
- [ ] Probar acceso administrativo.

### Entregable

PocketBase representa correctamente el dominio del negocio.

---

# Épica 4 — Capa de acceso a datos

**Objetivo:** Evitar que las páginas de Astro dependan directamente de PocketBase.

## Arquitectura

```text
Pages
  ↓
Services
  ↓
PocketBase Client
```

## Estructura propuesta

```text
src/

├── lib/
│   └── pocketbase.ts
│
├── services/
│   ├── posts.ts
│   ├── groups.ts
│   ├── schedules.ts
│   ├── events.ts
│   ├── literature.ts
│   └── settings.ts
│
└── types/
    ├── post.ts
    ├── group.ts
    ├── schedule.ts
    ├── event.ts
    ├── literature.ts
    └── settings.ts
```

### Tareas

- [ ] Crear cliente PocketBase.
- [ ] Configurar variables de entorno.
- [ ] Crear tipos TypeScript.
- [ ] Crear `posts.ts`.
- [ ] Crear `groups.ts`.
- [ ] Crear `schedules.ts`.
- [ ] Crear `events.ts`.
- [ ] Crear `literature.ts`.
- [ ] Crear `settings.ts`.
- [ ] Definir funciones de consulta.
- [ ] Definir manejo de errores.
- [ ] Definir estrategia de validación.

### Principio

Las páginas no deben hacer:

```ts
pb.collection("posts").getList(...)
```

Deben hacer:

```ts
postsService.getAll();
```

### Entregable

DAL funcional y desacoplada de la presentación.

---

# Épica 5 — Integración de Astro

**Objetivo:** Cambiar Astro para consumir los servicios de la V2.

### Posts

- [ ] Reemplazar `getCollection("blog")`.
- [ ] Implementar listado de posts.
- [ ] Implementar post individual.
- [ ] Implementar tags.
- [ ] Implementar fechas.
- [ ] Implementar imágenes.
- [ ] Implementar contenido Rich Text.

### Groups

- [ ] Reemplazar JSON de grupos.
- [ ] Implementar listado.
- [ ] Implementar filtros por distrito.
- [ ] Implementar horarios.
- [ ] Implementar direcciones.
- [ ] Implementar `mapQuery`.

### Events

- [ ] Integrar eventos desde PocketBase.
- [ ] Implementar listado.
- [ ] Implementar detalle.
- [ ] Implementar imágenes.

### Literature

- [ ] Integrar catálogo.
- [ ] Implementar categorías.
- [ ] Implementar precios.
- [ ] Implementar disponibilidad.

### Site Settings

- [ ] Reemplazar configuración estática.
- [ ] Integrar logo.
- [ ] Integrar información de contacto.
- [ ] Integrar redes sociales.

### Entregable

El frontend funciona consumiendo PocketBase.

---

# Épica 6 — Migración de datos

**Objetivo:** Migrar automáticamente el contenido existente de V1 hacia V2.

## Posts

- [ ] Analizar frontmatter actual.
- [ ] Crear parser de Markdown.
- [ ] Mapear `title`.
- [ ] Mapear `slug`.
- [ ] Mapear `description`.
- [ ] Mapear `author`.
- [ ] Mapear `pubDate`.
- [ ] Mapear `tags`.
- [ ] Mapear imágenes.
- [ ] Mapear contenido.
- [ ] Definir estrategia para videos.
- [ ] Crear script de migración.
- [ ] Ejecutar migración.
- [ ] Validar cantidad de posts.
- [ ] Validar contenido.
- [ ] Validar imágenes.

## Groups

- [ ] Leer todos los JSON de `src/data/grupos`.
- [ ] Convertir distritos.
- [ ] Convertir grupos.
- [ ] Convertir direcciones.
- [ ] Convertir horarios.
- [ ] Convertir `mapQuery`.
- [ ] Crear script de migración.
- [ ] Validar cantidad de grupos.
- [ ] Validar relaciones.

## Literature

- [ ] Leer `inventory.json`.
- [ ] Mapear productos.
- [ ] Mapear categorías.
- [ ] Mapear precios.
- [ ] Mapear cantidades.
- [ ] Revisar si `quantity` representa inventario real.
- [ ] Definir modelo final.
- [ ] Crear script de migración.
- [ ] Validar registros.

### Entregable

Todos los datos existentes de V1 existen correctamente en PocketBase.

---

# Épica 7 — Eliminación de fuentes antiguas

**Objetivo:** PocketBase se convierte en la única fuente de verdad.

### Tareas

- [ ] Confirmar que Posts funcionan desde PocketBase.
- [ ] Confirmar que Groups funcionan desde PocketBase.
- [ ] Confirmar que Events funcionan desde PocketBase.
- [ ] Confirmar que Literature funciona desde PocketBase.
- [ ] Confirmar que Settings funciona desde PocketBase.
- [ ] Eliminar Markdown migrados.
- [ ] Eliminar JSON migrados.
- [ ] Eliminar loaders antiguos.
- [ ] Eliminar código muerto.
- [ ] Ejecutar build completo.
- [ ] Ejecutar pruebas manuales.

### Entregable

El repositorio contiene código, no contenido operativo.

---

# Épica 8 — Automatización de deployments

**Objetivo:** Un cambio en PocketBase actualiza automáticamente el sitio.

### Flujo

```text
Administrador
     ↓
PocketBase
     ↓
Webhook
     ↓
Vercel Deploy Hook
     ↓
Astro Build
     ↓
Sitio actualizado
```

### Tareas

- [ ] Crear Vercel Deploy Hook.
- [ ] Configurar webhook en PocketBase.
- [ ] Probar creación de post.
- [ ] Probar edición de post.
- [ ] Probar eliminación de post.
- [ ] Probar edición de grupo.
- [ ] Medir tiempo de actualización.
- [ ] Documentar comportamiento esperado.

### Entregable

Los administradores pueden actualizar el sitio sin tocar GitHub.

---

# Épica 9 — Seguridad

**Objetivo:** Separar claramente contenido público y operaciones administrativas.

### Tareas

- [ ] Revisar API Rules.
- [ ] Probar acceso anónimo.
- [ ] Probar acceso administrativo.
- [ ] Revisar permisos de archivos.
- [ ] Revisar variables de entorno.
- [ ] No exponer credenciales.
- [ ] Revisar CORS si aplica.
- [ ] Revisar endpoints públicos.
- [ ] Definir política de usuarios.
- [ ] Definir estrategia de recuperación de cuenta.

### Futuro

- [ ] Roles de administrador.
- [ ] Editor.
- [ ] Coordinador.
- [ ] Permisos por colección.

### Entregable

Modelo de seguridad documentado.

---

# Épica 10 — Backups y recuperación

**Objetivo:** Evitar pérdida de información.

### Tareas

- [ ] Investigar backup de PocketBase.
- [ ] Definir frecuencia.
- [ ] Definir destino de backups.
- [ ] Probar restauración.
- [ ] Documentar recuperación.
- [ ] Definir retención.
- [ ] Definir responsable.

### Entregable

Procedimiento de backup y recovery probado.

---

# Épica 11 — Experiencia del administrador

**Objetivo:** Hacer que PocketBase sea utilizable por una persona sin conocimientos técnicos.

### Tareas

- [ ] Revisar nombres de campos.
- [ ] Revisar labels.
- [ ] Revisar campos obligatorios.
- [ ] Revisar ayudas/descripciones.
- [ ] Revisar orden de campos.
- [ ] Crear ejemplos.
- [ ] Revisar flujo de creación de post.
- [ ] Revisar flujo de creación de grupo.
- [ ] Revisar flujo de creación de evento.
- [ ] Revisar subida de imágenes.

### Criterio de aceptación

Una persona que no conoce Git, GitHub, Astro, JavaScript ni Markdown debe poder publicar y modificar contenido siguiendo la guía.

### Entregable

Panel administrativo listo para usuarios no técnicos.

---

# Épica 12 — Documentación

**Objetivo:** Que el proyecto pueda mantenerse sin depender del desarrollador original.

## Documentación técnica

- [ ] Arquitectura V2.
- [ ] ERD.
- [ ] Diagrama de arquitectura.
- [ ] Estructura del proyecto.
- [ ] ADR: migración V1 → V2.
- [ ] ADR: elección de PocketBase.
- [ ] ADR: elección de Railway.
- [ ] ADR: elección de Vercel.
- [ ] ADR: separación entre presentación y acceso a datos.
- [ ] Guía de desarrollo.
- [ ] Guía de deployment.
- [ ] Guía de backup.
- [ ] Guía de recovery.

## Manual del administrador

- [ ] Login.
- [ ] Crear noticia.
- [ ] Editar noticia.
- [ ] Subir imágenes.
- [ ] Crear grupo.
- [ ] Editar grupo.
- [ ] Editar horarios.
- [ ] Crear evento.
- [ ] Editar catálogo.
- [ ] Cambiar información del sitio.
- [ ] Publicar/despublicar contenido.

### Entregable

Una persona no técnica puede administrar el sitio sin ayuda del desarrollador.

---

# Épica 13 — Producto reutilizable

**Objetivo:** Convertir NA Área Norte V2 en una base reutilizable para otras áreas.

### Tareas

- [ ] Identificar configuración específica de Área Norte.
- [ ] Separar configuración de código.
- [ ] Crear `site_settings`.
- [ ] Eliminar valores hardcodeados.
- [ ] Revisar rutas.
- [ ] Revisar branding.
- [ ] Revisar textos.
- [ ] Revisar datos geográficos.
- [ ] Crear procedimiento para una nueva instalación.
- [ ] Crear plantilla de configuración.
- [ ] Documentar onboarding de una nueva área.

### Futuro

```text
NA Área Norte
      │
      ├── V2
      │
      ├── Nueva Área
      │
      ├── Nueva Área
      │
      └── Nueva Área
```

### Entregable

Una nueva instalación puede realizarse sin modificar innecesariamente el core del proyecto.

---

# Épica 14 — QA y release V2

**Objetivo:** Validar que la migración no rompió la V1.

### Checklist

- [ ] Home.
- [ ] Noticias.
- [ ] Post individual.
- [ ] Tags.
- [ ] Grupos.
- [ ] Distritos.
- [ ] Horarios.
- [ ] Mapas.
- [ ] Eventos.
- [ ] Literatura.
- [ ] Contacto.
- [ ] Imágenes.
- [ ] Videos.
- [ ] Responsive.
- [ ] Dark mode.
- [ ] SEO.
- [ ] Sitemap.
- [ ] RSS si aplica.
- [ ] 404.
- [ ] Build de producción.
- [ ] Deployment de producción.

### Entregable

Release `V2.0.0`.

---

# Definition of Done — V2

La V2 se considera terminada cuando:

- [ ] Todo el contenido operativo vive en PocketBase.
- [ ] GitHub contiene únicamente código/configuración.
- [ ] Un usuario no técnico puede administrar el contenido.
- [ ] Un cambio en PocketBase puede disparar un nuevo deployment.
- [ ] Astro no depende directamente de PocketBase desde las páginas.
- [ ] Existe una capa de acceso a datos.
- [ ] Los datos V1 fueron migrados automáticamente.
- [ ] Existen backups.
- [ ] Existe procedimiento de recovery.
- [ ] Existe documentación técnica.
- [ ] Existe manual para administradores.
- [ ] Una nueva área puede reutilizar la arquitectura.
- [ ] El proyecto puede mantenerse sin depender permanentemente del desarrollador original.

---

# V1 → V2

## V1

```text
GitHub
  │
  ├── Markdown
  ├── JSON
  ├── Assets
  │
  ▼
Astro
  │
  ▼
Vercel
```

### Característica principal

**Developer-driven content.**

---

## V2

```text
                    GitHub
                      │
                    Code
                      │
                      ▼
                    Astro
                      │
                   Services
                      │
                      ▼
                 PocketBase
                      │
                    Data
                      │
                   Railway

PocketBase
    │
 Webhook
    ▼
 Vercel
    │
    ▼
 Deploy
```

### Característica principal

**User-driven content.**

---

# ADRs pendientes

- [ ] ADR-001 — Migración de V1 a V2.
- [ ] ADR-002 — PocketBase como CMS.
- [ ] ADR-003 — Railway como infraestructura de PocketBase.
- [ ] ADR-004 — Vercel como plataforma de frontend.
- [ ] ADR-005 — Separación entre presentación y acceso a datos.
- [ ] ADR-006 — Modelo de contenido Rich Text vs Markdown.
- [ ] ADR-007 — Schedules como entidad independiente.
- [ ] ADR-008 — PocketBase como Single Source of Truth.
- [ ] ADR-009 — Estrategia de deployment mediante webhook.

---

# Estado actual

## Completado

- [x] Branch `feature/26.7`.
- [x] Dockerfile.
- [x] PocketBase desplegado.
- [x] Railway configurado.
- [x] Volumen persistente.
- [x] Superusuario creado.
- [x] Análisis inicial de V1.
- [x] Definición conceptual de V2.
- [x] Identificación inicial del dominio.

## Siguiente paso

> **Épica 2 — Modelado del dominio**

Antes de crear colecciones en PocketBase:

1. Revisar todos los datos existentes.
2. Finalizar entidades.
3. Definir relaciones.
4. Definir campos.
5. Crear ERD.
6. Documentar decisiones.
7. Después implementar las colecciones.

---

# Regla del proyecto V2

> **No implementar una estructura en PocketBase hasta entender primero qué representa dentro del dominio.**

La base de datos debe representar el negocio, no copiar ciegamente la estructura de los archivos de V1.
