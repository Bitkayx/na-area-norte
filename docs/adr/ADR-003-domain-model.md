# ADR-003 - Domain Model

## Status

Accepted

## Date

2026-08-10

## Context

No existe modelado de datos, existen archivos ts para entender los tipos pero no hay un modelado que defina el como se tienen que comportar las entidades.

## Decision

Se crea el modelado del dominio de las entidades.

## Entidades

                         ┌──────────────┐
                         │   District   │
                         └──────┬───────┘
                                │
                              1 │
                                │ *
                         ┌──────▼───────┐
                         │    Group     │
                         ├──────────────┤
                         │ Address      │
                         │ Schedules[]  │
                         └──────────────┘

┌──────────────┐ ┌──────────────┐
│ Post │ │ Event │
├──────────────┤ ├──────────────┤
│ title │ │ title │
│ body │ │ dates │
│ pubDate │ │ location │
│ cover │ │ organizer │
│ tags │ │ program │
└──────┬───────┘ └──────┬───────┘
│ │
└──────────┬───────────┘
│
▼
Media

┌──────────────┐
│ Literature │
├──────────────┤
│ code │
│ title │
│ price │
│ category │
│ stock? │
└──────────────┘

┌─────────────────┐
│ RadioBroadcast │
├─────────────────┤
│ week │
│ districtId │
│ time │
│ link │
└─────────────────┘

┌──────────────┐
│ Reflexion │
├──────────────┤
│ day/date │
│ title │
│ videoUrl │
└──────────────┘

┌──────────────┐
│ SiteSettings │
├──────────────┤
│ identity │
│ contact │
│ SEO │
│ social │
│ hero │
└──────────────┘

## Consecuencias

### Positivas

- Menor acoplamiento.
- Las entidades ahora cuentan con un modelo de dominio explicito que define su proposito, relaciones, atributos y restricciones.

### Negativas

- Se tiene que ver como estan estructuradas las entidades para entender de primera mano antes de modificar o crear alguna nueva.

### Entidades fuera del alcance actual

`Reflexion` forma parte del dominio identificado, pero permanecerá
fuera de PocketBase durante esta fase.

La fuente actual continuará siendo Google Sheets.

Su migración podrá evaluarse posteriormente.
