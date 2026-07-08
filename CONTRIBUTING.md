# Contributing

Thanks for contributing to Parent Companion App.

## Prerequisites

- Node.js 20+
- npm 10+

## Local Setup

```bash
npm install
npm run dev
```

## Quality Gates

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run build
```

## Branching

- Create feature branches from `main`
- Use descriptive branch names, e.g. `feat/week-planner-filters`

## Commit Message Convention

Use clear, scoped commit messages:

- `feat(ui): add week agenda grouping by child`
- `feat(data): add indexed query for pending homework`
- `fix(import): handle missing due date safely`
- `docs(readme): update setup and architecture notes`

## Product Standards

- Keep documents reference-first; dashboard/planning remain primary UX
- Preserve mobile-first behavior and tablet/desktop enhancements
- Prefer feature-based architecture with typed domain models
- Avoid adding backend dependencies in MVP scope

## Pull Requests

- Keep PRs focused and small enough to review
- Add screenshots for UI changes
- Mention tradeoffs and follow-up tasks in PR description
