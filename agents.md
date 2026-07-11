# Parent Companion App — Codex Instructions

## Project purpose

Parent Companion is a React, TypeScript, and Vite application that imports school PDFs and automatically organizes school work into:

- Today
- Week
- Month
- Kids
- Tests
- Activities
- Projects
- School Files

The app should convert school documents into clean, parent-ready items with minimal manual correction.

## Child profiles

Current child mappings:

- Ruthvish Reddy Annapareddy → Grade 1
- Luhas Reddy → Grade 5

Do not infer or swap these mappings.

Always verify grade-to-child assignment before changing import logic.

## Core import principle

Known school PDF formats should import automatically.

Do not use manual validation, Review Exceptions, Revalidate, or user-entered dates as the primary solution for valid known fixtures.

Improve the parser instead.

Review Exceptions should be reserved for genuinely ambiguous, incomplete, unsupported, or corrupt source data.

## Authoritative document responsibilities

### Scholastic planner

Use the grade-specific scholastic planner for:

- homework
- class tests
- activities
- projects
- grade-specific Unit Test subject and date schedule

Some planner cells contain markers such as:

- `UNIT TEST`
- `UNIT TEST -1`
- `UT-1 Revision`
- `Exam material`

These are timetable or classroom markers.

They must not automatically create duplicate Unit Test records.

They must not determine child assignment, subject, or portions unless they are part of a clearly structured timetable.

### Unit Test portion PDF

Use the grade-specific Unit Test portion PDF for:

- grade
- child assignment
- subject
- complete chapter and portion details

The parser must support:

- multi-line table cells
- multi-line subject names
- `Computer Science` split across lines
- `General Knowledge` split across lines
- multi-line chapter numbers
- multi-line chapter names
- Hindi text
- Kannada text
- Unicode content
- rows continuing across PDF text lines
- content continuing across multiple pages

Expected real fixture results:

#### Grade 1

- English
- Hindi
- Mathematics
- Science
- Computer Science
- General Knowledge
- Kannada

Expected count: **7**

#### Grade 5

- English
- Hindi
- Mathematics
- Science
- Social Studies
- Computer Science
- General Knowledge
- Kannada

Expected count: **8**

## Unit Test merge behavior

Final Unit Test items must be created automatically by merging:

Grade-specific scholastic planner:

```text
subject + date
```

with:

Grade-specific Unit Test portion PDF:

```text
child + grade + subject + portion
```

Merge key:

```text
grade or child + normalized subject
```

Final item must contain:

- child
- category: `UnitTest`
- normalized subject
- date
- clean parent-ready title
- complete portion in description

Example title:

```text
Mathematics Unit Test
```

Example description:

```text
Chapter 1 — Numbers Up to 50
Chapter 5 — Numbers Up to 100
```

Do not use long portion text as the title.

## Item content model

Use this structure consistently across the app.

### Title

Use:

```text
activity or item type + subject
```

Examples:

```text
Mathematics Unit Test
Hindi Graded Activity
Science Project
English Homework
```

### Description

Use:

```text
chapter + actual instruction + portion + useful details
```

Examples:

```text
Chapter 1 — Place Value
Chapter 2 — Addition, Subtraction and their Applications
```

or:

```text
Chapter 3 — Nouns
Complete questions 1–10
```

### Date

Show the due date, activity date, or test date clearly.

Do not put the full chapter list or portion text in the title.

## Card presentation

Do not repeat unnecessary information on every card.

When the page is already scoped to one child, for example:

```text
Luhas → Tests
```

do not repeat:

```text
Luhas Reddy
Tests
```

on every card.

Show:

- title
- subject where needed
- description
- date
- status where useful

In mixed views such as Today, Week, or Month:

- show child identity because multiple children may appear
- show category only when it improves clarity

Descriptions should:

- wrap naturally
- preserve Hindi and Kannada
- not hide important portions
- not be truncated too aggressively
- use expand/collapse only for very long content

