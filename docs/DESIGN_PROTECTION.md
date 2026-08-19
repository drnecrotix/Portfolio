# Design Protection Contract

The portfolio's public frontend has protected visual components. CMS, backend, SEO, security, performance and infrastructure work must adapt to these components rather than redesign them.

## Protected areas

- Homepage fullscreen Hero composition and its GSAP/motion behavior
- Public navigation structure and Day/Night interaction
- Projects archive list presentation
- Blog archive list presentation
- Responsive behavior of the protected areas

The CI workflow guards the main source files for these areas. A pull request that changes a guarded file must carry the `design-approved` label before merge.

## Visual smoke evidence

Playwright runs `/`, `/projects`, `/blog` and `/contact` in desktop/mobile Chromium and dark/light themes. It checks successful rendering, basic layout overflow, key route landmarks and uploads full-page screenshots as workflow artifacts for review.

This smoke layer is intentionally separate from pixel-baseline snapshots. Pixel baselines can be added later once a stable production/staging data fixture is available, avoiding false failures caused by changing CMS content.
