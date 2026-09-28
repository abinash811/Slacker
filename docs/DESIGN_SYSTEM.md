# Design system

The source of truth for how Slacker looks and behaves. Every page, dialog, and
component is assembled from what's documented here. If you need something
that isn't here, add it here (and to `/design`) in the same change.

**Three ways to check your work:**

- **`/design`**: a page showing every shared component in every state (not
  linked from the nav; open it directly). Source: `frontend/src/pages/DesignSystem.tsx`.
- **`npm run lint`**: runs `scripts/check-design.mjs`, which fails on raw
  colors, off-scale type, raw `<table>`/`<input>`/headings outside
  `components/ui/`, inline styles, and Radix imports.
- **This doc.**

## Stack

- **Primitives:** [Base UI](https://base-ui.com) (`@base-ui/react`), styled
  with Tailwind v4, following shadcn conventions. Radix is not used.
- **Animations:** `tw-animate-css` (`animate-in`, `fade-in-0`, `zoom-in-95`…).
- **Icons:** `lucide-react`, sized `size-4` by default (`size-3`/`size-3.5`
  inside badges and small labels).
- **Toasts:** Base UI Toast, via `toast` from `lib/toast.ts`.

## Tokens (`frontend/src/index.css`)

Tokens are the only place raw values are allowed. Every token has a light
value on `:root` and a dark value on `:root[data-theme="dark"]` (dark mode is
ready but not switched on).

### Color

| Token | Use |
|---|---|
| `background` / `foreground` | Page background / primary text |
| `card` / `card-foreground` | Card and panel surfaces |
| `popover` / `popover-foreground` | Floating surfaces: dropdowns, dialogs, toasts |
| `muted` / `muted-foreground` | Subdued fills, hover fills, secondary text |
| `border` | All borders (the global default) |
| `input` | Borders of form controls (slightly darker than `border`) |
| `primary` / `primary-foreground` | Primary buttons, links, checked controls |
| `accent` / `accent-foreground` | Tags, selected chips, subtle highlights |
| `ring` | Keyboard focus outline |
| `success` / `success-bg` | Resolved, on-track, success feedback |
| `warning` / `warning-bg` | Pending, medium urgency |
| `danger` / `danger-bg` / `danger-foreground` | SLA breaches, errors, destructive actions |
| `overlay` | The scrim behind dialogs |

`warning` is `#b45309` (amber-700), not amber-600, so text on white passes
WCAG AA contrast.

### Elevation (shadows)

| Class | Use |
|---|---|
| `shadow-card` | Cards, lists, tables resting on the page |
| `shadow-popover` | Dropdowns, tooltips |
| `shadow-dialog` | Dialogs and confirm dialogs |
| `shadow-toast` | Toasts |

Never use `shadow-sm`/`md`/`lg` or `shadow-[…]`.

### Radius

`rounded-md` (8px, `--radius`) for controls and buttons, `rounded-lg` for
cards, tables, and dialogs, `rounded-full` for badges and chips.

### Motion

| What | Duration | Classes |
|---|---|---|
| Hover / press color changes | 150ms | `transition-colors duration-150 ease-standard` |
| Dropdowns, tooltips open/close | 100ms | fade + zoom-95 (built into `Select`, `Tooltip`) |
| Dialogs open/close | 150ms | fade + zoom-95 (built into `DialogContent`) |
| Toast enter/exit | 200ms | slide-up + fade (built into the toast viewport) |

`ease-standard` is the only easing curve. Everything is disabled under
`prefers-reduced-motion`. Don't animate layout (width/height) on data changes.

## Typography

Inter at 14px/1.5, set once on `<body>`. Never set a font anywhere else.

| Use | Component | Renders |
|---|---|---|
| Page title (exactly one per page) | `PageHeader` | `h1 text-lg font-semibold` + description + `actions` |
| Section title (Settings tabs, page sections) | `SectionHeader` | `h2 text-base font-semibold` + description + `actions`; owns its `mb-4` |
| Card title | `CardTitle` | `h3 text-sm font-medium text-muted-foreground`; `tone="strong"` or `tone="danger"` |
| Group label (form sections, sidebar lists) | `SectionLabel` | `text-xs font-semibold uppercase tracking-wide` |
| Secondary paragraph | `Muted` | `text-sm text-muted-foreground` |
| Meta, timestamps, read-only field labels | `Caption` | `text-xs text-muted-foreground` (`as="dt"` in a `<dl>`) |
| Stat values | `StatTile` | `text-2xl font-semibold tabular-nums`, the only larger size |

Use `tabular-nums` wherever numbers line up in columns. Don't invent a size;
`text-xl` and larger, and `font-bold`, fail the lint check.

## Components

Primitives live in `frontend/src/components/ui/`. Product-level compositions
live in `frontend/src/components/`.

| Need | Use |
|---|---|
| Button | `Button`: variants `default`, `outline`, `secondary`, `ghost`, `destructive`, `destructive-ghost`, `link`; sizes `default`, `sm`, `icon`, `icon-sm`; `loading` shows a spinner and disables it |
| Link that looks like a button | `ButtonLink` (same variants). Never `<Button render={<Link/>}>`: that announces a link as a button |
| Text input / textarea | `Input`, `Textarea` |
| Dropdown | `Select` (string values, `null` = nothing chosen, `emptyLabel` adds a clearable "Unassigned"/"All …" row) |
| Checkbox | `Checkbox` (label included) |
| Form field | `Field` (label + control + `hint` or `error`); `required={false}` appends "(optional)" |
| Group of fields in a long form | `FieldSection` |
| Dialog | `Dialog`, `DialogTrigger render={<Button/>}`, `DialogContent size="sm/md/lg"`, `DialogHeader`, `DialogTitle`, `DialogDescription` (always include one), `DialogFooter` |
| "+ New" item flow | `CreateItemDialog` (`components/`) |
| Destructive confirmation | `ConfirmDialog` |
| List of records from the server | `DataTable` (TanStack Table): columns from `columnHelper<T>()` in `lib/data-table.ts`, server-side sorting and paging, built-in loading, error and empty states, `Pagination` footer. Per-column `meta`: `muted`, `align`, `className`, `invertSortIndicator`; `enableSorting: false` on columns the API can't sort |
| Small static table | `Table`, `TableHeader`, `TableHead` (`sort`/`onSort`), `TableBody`, `TableRow` (`interactive`, `tone="danger"`), `TableCell` (`muted`, `align`), `TableMessage`, `TableSkeleton` |
| Paging | `Pagination` (used by `DataTable`; 50 rows per page for tickets) |
| Status pill | `Badge` (`neutral`, `accent`, `success`, `warning`, `danger`); tickets use `StatusBadge`, `PriorityBadge`, `SlaBadge` |
| Card | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` |
| Metric | `StatTile` / `StatTileSkeleton` |
| Part-of-whole bar | `ShareBar` |
| Hint on hover | `Tooltip` (required on icon-only buttons) |
| Navigation link | `NavItem` (`components/`) |

## States

Every interactive element and every data view must handle all of its states.

### Interaction states

| State | Treatment |
|---|---|
| Hover | Fill `bg-muted` (buttons, nav) or `bg-muted/50` (rows, list items); muted text goes to `text-foreground` |
| Pressed | Buttons nudge down 1px (`active:translate-y-px`) |
| Keyboard focus | `focus-ring` utility: 2px `ring`-colored outline, 2px offset, on `:focus-visible` only. Form controls use a border + soft ring instead. Every clickable thing gets one, and ui/ primitives include it |
| Selected / active | `bg-muted text-foreground` (nav, list); `aria-pressed` / `aria-current` / `aria-sort` set accordingly |
| Disabled | `opacity-50` and no pointer events. Explain why nearby when it isn't obvious (e.g. a placeholder saying "Everyone is already a member") |
| Busy | `Button loading`; controls disable while their mutation is pending |
| Invalid | `aria-invalid` on the control (red border + ring) and `Field error="…"` |

### Loading

- **Lists, tables, cards:** `Skeleton` / `TableSkeleton` / `StatTileSkeleton`
  shaped like the content. Never a blank area, never a centered spinner for
  a whole page.
- **Whole page (detail views):** a skeleton of the page layout.
- **A single action:** `Button loading`.
- Only show skeletons on the first load (`isPending`); keep stale data on screen while refetching.

### Empty

Always `EmptyState`, with `variant="plain"` inside a card or table
(`TableMessage`) and `variant="bordered"` standalone on a page. Distinguish:

- **Nothing exists yet:** say what will appear and how ("No tags yet —
  Create one so people can label tickets"), and offer the create action if the
  user can take it.
- **Filters hide everything:** "No tickets match these filters" + a
  **Clear filters** button.
- **Good news:** "Nothing pending" with a `CheckCircle2` icon.

### Errors

| Situation | Use |
|---|---|
| A list, card, or page failed to load | `ErrorState` with `onRetry` (inside a card or table: `plain`; standalone: `bordered`) |
| A dialog's submit failed | `Alert tone="danger"` inside the dialog, above the footer; keep the dialog open and keep the input |
| A field is invalid | `Field error` + `aria-invalid`; validate on submit, then live |
| A background action failed (select change, archive, …) | Error toast; automatic, see below |
| Unknown URL / missing record | `NotFound` |
| A render crash | `ErrorBoundary` (wraps every route in `Layout`) |

`describeError(error)` (`lib/api.ts`) turns any error into one readable
sentence. Always use it; never show raw JSON or status codes.

### Feedback (toasts)

Mutations report their outcome automatically through the React Query
`MutationCache` (`main.tsx`), configured per hook with `meta` in
`hooks/useApi.ts`:

- `meta.success`: success toast text (a string, or a function of the variables).
- `meta.errorTitle`: error toast title; the description comes from `describeError`.
- `meta.inlineError: true`: the UI shows the error itself (create dialogs), so no toast.

Toasts confirm; they don't carry critical information. Success toasts
disappear after 4 seconds and error toasts after 8. Call `toast.success/error/info`
directly only for actions that aren't mutations.

## Patterns

- **Adding an item to a list:** a `+ New` `Button size="sm"` in the
  `SectionHeader` actions opens a `CreateItemDialog`. Never use a permanently
  visible inline add form (the team-member form, which is part of the member
  table, is the exception).
- **Destructive actions** (remove, delete): `destructive-ghost` trigger → `ConfirmDialog`
  with a specific title ("Remove Priya?") and what happens next. Reversible
  actions (Archive/Restore) don't need confirmation.
- **Clickable rows:** `TableRow interactive` for the mouse, plus a real
  `<Link>` in the first cell for keyboard and screen-reader users.
- **Rows needing attention:** `TableRow tone="danger"`, always paired with a
  badge or icon in a cell. Status is never shown by color alone.
- **Forms:** every form is `useZodForm(schema, defaults)` (`lib/form.ts`,
  react-hook-form + zod) with its schema in `lib/schemas.ts`. Text inputs use
  `{...form.register('x')}`; `Select`, `Checkbox` and `TagPicker` go through
  `<Controller>`. Pass `form.formState.errors.x?.message` to `Field error` and
  set `aria-invalid`. Validation runs on submit, then live. Submit buttons stay
  enabled so the user can press them and see what's missing (the exception is Save
  on an unchanged settings form). `<form onSubmit noValidate>` so Enter
  submits; the footer order is Cancel (outline) then the primary action, right-aligned.
- **Pagination:** reset to page 1 whenever filters or sort change; keep the
  current page visible while the next one loads (`keepPreviousData`).

## Writing

- **Sentence case everywhere:** "Create ticket", "Custom fields", "Mobile number".
  Proper nouns stay capitalized ("Slack", "SLA").
- **Buttons are verbs plus the object:** "Create tag", "Remove member", "Save".
  Avoid "OK", "Submit", and "Yes".
- **Errors:** the title says what failed ("Couldn't save tag"); the body says
  why or what to do next, in plain words. Never blame the user; never show
  codes or JSON.
- **Empty states:** a title saying what's empty, one line saying why or what to do, then an action.
- **Validation:** tell the user what to do ("Choose a team."), not what went wrong ("Team is required").
- **Placeholders:** examples ("e.g. Billing"), never instructions; a field's label and hint carry the meaning.
- Use "—" for a missing value, "…" (one character) for in-progress text ("Creating…").

## Accessibility checklist

- One `h1` per page (`PageHeader`); headings don't skip levels.
- Every control has a visible label (`Field`) or an `aria-label`.
- Every icon-only button has an `aria-label` and a `Tooltip`; decorative icons get `aria-hidden`.
- Every dialog has a `DialogTitle` and a `DialogDescription`.
- Everything works with the keyboard: rows have a link, sort headers are buttons, and chips are toggle buttons.
- Status is never shown by color alone.

## Adding something new

1. Check this doc, `/design`, and `components/ui/` first.
2. If an existing component fits, use it. Extend it with a variant or prop
   rather than overriding its classes from outside.
3. If nothing fits, build it in `components/ui/` on Base UI and tokens, add
   it to `/design` and to this doc, then use it.
4. New color, shadow, or motion? Add the token to `index.css` (light and dark) and
   the table above first.
5. `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` must pass (CI runs all four).
   Add an e2e test in `frontend/e2e/` for any new user flow.
