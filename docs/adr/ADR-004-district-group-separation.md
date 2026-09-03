# ADR-004 - District y Group como entidades independientes

## Status

Accepted

## Date

2026-08-10

## Context

En V1, los archivos JSON ubicados en `src/data/grupos/` contienen
información correspondiente tanto a los distritos como a los grupos.

Algunos registros representan directamente a un distrito, incluyendo
su dirección y, cuando se encuentra disponible, información sobre
sesiones y horarios.

Esto puede generar la interpretación incorrecta de que dichos registros
son grupos.

Sin embargo, conceptualmente un District y un Group representan
entidades diferentes:

- District representa una unidad administrativa del Área.
- Group representa un grupo de reunión perteneciente a un District.

La dirección almacenada en un District representa la ubicación física
del distrito, donde pueden realizarse sesiones o reuniones.

Actualmente no todos los distritos tienen sus sesiones y horarios
registrados en los datos disponibles.

## Decision

Mantener `District` y `Group` como entidades independientes.

`District` tendrá:

- Identificador.
- Número de distrito.
- Nombre.
- Dirección.
- Horarios de sesiones, cuando estén disponibles.
- Relación con sus grupos.

`Group` tendrá:

- Identificador.
- Nombre.
- Referencia al District.
- Dirección.
- Horarios de reunión, cuando estén disponibles.

Actualmente existen únicamente los distritos:

- Distrito 1
- Distrito 2
- Distrito 4
- Distrito 5

No se crearán entidades para los distritos 3 y 6 únicamente porque
aparezcan referencias textuales a ellos en otras fuentes.

## Consequences

### Positivas

- El modelo representa correctamente el dominio.
- Se diferencia una unidad administrativa de un grupo de reunión.
- Se puede administrar la información de sesiones del distrito sin
  convertir al distrito en un grupo.
- Se permite que District y Group tengan horarios independientes.
- La ausencia de horarios puede representar información no disponible
  sin asumir que no existen sesiones.

### Negativas

- El modelo es ligeramente más complejo que tratar todos los registros
  como grupos.
- La migración requiere identificar correctamente los registros que
  representan distritos y los que representan grupos.
- Será necesario validar las referencias a distritos durante la
  migración de Radiodifusión.
