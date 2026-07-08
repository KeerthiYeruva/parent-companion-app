# Parent Companion

School sends PDFs.
Parent Companion automatically converts school PDFs into today, week-wise, and month-wise plans for each child, so parents only need to track completion, not manage documents.

The app automatically:

- Finds school documents
- Extracts homework, tests, activities, and projects
- Groups work by child
- Organizes work by today, week, and month
- Tracks completion

The goal is to help parents answer:

"What does each child need to do today?"

## Problem

Schools send monthly planners, co-scholastic planners, class test portions, unit test portions, and exam circular PDFs. Parents should not need to open every PDF, create tasks manually, assign categories, assign children, or remember each child's weekly plan.

## Goal

The successful workflow is:

- Receive school PDFs
- Drop them into a folder or upload them together
- Open Parent Companion
- See today's priorities first, then this week's tasks and this month's plan
- Mark work complete

The failed workflow is:

- Upload PDFs
- Assign child manually
- Assign category manually
- Enter dates manually
- Fix most rows
- Review everything before import

If the parent is building the plan, the app is not solving the problem. The app should build the plan.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Zustand (state)
- React Hook Form + Zod (forms + validation)
- Dayjs (date handling)
- Dexie (IndexedDB for document metadata)
- pdfjs-dist (client-side PDF text and coordinate extraction)
- Static web manifest + service worker registration for local-first PWA support

No large calendar package is used in the MVP. The school PDFs already provide due dates, so parsing should create dated tasks directly from table cells. Month planning is intentionally week-based, because the school documents are organized by week; a square calendar grid can be added later only if it proves useful.

## Parser Architecture

School planners are treated as structured documents, not random text blobs. The PDF pipeline is:

```text
pdfjs-dist
	-> text + coordinates
	-> table reconstruction
	-> fixed-column and matrix table parsers
	-> child/date/category mapping
	-> Today priorities
	-> Week items
	-> Month items grouped by school week
```

Reliability should come from school-specific parsers such as home study, class-test portions, unit-test timetables, scholastic matrix, co-scholastic, and exam circular parsers. The app keeps `pdfjs-dist`; changing frameworks, PDF libraries, or adding enterprise calendar packages is not the main path to better extraction.

Required table mappings:

- `S.NO | DATE | DAY | SUBJECT | HOME STUDY` -> `HomeStudy`
- `DATE | DAY | SUBJECT | CLASS TEST - PORTIONS` -> `ClassTest`
- `DATE & DAY | SUBJECT` -> `UnitTest`
- Weekly scholastic matrix cells map `CLASS TEST` -> `ClassTest`, `UNIT TEST` -> `UnitTest`, `GRADED PROJECT` -> `Project`, `GRADED LAB ACTIVITY` -> `Activity`, and `HOME STUDY`/`REVISION` -> `HomeStudy`

Headers, footers, school timing notes, book/notebook logistics, and raw date-grid fragments must not appear in Dashboard, Week, or Month task lists.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually http://localhost:5173

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

## Product Filter

Every feature should answer: does this help get from PDF to weekly plan?

## Functionality-First Roadmap

Phase 1 is parser and planning trust. Do not prioritize visual polish until the app can reliably take school PDFs, extract clean rows, assign the right child, create dated tasks, and show useful Today, Week, and Month plans.

Current focus:

- Table parsing for school PDFs
- Category extraction for homework, home study, class tests, unit tests, activities, and projects
- Date extraction from table cells
- Child-document ownership from grade/class signals
- Review exceptions only for genuine ambiguity
- Today priorities, upcoming tests, and overdue work
- Completion tracking across Today, Week, Month, and Kids

Phase 2 is mobile-first UX refinement after parser quality is high enough to trust with real school PDFs. Optimize whether a parent can understand today, this week, and tomorrow's tests in a few seconds.

Phase 3 is visual polish: spacing, typography, color system, icons, motion, empty states, and illustrations. UI polish should improve a trusted workflow, not hide parser artifacts.

## Zero-Touch Import Contract

The default workflow is:

- Upload school PDFs
- Understand the PDFs deterministically
- Auto-assign child from grade/class signals
- Auto-map category from school labels
- Auto-link unit test portions to exam circular dates
- Import ready items into Dashboard, This Week, This Month, and Kids

Review is an exception path only. Use review when a row is genuinely ambiguous, such as:

- two children share the same grade
- no date exists in the uploaded files
- extracted PDF text is empty, corrupt, or low confidence
- child, type, subject, title, or date cannot be mapped safely

Missing child profiles are not review work. If a Grade 3 document is scanned but the family only has Grade 1 and Grade 5 child profiles, the Grade 3 rows should be skipped and reported as "No matching child profile found." Do not assign them to an existing child.

Do not ask parents to assign children, categories, or dates when that information already exists in the uploaded school documents.

Deterministic mappings should prefer source text over guessing:

- CLASS TEST -> ClassTest
- UNIT TEST -> UnitTest
- GRADED PROJECT -> Project
- GRADED ACTIVITY -> Activity
- DANCE, MUSIC, YOGA, KARATE, ART & CRAFT, PHYSICAL EDUCATION -> Activity
- HOME STUDY, REVISION -> HomeStudy

Core screens:

- Dashboard: what should my kids do today?
- This Week: what needs to be completed this week?
- This Month: what is planned for this month, grouped by school week rather than a heavy calendar grid?
- Kids: what does each child need to do?

Setup screens stay secondary and are used when a new school PDF arrives:

- School Files
- Documents
- Profiles

## Current MVP

- Family Dashboard organized by child, today, tomorrow, and later this week
- Week View grouped by child and target type
- Month View grouped by child and week
- Kids overview and child-specific plans
- School file import that extracts homework, tests, activities, projects, and revision tasks
- Completion tracking for weekly and monthly work
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

This app is designed as a **Parent Companion App**, not a document management system. Parents should use dashboards first and setup screens only when new school files arrive.