## Subject normalization

Use consistent canonical subjects:

- Math → Mathematics
- Maths → Mathematics
- Computer → Computer Science
- SST → Social Studies
- Social → Social Studies
- Social Science → Social Studies
- GK → General Knowledge
- General knowledge → General Knowledge

Normalization must be used consistently during:

- extraction
- matching
- merging
- duplicate detection
- rendering

## Duplicate prevention

Do not create duplicate Unit Test items from:

- timetable markers
- shared circular rows
- planner grid cells
- portion rows
- repeated extraction paths

Deduplicate using:

```text
child + category + normalized subject + due date
```

Preserve the most complete merged record.

Prefer records containing:

- valid child
- valid subject
- valid date
- complete portion
- clean title

## Shared exam circulars

A shared exam circular may be used as a fallback schedule source.

Do not blindly assign every circular row to every child.

Prefer the child’s own grade-specific scholastic timetable when available.

Grade-specific differences must be preserved.

Example:

- Grade 1 has no Social Studies Unit Test
- Grade 5 includes Social Studies

The circular must never overwrite more specific grade-level information.

## Parser implementation rules

Before modifying parser logic:

1. Inspect the real PDF fixture.
2. Inspect the actual PDF.js extracted text.
3. Trace the complete runtime import path.
4. Verify document classification.
5. Verify child and grade detection.
6. Verify subject extraction.
7. Verify date extraction.
8. Verify merge behavior.
9. Verify duplicate handling.

Do not rely only on filename assumptions or broad regexes.

Prefer fixture-backed parser behavior.

Avoid hard-coded dates or child-specific hacks unless the source document itself contains that information.

## Local browser verification

Do not stop after code compiles or unit tests pass.

For import, parser, merge, navigation, state, or rendering changes:

1. Start or use the local Vite server.
2. Open the app in the VS Code local browser or browser preview.
3. Reproduce the issue.
4. Apply the fix.
5. Restart Vite if required.
6. Hard refresh.
7. Verify the updated behavior visually.
8. Check the browser console for runtime errors.

Use a fresh import when parser behavior changes.

Do not assume Rebuild Imported Items re-runs the latest parser unless that behavior is explicitly confirmed.

## Unit Test browser acceptance criteria

After importing the real scholastic planners and Unit Test portion PDFs:

### Grade 1 / Ruthvish

- 7 Unit Test items
- correct subjects
- correct dates
- complete portions visible
- no Social Studies
- no duplicates
- no valid rows needing manual help

### Grade 5 / Luhas

- 8 Unit Test items
- Social Studies included
- correct dates
- complete portions visible
- no duplicates
- no valid rows needing manual help

All titles must be parent-ready.

Examples:

- English Unit Test
- Mathematics Unit Test
- Science Unit Test

## Testing

For parser changes:

- add fixture-backed tests
- use the actual school PDFs when practical
- test extraction counts
- test subject names
- test date merge
- test child assignment
- test duplicate prevention
- test Unicode preservation
- test multi-page parsing

Run:

```bash
npm test
npm run build
```

Do not dismiss failing tests as unrelated without investigating and documenting the reason.

## Data and cloud safety

The application uses:

- Dexie for local storage
- Zustand for state
- Firebase Firestore for cloud synchronization

When changing import or delete behavior:

- preserve local/cloud consistency
- avoid duplicate cloud records
- avoid deleting unrelated child data
- verify `sourceDocumentId` and `fileHash` behavior
- verify state refresh after writes

Do not change Firebase configuration or security rules unless explicitly requested.

## Code-change discipline

Before editing:

- inspect the existing implementation
- reuse existing utilities when possible
- avoid unrelated refactors
- preserve current working behavior

After editing:

- report the exact root cause
- list files changed
- summarize behavior changes
- report test results
- report local browser verification
- mention whether fresh re-import is required

Do not commit unless explicitly asked.

Do not push unless explicitly asked.
