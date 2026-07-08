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
npm run build
```

## CI

GitHub Actions runs lint, typecheck, and build on every push and pull request to `main`.

See `.github/workflows/ci.yml`.

## Contributing

See `CONTRIBUTING.md` for branching, commit message standards, and PR expectations.

## Current MVP

- Family Dashboard
- Week View
- Month View
- Tests Center
- Homework Center
- Activities Center
- Child Profiles
- Documents (reference-first flow)
- Local persistence with Zustand + localStorage
- IndexedDB document backup via Dexie

## Note

This app is designed as a **Parent Companion App**, not a document management system. Parents should use dashboards first and documents only as backup references.
