# ADR-001 - Migracion de v1 a v2

## Status

Accepted

## Date

2026-08-09

## Context

La v1 utiliza Markdown y JSON como fuente de contenido.

Esto obliga a realizar cambios mediante Git y requiere conocimientos tecnicos.

El objetivo del proyecto es permitir que personas sin conocimientos tecnicos puedan administrar el contenido.

## Decision

Migrar el contenido operativo a PocketBase.

Astro continuara siendo el responsable de la presentacion.

La comunicacion entre Astro y PocketBase se realizara mediante una capa de servicios / Data Access Layer.

## V1

```text
GitHub
 ├── Markdown
 ├── JSON
 └── Assets
       ↓
     Astro
       ↓
    Vercel
```

## V2

```text
GitHub
   ↓
 Astro
   ↓
 Services
   ↓
 PocketBase
   ↓
 Railway
```

PocketBase sera la fuente de verdad para el contenido operativo.

## Consecuencias

### Positivas

- Usuarios no técnicos pueden administrar contenido.
- El contenido deja de depender de Git.
- El frontend queda desacoplado del almacenamiento.
- La arquitectura puede reutilizarse para otras áreas.

### Negativas

- Se agrega infraestructura.
- Se requiere gestionar backups.
- El frontend depende de un servicio externo.
- La migración requiere scripts y validación.

## Alternativas a considerar

### Continuar usando MD/JSON

Rechazado porque no resuelve el problema de la administracion del contenido.

### Headless CMS

Posible alternativa pero se selecciono PB porque provee un backend ligero y auto-hosteable para este proyecto.

### Full custom backend

Rechazado porque introduce desarrollo innecesario y mantenimiento complejo.
