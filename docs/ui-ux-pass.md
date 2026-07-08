# Parent Companion UI/UX Pass

This document separates the functionality roadmap from the UX roadmap.

The current product priority is still parser and planning trust. A dedicated UX sprint should begin after parser quality stabilizes enough that Today, Week, and Month views contain only clean, parent-ready tasks.

## Product Principle

Parent Companion is not a PDF manager, document repository, school ERP, or student management system.

Parent Companion is:

```text
School PDFs
  -> Understanding
  -> Planning
  -> Execution
```

Parents do not buy PDF extraction. Parents buy a trustworthy answer to:

> What does my child need to do today?

## Phase 1: Finish Functionality First

Complete the parser and planning pipeline before spending meaningful effort on visual polish.

Must complete:

- Table-aware parser
- Home Study extraction
- Class Test extraction
- Unit Test extraction
- Activity extraction
- Project extraction
- Child assignment
- Date extraction
- Today priorities
- Completion tracking

The PDFs are structured enough that the main technical path is table parsing, not changing PDF libraries. School documents already contain dates, subjects, categories, and activities in table-like layouts. Parser work should convert those rows into clean tasks automatically.

## Phase 2: Dedicated UX Sprint

Start this after parser quality is stable.

UX goal:

> Parent opens the app and within 3 seconds knows what each child needs today and whether any tests are coming tomorrow.

The main UX question is trust, not aesthetics:

> Can the parent trust that the tasks shown are correct and important?

## Recommended Focus Split

For the next few days:

- 70% Parser quality
- 20% Today, Week, and Month UX
- 10% UI polish

Avoid spending meaningful time on animations, fancy colors, gradients, illustrations, or dark mode polish until the task pipeline is trusted.

## Product Hierarchy

The app hierarchy should be:

1. Today
2. Week
3. Month
4. Kids
5. Tasks
6. School Files

School Files is setup. The main product experience is planning and execution.

## Highest Impact UX Improvements

### 1. Today Becomes the Hero Screen

Today should become the primary parent-facing surface.

It should group work by urgency and usefulness:

- Urgent: tests tomorrow or overdue work that needs immediate attention.
- Due Today: homework, home study, revision, or project work due today.
- Activities: activity reminders such as dance, music, yoga, karate, art and craft, or physical education.

Example hierarchy:

```text
Luhas

Urgent
Science Unit Test Tomorrow

Due Today
Science Revision
English Reading

Activities
Dance Practice
```

### 2. Show Parent-Ready Task Titles Only

Parser noise must not reach Today, Week, or Month.

Bad examples:

- .07.26 Monday...
- All books and notebooks...
- raw timetable fragments
- school timing notes
- headers and footers

Good examples:

- English Class Test
- Science Project
- Dance Practice
- Math Revision

Weak parser rows should be hidden from planning views and reported as import issues only when useful.

### 3. Simplify Task Actions

Task cards should not show heavy status controls by default.

Default interaction:

```text
[ ] Science Revision
[x] English Reading
```

Advanced statuses such as Not Started, In Progress, and Completed can exist in task details, but the main planning views should optimize for quick completion tracking.

### 4. Make Review Mostly Invisible

Review should be an exception path, not a work queue.

Parent-facing import summary should read like:

```text
4 PDFs Imported
1 Needs Attention
```

Most parents should not need to open Review. Review is only for genuine ambiguity, such as missing dates, low-confidence extraction, or unclear child assignment.

### 5. Keep School Files Setup-Only

Parents should mostly live in:

- Today
- Week
- Kids

School Files belongs under setup or settings once the primary planning loop is strong. The value is not importing documents. The value is receiving a plan.

### 6. Make Month Week-Oriented

School planners are already organized by school week, so Month should not prioritize a traditional calendar grid.

Preferred structure:

```text
July

Week 1
3 Home Study
1 Class Test

Week 2
4 Home Study
1 Activity

Week 3
Unit Test Preparation

Week 4
Unit Tests
```

Month should help parents see the school rhythm at a glance.

### 7. Turn Kids Into Mini Dashboards

Each child page should directly answer:

- Today
- This Week
- Upcoming Tests
- Activities
- Progress

Kids should be a child-specific planning dashboard, not only a profile or document drill-down.

## UX Acceptance Criteria

The UX sprint is successful when:

- A parent can open Today and understand each child's priorities in under 3 seconds.
- Tomorrow's tests are visually impossible to miss.
- Today, Week, and Month contain no parser garbage.
- Completing a task takes one tap or click from the main planning view.
- Review appears as a small exception summary, not a primary workflow.
- School Files feels like setup, not the product homepage.
- Month communicates school weeks better than a generic calendar grid.

## Non-Goals For Now

- Animation systems
- Fancy color exploration
- Illustrations
- Dark mode perfection
- Calendar widgets unless week-based planning proves insufficient
- Broad visual redesign before parser output is trusted
