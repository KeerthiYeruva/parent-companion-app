# Parent Companion App

A local-first parent dashboard that turns school planners and circulars into clear daily, weekly, and monthly actions.

## Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- Zustand (state)
- React Hook Form + Zod (forms + validation)
- Dayjs (date handling)
- Dexie (IndexedDB for document metadata)
- next-pwa (PWA support)

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

## CI

GitHub Actions runs lint, typecheck, unit tests, and build on every push and pull request to `main`.

See `.github/workflows/ci.yml`.

## Contributing

See `CONTRIBUTING.md` for branching, commit message standards, and PR expectations.

## Issue Templates

GitHub issue forms are available for bug reports and feature requests in `.github/ISSUE_TEMPLATE/`.

Labels can be synchronized using the `Sync Labels` workflow in `.github/workflows/labels.yml`.

## Releases

Push a semantic version tag to trigger an automated GitHub release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Release workflow: `.github/workflows/release.yml`.

## Current MVP

- Family Dashboard
- Week View
- Month View
- Tests Center
- Homework Center
- Activities Center
- Child Profiles
- Documents (reference-first flow)
- Documents screen supports paste-preview-import flow for planner rows using the typed import pipeline
- Documents screen supports first-pass smart file scan with document type detection, month extraction, and duplicate/change fingerprinting
- Local persistence with Dexie (IndexedDB) as source of truth
- Zustand localStorage persistence limited to UI selection preferences

## Architecture Notes

- App Router planning screens now use the feature module entry point at `src/features/planning/components/planning-view.tsx`.
- Planning selectors are colocated in `src/features/planning/selectors/planning-selectors.ts`.
- Children management screen entry point is `src/features/children/components/children-management-view.tsx`.
- Documents repository screen entry point is `src/features/documents/components/documents-repository-view.tsx`.
- Document intelligence services live under `src/features/documents/services/`.
- Import pipeline contracts and orchestration live under `src/features/import/`.
- Core entities (`children`, `items`, `documents`) are hydrated from Dexie via `src/store/use-app-store.ts`.
- Dexie access is centralized through `src/db/repositories/app-repository.ts` for future sync/backend adapter expansion.
- `src/components/dashboard-view.tsx` and `src/store/selectors.ts` are compatibility re-exports during migration.
- `src/components/children-page.tsx` and `src/components/documents-page.tsx` remain compatibility re-exports during migration.

## Note

This app is designed as a **Parent Companion App**, not a document management system. Parents should use dashboards first and documents only as backup references.
