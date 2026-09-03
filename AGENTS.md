# Área Norte — Engineering Context

## Project

Área Norte is a website for the Área Norte organization of Narcotics Anonymous (NA).

The project currently uses Astro and static/local data.

The goal of V2 is to decouple operational content from the source code by introducing PocketBase as a headless backend/CMS.

---

# Versions

## V1

Content is stored directly in the repository.

Examples:

- Markdown files for posts
- JSON files for groups
- JSON file for literature/inventory
- Markdown/calendar data
- Google Sheets for reflections

Content changes require:

1. Modify source files
2. Commit changes
3. Push to GitHub
4. Deploy

This requires technical knowledge.

## V2

Target architecture:

```text
Non-technical user
        │
        ▼
   PocketBase
      CMS
        │
        ▼
     Astro
   presentation
        │
        ▼
      Users
```

PocketBase is responsible for operational content.

Astro is responsible for presentation and application logic.

Architecture Principles
PocketBase is the source of truth for operational content migrated to V2.
Astro must not contain duplicated operational data.
Do not hardcode data that belongs to the domain.
Domain rules must be documented before implementation.
Do not invent missing data.
Preserve existing information during migration.
Prefer explicit domain models over implementation-specific structures.
Keep the frontend decoupled from PocketBase-specific details where practical.
Domain
Area Norte

Área Norte is the top-level organization.

Área Norte is composed of four districts:

District 1
District 2
District 4
District 5

District 3 does NOT exist.

District 6 does NOT exist.

Do not create District 3 or District 6 based on legacy data.

District

A District is an administrative unit within Área Norte.

A District has:

id
number
name
address
schedules
map information
optional description
timestamps

The District address represents the physical location associated with the District.

It is NOT necessarily an "office".

Sessions/reunions may occur at the District location.

A District may have schedules.

The absence of schedules means that schedules are not currently informed. It does NOT mean that the District has no sessions.

Current Districts:

1
2
4
5

Group

A Group is a meeting group belonging to exactly one District.

A Group has:

id / slug
name
districtId
address
schedules
map information
optional notes
active state

Relationship:

District 1 ─────── \* Group

A Group may have multiple schedules.

Schedule

Schedules are structured data.

A schedule contains:

days
startTime
endTime

Days use ISO weekday numbers:

1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
7 = Sunday

Example:

{
"days": [1, 2],
"startTime": "10:00",
"endTime": "11:30"
}

A group can have multiple schedules.

Example:

Monday + Tuesday
10:00 - 11:30

Thursday + Sunday
17:00 - 18:30

Do not model a Group as having only one schedule.

Original V1 schedule text should be preserved during migration when required for traceability.

Group Slugs

Group slugs must be globally unique.

If two groups have the same name but belong to different districts, their slugs must include the district.

Examples:

Serenidad — District 2
serenidad-d2

Serenidad — District 4
serenidad-d4

Valor para Cambiar — District 2
valor-para-cambiar-d2

Valor para cambiar — District 4
valor-para-cambiar-d4

Do not merge groups because they have the same name.

Post

Posts represent communications/news published by Área Norte.

A Post contains:

id / slug
title
description
author
publication date
cover image
body
tags
status
media

The existing Markdown posts must be migrated without losing content.

The existing slug should be preserved where possible.

Do not silently change public URLs.

Event

Events are separate domain entities from Posts.

Posts may contain information about an Event, but an Event should not exist only as unstructured text when its date/location/etc. need to be queried.

Events may contain:

title
slug
type
startDate
endDate
location
organizer
organizerName
description
program
image
status

Event extraction from existing Markdown must be handled carefully because some information is duplicated between:

Markdown posts
annual calendar
hardcoded event pages

Do not create duplicate Events.

Literature

Literature represents the catalog of literature/products.

Fields include:

code
title
price
category
optional stock
active state

Important:

total from V1 is derived data and must NOT be migrated.

Do not invent missing product codes.

Missing codes may remain null until the organization provides the official code.

Duplicate/generic codes require human review.

The meaning of quantity/stock must not be assumed.

RadioBroadcast

RadioBroadcast represents the weekly Área Norte radio schedule.

There are 52 weeks.

Week numbers must remain 1–52 and unique.

A broadcast may belong to:

a District
Área Norte itself

Do not create District 3 or District 6.

Legacy values such as:

Distrito 3
Distrito 6

must be transformed according to the approved migration decision and must not result in fictional District entities.

Área Norte is not a District.

Reflexion

Reflexions currently come from an external Google Sheets source.

They are NOT part of the initial PocketBase migration unless explicitly decided later.

Do not migrate Reflexion automatically.

SiteSettings

SiteSettings represents global website configuration.

Potential content:

identity
contact information
SEO
social links
hero/banner
logo
map information

Operational global content should eventually be editable without modifying source code.

Media

Media may currently exist as:

local Astro assets
public files
remote URLs
videos
external media

Migration must preserve all media references.

Do not delete local assets until the migrated content has been verified.

Large videos require a separate storage strategy.

Tags

Tags should become normalized data instead of uncontrolled strings.

Existing tags must not be silently deleted during migration.

Data Migration Rules

The migration must follow these principles:

Never invent domain data.
Never silently discard existing information.
Preserve public slugs when possible.
Preserve original schedule text for traceability.
Do not migrate derived fields.
Validate migration results.
Human-review ambiguous data.
Do not modify production data without explicit approval.
Migration scripts should be repeatable or safely re-runnable where practical.
Prefer dry-run/analysis modes before destructive operations.
Known V1 Data Issues
Groups
43 real meeting groups
4 District records mixed into the group JSON files
Districts: 1, 2, 4, 5
Group schedule text is currently unstructured
Some group names collide
Literature
161 items
9 categories
Missing codes exist
Duplicate codes exist
Some codes are generic
Some products may be duplicates
total contains incorrect derived values
Radio
52 weeks
Legacy district names are inconsistent
District 3 and District 6 appear in legacy data but do not exist
Some records belong to Área Norte rather than a District
Posts
11 Markdown posts
Local and remote media
Some posts contain event information
Event information overlaps with other sources
Implementation Rules

Before modifying architecture:

Inspect the existing implementation.
Check the relevant ADR.
Check the domain model.
Check migration documentation.
Prefer small, reviewable changes.
Do not refactor unrelated code.
Do not remove V1 data until V2 migration has been validated.

When implementing a migration:

Analyze
↓
Transform
↓
Validate
↓
Review
↓
Migrate
↓
Verify

Never jump directly from V1 data to destructive migration.

Current V2 Status
V2 architecture decision
Domain model defined
Data cleanup analysis
District rules defined
Schedule model defined
Slug strategy defined
PocketBase deployed
Railway persistent volume configured
PocketBase superuser created

Current phase:

PocketBase schema design

Do not create the final collections until the schema has been reviewed.
