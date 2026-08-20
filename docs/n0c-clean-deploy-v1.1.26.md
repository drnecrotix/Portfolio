# N0C clean deployment recovery

Portfolio 1.1.26 hardens the self-updater after the Next.js config migration and repeated interrupted N0C builds.

The updater now removes the obsolete `next.config.ts` when `next.config.mjs` is the active repository config, builds from a clean `.next` directory, and restores the previous production `.next` build automatically if the new build fails.
