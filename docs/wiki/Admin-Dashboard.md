# Admin Dashboard

The `/admin` area is split into focused modules. The Dashboard home should remain a concise operational overview rather than a page containing every editor.

## Dashboard

Use the Dashboard for high-level site/content status, Site Mode visibility, operational notices and release/update status where enabled.

Detailed content management belongs in the dedicated modules below.

## Blog

The Blog editor supports title, slug, publication type/category, excerpt, rich-text editing, featured image, author, publication date, workflow status, tags/taxonomies, SEO fields and an unsaved Preview before final save.

SEO Title initially follows the post Title and SEO Description follows the Excerpt until those SEO fields are manually edited.

Public comments are managed separately in **Comments**, not on the Dashboard home.

## Comments

OWNER/ADMIN users can review Blog comments from the dedicated Comments screen.

It includes author information, publication reference, comment text, date, distinction between top-level comments and replies, search/filter controls, article links and deletion for spam or unwanted content.

Deleting a parent comment also removes its replies through the configured cascade relation.

## Projects

Project management includes title, slug, category/status, short description, long rich-text description, cover/media, technologies/tools, highlights, repository/demo links, SEO fields and unsaved Preview.

Supported structured project shortcodes include:

```text
[[mission]]
[[features]]
[[chronicles]]
[[installation]]
```

SEO Title follows the Project title and SEO Description follows the short description until manually overridden.

## Pages

Use Pages for CMS-managed standalone content that does not belong to Blog or Projects.

## Gallery

The Gallery editor follows a simplified WordPress-like media workflow.

For each item:

1. Add media.
2. Select **Photo** or **Video**.
3. Choose or upload the media file.
4. Enter title/description if needed.
5. For **Video** only, optionally choose a thumbnail override.
6. Set order and visibility.

The public Gallery filter uses the saved media type for **All / Photos / Videos**. Configured Gallery items are authoritative; automatic `public/gallery` discovery is only a fallback.

## Media Library

The shared Media Library is reused across Blog, Projects, Gallery, Homepage and other CMS modules.

Gallery video mode supports common formats such as MP4, WebM, Ogg and QuickTime/MOV according to the current server-side upload allowlist.

## Homepage

Homepage management controls Hero/identity content and global sharing settings.

The **Social thumbnails & meta tags** section contains:

- default social thumbnail;
- Open Graph thumbnail;
- X/Twitter thumbnail;
- custom structured meta tags.

See [SEO and Meta Tags](SEO-and-Meta-Tags.md).

## Navigation

Navigation settings manage public menu items and supported parent/child/dropdown relationships.

Protected public navigation components are covered by CI design protection. Intentional visual changes may require the `design-approved` PR label.

## Footer

Footer settings control CMS-managed footer content and links.

## Global SEO

Global SEO provides default metadata when a content page does not override it. Typical settings include title/title template, description, keywords, author/creator information, Open Graph, X/Twitter, robots directives and verification values.

See [SEO and Meta Tags](SEO-and-Meta-Tags.md).

## Redirects

Redirect management supports internal or absolute destinations with validation around protected/reserved routes.

## Site Mode

Site Mode controls normal/maintenance/coming-soon/private/archive behavior where configured. Special modes own their public presentation and should not accidentally inherit the normal Navbar/Footer layout.

## Users & Roles

| Role | Purpose |
| --- | --- |
| `OWNER` | Full control, including protected owner-level administration. |
| `ADMIN` | Broad site/content administration without owner-only operations. |
| `EDITOR` | Content-oriented access with restricted destructive/administrative actions. |

## Revisions

Where revision tracking is enabled, content changes are stored as snapshots for audit/history purposes. This is not a substitute for PostgreSQL backups or Git history.

## Updates

The Admin updater relies on release/version information. If code changes are merged without increasing the application version, the updater may not show a new release. See [Updates and CI](Updates-and-CI.md).
