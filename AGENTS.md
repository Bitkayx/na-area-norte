# NA Área Norte — Agent Context

## Project

NA Área Norte is a web platform for Área Norte de Neuróticos Anónimos.

The project is being migrated from V1 to V2.

## Current version

V2 — CMS Architecture Migration

## Goal

Move operational content from static Markdown/JSON files into PocketBase while keeping Astro as the frontend.

The goal is to allow non-technical administrators to manage the website without modifying source code.

## Current stack

- Astro
- TypeScript
- Tailwind CSS
- PocketBase
- Railway
- Vercel
- GitHub

## Architecture

```text
User
 ↓
Astro
 ↓
Services / DAL
 ↓
PocketBase API
 ↓
SQLite
 ↓
Railway
```

PocketBase changes trigger Vercel deployments through a webhook

## Architecture principles

- Separate presentation from data access.
- Pages must not access PocketBase directly.
- Use services as the Data Access Layer.
- Keep domain types explicit.
- PocketBase is the source of truth for operational content.
- Avoid duplicating content between GitHub and PocketBase.
- Prefer domain-oriented models over mirroring the old JSON structure.
- Do not introduce unnecessary abstractions.

## Domain

Main entities:

- Districts
- Groups
- Schedules
- Posts
- Events
- Literature
- Site Settings

## V1

V1 stores content in:

- Markdown
- JSON
- Local assets

This content is being migrated to PocketBase.

## V2

GitHub contains:

- Source code
- Configuration
- Documentation
- Migration scripts

PocketBase contains:

- Posts
- Groups
- Districts
- Schedules
- Events
- Literature
- Site configuration
- Uploaded media

## Important rule

Do not implement a PocketBase collection merely by copying an existing JSON structure.

First understand what the data represents in the domain.

## Development rules

- Use TypeScript.
- Keep services independent from UI components.
- Keep business/domain logic outside Astro pages when practical.
- Do not expose secrets.
- Never commit .env files.
- Prefer small, focused changes.
- Do not rewrite unrelated code.
- Preserve existing functionality during migration.
- Run the appropriate checks after changes.

## Migration strategy

V1 → V2 should be incremental.

Do not delete the existing Markdown/JSON sources until the corresponding PocketBase implementation has been validated.

## Current work

The project is currently in:

Épica 2 — Modelado del dominio.

See _BACKLOG.md_ for the complete roadmap.

See _docs/architecture/_ for architectural documentation.

## Agent behavior

Before implementing significant architectural changes:

1. Inspect the existing implementation.
2. Read relevant documentation.
3. Explain the proposed change.
4. Identify affected areas.
5. Implement the smallest appropriate change.
6. Validate the result.

Do not assume the V1 data structure is the correct V2 architecture.
