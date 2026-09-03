# ADR-002 - PocketBase

## Status

Accepted

## Date

2026-08-10

## Context

Actualmente se tiene que crear un markdown en el codigo, subir ese md mediante GitHub y lanzar un deploy a main para que se lance una actualizacion.

Se propone crear un panel de administracion con PB para que un usuario no tecnico pueda tener el control del contenido que se sube al blog y a la web misma.

## Decision

Migrar el contenido operativo a PocketBase.

## Consecuencias

### Positivas

- Usuarios no técnicos pueden administrar contenido.
- El contenido deja de depender de Git.
- El frontend queda desacoplado del almacenamiento.

### Negativas

- Se agrega infraestructura.
- El frontend depende de un servicio externo.

## Alternativas a considerar

### Headless CMS

Posible alternativa pero se selecciono PB porque provee un backend ligero y auto-hosteable para este proyecto.

### Full custom backend

Rechazado porque introduce desarrollo y mantenimiento innecesarios
para las necesidades actuales del proyecto.

## Scope

PocketBase será utilizado como backend/CMS para el contenido operativo
que actualmente depende de Markdown, JSON y contenido hardcodeado.

No todo el contenido del sitio será necesariamente migrado a PocketBase.
Las decisiones se tomarán entidad por entidad de acuerdo con las
necesidades del dominio.
