# Portfolio Admin CMS Architecture

## Goal

Turn the portfolio into a database-driven personal CMS without redesigning the protected public visual components.

## Protected public design

The following components are design-protected and must not be redesigned as part of CMS work:

- Homepage fullscreen hero and typography composition
- Primary navigation structure and visual behavior
- Side profile card interaction
- Day/Night theme switcher and dark-first behavior
- `/projects` list archive presentation
- `/blog` editorial list archive presentation
- Selected transitions and responsive behavior

CMS integration may replace hardcoded content with database values, but must not replace or reinterpret these components.

## Admin modules

### Dashboard

- Site status
- Current Site Mode
- Draft counts
- Recent edits
- Scheduled publications
- Project status summary
- Quick actions

### Homepage

Editable content only:

- Hero text lines
- Intro copy
- Location/status copy
- Social links
- Profile card content
- Availability state

The hero layout itself remains code-controlled.

### Projects

- Create/edit/archive projects
- Slug
- Title
- Description
- Status
- Category
- Technologies
- Tools
- Repository/demo links
- Role/team/timeline
- Case study blocks
- Sort order
- SEO
- Draft/review/publish workflow
- Revision history

### Blog

Post types:

- Article
- Poetry
- Thought
- Note
- Project Log

Features:

- Rich text editor
- Poetry-friendly whitespace handling
- Categories/tags
- Draft/review/publish/archive workflow
- Scheduled publishing
- SEO
- Revision history
- Preview before publishing

### Pages

Editable structured content for pages such as About and Contact while preserving their code-defined layouts.

### Navigation

- Labels
- URLs
- Order
- Visibility
- External-link state

### Media Library

- Upload
- Alt text
- Caption
- Dimensions/type metadata
- S3-compatible storage

### Site Mode

Modes:

- NORMAL
- MAINTENANCE
- COMING_SOON
- PRIVATE
- ARCHIVE

Features:

- Optional scheduled start/end
- Admin bypass
- Optional password for private mode
- Editable maintenance/coming-soon message
- Optional countdown
- Optional social/contact display

### Theme

CMS may control only safe theme tokens:

- Default theme
- Day mode enabled/disabled
- Accent color
- Approved color tokens

The CMS must not expose layout spacing, breakpoints, hero font sizing, animation timings, or component positioning.

### SEO

- Global defaults
- Per-project metadata
- Per-post metadata
- Per-page metadata
- Canonical support
- Open Graph defaults

### Redirects

- Source path
- Target path
- Permanent/temporary state

### Users

Roles:

- OWNER
- ADMIN
- EDITOR

Only OWNER and ADMIN may change Site Mode, users, global site settings, and destructive configuration.

## Data layer

- PostgreSQL
- Prisma ORM
- Auth.js for admin authentication
- Tiptap for structured rich-text editing
- S3-compatible object storage for media

## Migration strategy

1. Build the database and authentication foundation.
2. Build the protected `/admin` shell.
3. Add Site Mode first.
4. Add Projects and Blog CRUD.
5. Migrate existing hardcoded project/blog data into PostgreSQL.
6. Connect protected public components to database content without changing their visual markup.
7. Add Homepage/Pages/Navigation editors.
8. Add Media, SEO, redirects, analytics, and revision restore.

## Rule for automated code changes

Do not redesign a protected public component while converting it from static data to CMS data. Data integration and visual redesign must be separate changes and separate review decisions.
