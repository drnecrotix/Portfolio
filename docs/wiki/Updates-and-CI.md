# Updates and CI

This page documents release versioning, Admin updater behavior and the GitHub Actions checks used by the Portfolio repository.

## Release versioning

If a release must be detected by the Admin updater, increase the application version before merge.

Example:

```text
1.1.41 -> 1.1.42
```

A code-only merge that leaves the same version can be valid Git history but may not appear as a new Admin update.

## Recommended release checklist

Before merge:

```text
[ ] Version bumped when updater detection is required
[ ] Prisma schema valid
[ ] Migration included if schema changed
[ ] Typecheck green
[ ] Lint green
[ ] Standard build green
[ ] N0C/WASM build green where required
[ ] Visual smoke green
[ ] design-approved label present if protected frontend files changed
[ ] No secrets committed
[ ] Deployment/environment changes documented
```

After production update:

```text
[ ] Admin updater reports expected installed version
[ ] Node/Passenger application restarted
[ ] Home checked on desktop and mobile
[ ] Blog/Projects database reads tested
[ ] Gallery filters tested
[ ] Admin login tested
[ ] Logs checked for new errors
```

## GitHub Actions jobs

The repository CI currently includes checks such as:

### Protected design guard

Certain frontend files are treated as protected design surfaces. PRs changing them require explicit approval through the `design-approved` label.

Important behavior: adding the label after the original pull-request event does not modify that old event payload. If the guard still fails after adding the label, push a new commit to trigger a fresh `synchronize` event.

### Typecheck

Runs TypeScript validation, typically equivalent to:

```bash
npm run typecheck
```

A visual test can pass while typecheck still fails.

### Lint changed source files

Changed JS/TS files are linted. React 19 rules can flag patterns such as synchronous `setState()` inside effects.

Prefer architectural fixes instead of disabling lint rules globally.

### Standard production build

Runs the normal Next.js production build.

### N0C compatibility build

The project contains a WASM-oriented compatibility build for the N0C/CloudLinux environment:

```bash
npm run build:n0c
```

### Frontend visual smoke

Playwright verifies key public views. This is a smoke/evidence check rather than a strict pixel-by-pixel visual-regression baseline.

## Prisma checks in CI

CI uses a clean PostgreSQL database to verify:

- Prisma Client generation;
- schema validation;
- production migration deployment;
- migration status;
- shared runtime singleton guard.

This helps catch migrations that work only against an already-mutated development database.

## Useful local commands before pushing

```bash
npm run typecheck
npm run lint
npm run build
```

Database-related checks:

```bash
npx prisma generate
npx prisma validate
npx prisma migrate status
```

## Branch and PR workflow

Recommended:

```bash
git checkout -b feat/my-change
# edit/test
git push -u origin feat/my-change
```

Open a PR against `main` and wait for required CI checks.

Do not force-push protected/shared branches unless the repository's collaboration policy explicitly requires it.

## When CI fails

Read the exact failed step instead of rerunning repeatedly.

A useful diagnosis order is:

1. determine which job failed;
2. inspect that job's step list;
3. inspect the relevant logs;
4. fix the root cause in the branch;
5. push a new commit;
6. verify the new workflow run.

See [Troubleshooting](Troubleshooting.md) for known project-specific failures.
