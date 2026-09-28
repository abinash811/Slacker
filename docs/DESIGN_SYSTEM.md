# Design system

The source of truth for how Slacker looks and behaves. Every page, dialog, and
component is assembled from what's documented here. If you need something
that isn't here, add it here (and to `/design`) in the same change.

## The rule: shadcn only

Every UI building block is an **official [shadcn/ui](https://ui.shadcn.com)
component**, installed with the shadcn CLI (`base-nova` style, built on
[Base UI](https://base-ui.com)) and **never edited**.

| Folder | What goes there |
|---|---|
| `frontend/src/components/ui/` | Unmodified shadcn components, exactly as `npx shadcn add <name>` writes them. Nothing else. |
| `frontend/src/components/patterns/` | Reusable app patterns **composed only from** `ui/` components: `DataTable`, `FormField`, `OptionSelect`, `EmptyState`/`ErrorState`, `ConfirmDialog`, `ToneBadge`, `ButtonLink`/`LoadingButton`, and the typography roles. |
| `frontend/src/components/` | Product components (`StatTile`, `TagPicker`, `FilterBar`…), built from `ui/` and `patterns/`. |

- **Need a component?** Check [the shadcn catalog](https://ui.shadcn.com/docs/components)
  and add it with `npx shadcn add <name>` (run in `frontend/`).
- **Need different behavior or looks?** Don't edit `ui/`. Pass `className` or
  props, or compose a pattern in `patterns/`.
- **Updating a component:** `npx shadcn add <name> --overwrite`.

**How it's enforced:**

- **`npm run check:shadcn`** (CI job "components/ui is unmodified shadcn")
  compares every file in `ui/` with what the shadcn CLI installs, and fails
  on any edit or any file that isn't a shadcn component.
- **`npm run lint`** runs `scripts/check-design.mjs`, which fails on raw
  colors, palette classes, custom shadows, off-scale type, raw
  `<table>`/`<input>`/headings outside `patterns/`, inline styles, direct
  `@base-ui/react` imports, and Radix.
- **`/design`**: a page showing every component and pattern in its states (not
  linked from the nav; open it directly). Source: `frontend/src/pages/DesignSystem.tsx`.

## Stack

- **Components:** shadcn/ui, `base-nova` style, on Base UI (`components.json`).
- **Animations:** built into the shadcn components (`tw-animate-css` + `shadcn/tailwind.css`).
- **Icons:** `lucide-react`. Inside shadcn buttons and badges, mark an icon
  with `data-icon="inline-start"` or `"inline-end"` so spacing is correct.
- **Toasts:** shadcn Sonner, via `toast` from `lib/toast.ts`.
- **Tables:** TanStack Table v9 behind the `DataTable` pattern.
- **Forms:** react-hook-form + zod.

## Theme (`frontend/src/index.css`)

shadcn's standard token set (`background`, `foreground`, `card`, `popover`,
`primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`,
`ring`, `chart-1…5`, `sidebar-*`), with Slacker's values:

- **`primary` and `ring`:** indigo (brand). Everything else uses shadcn's
  neutral palette.
- **Two additions for status**, which shadcn doesn't ship: `success`
  (emerald) and `warning` (amber-700, chosen for AA contrast on white). Use
  them as `text-success`, `bg-success/10`, `text-warning`, `bg-warning/10`.
- **Font:** Inter (`--font-sans`).
- **Radius:** `--radius: 0.625rem`, shadcn's default scale.
- **Dark mode:** a full `.dark` palette is defined, but the app is forced to
  light for now (`<Toaster theme="light">` in `main.tsx`).

`index.css` is the only place raw color values may appear. Elevation (shadows
and rings) comes from the shadcn components themselves; app code adds no
shadows. Motion comes from the components too; everything respects
`prefers-reduced-motion`.

## Typography

Inter, set once through `--font-sans`. Never set a font anywhere else.
The text roles below live in `components/patterns/typography.tsx` (shadcn ships no heading components).

| Use | Component | Renders |
|---|---|---|
| Page title (exactly one per page) | `PageHeader` | `h1 text-lg font-semibold` + description + `actions` |
| Section title (Settings tabs, page sections) | `SectionHeader` | `h2 text-base font-semibold` + description + `actions`; owns its `mb-4` |
| Card title | shadcn `CardTitle` (add `text-muted-foreground` for quiet panel titles) | shadcn default |
| Group label (sidebar lists, panel headings) | `SectionLabel` | `text-xs font-medium uppercase tracking-wide` |
| Secondary paragraph | `Muted` | `text-sm text-muted-foreground` |
| Meta, timestamps, read-only field labels | `Caption` | `text-xs text-muted-foreground` (`as="dt"` in a `<dl>`) |
| Stat values | `StatTile` | `text-2xl font-semibold tabular-nums`, the only larger size |

Use `tabular-nums` wherever numbers line up in columns. Don't invent a size;
`text-xl` and larger, and `font-bold`, fail the lint check.

## Components

**shadcn components in use** (`components/ui/`): `alert`, `alert-dialog`,
`badge`, `button`, `card`, `checkbox`, `dialog`, `empty`, `field`, `input`,
`label`, `pagination`, `progress`, `select`, `separator`, `skeleton`,
`sonner`, `spinner`, `table`, `textarea`, `toggle`, `tooltip`. Use them as documented on
ui.shadcn.com.

| Need | Use |
|---|---|
| Button | shadcn `Button` (variants `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`; sizes `xs`, `sm`, `default`, `lg`, `icon*`) |
| Button that's busy | `LoadingButton` (pattern: `Button` + `Spinner`) |
| Link that looks like a button | `ButtonLink` (pattern: `buttonVariants` on a router `Link`). Never `<Button render={<Link/>}>`: that announces a link as a button |
| Text input / textarea | shadcn `Input`, `Textarea` |
| Dropdown | `OptionSelect` (pattern over shadcn `Select`: string values, `null` = nothing chosen, `emptyLabel` adds a clearable "Unassigned"/"All …" row) |
| Checkbox with label | `CheckboxField` (pattern: shadcn `Field` + `Checkbox`) |
| Form field | `FormField` (pattern: shadcn `Field`, `FieldLabel`, `FieldDescription`, `FieldError`); `required={false}` appends "(optional)" |
| Group of fields in a long form | `FormSection` (shadcn `FieldSet` + `FieldLegend`) |
| Dialog | shadcn `Dialog`, `DialogTrigger render={<Button/>}`, `DialogContent` (size with `className="sm:max-w-md"`), `DialogHeader`, `DialogTitle`, `DialogDescription` (always include one), `DialogFooter` |
| "+ New" item flow | `CreateItemDialog` (`components/`) |
| Destructive confirmation | `ConfirmDialog` (pattern over shadcn `AlertDialog`) |
| List of records | `DataTable` (pattern: shadcn's data-table recipe, meaning TanStack Table + shadcn `Table`, `Button`, `Pagination`). Columns from `columnHelper<T>()` in `lib/data-table.ts`; server-side sorting and paging; built-in loading, error and empty states. Per-column `meta`: `muted`, `align`, `className`, `invertSortIndicator`; `enableSorting: false` on columns the API can't sort. Omit `sorting` for a static table |
| Status pill | `ToneBadge` (pattern over shadcn `Badge`: tones `neutral`, `info`, `success`, `warning`, `danger`); tickets use `StatusBadge`, `PriorityBadge`, `SlaBadge` |
| Card | shadcn `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent` |
| Metric | `StatTile` / `StatTileSkeleton` |
| Part-of-whole bar | shadcn `Progress` |
| Multi-select chips | `TagPicker` (shadcn `Toggle`s) |
| Hint on hover | shadcn `Tooltip` (required on icon-only buttons) |
| Navigation link | `NavItem` (`components/`, ghost `buttonVariants`) |
| Empty / failed list | `EmptyState` / `ErrorState` (patterns over shadcn `Empty`) |

## States

Every interactive element and every data view must handle all of its states.

### Interaction states

| State | Treatment |
|---|---|
| Hover | Fill `bg-muted` (buttons, nav) or `bg-muted/50` (rows, list items); muted text goes to `text-foreground` |
| Pressed | shadcn buttons nudge down 1px |
| Keyboard focus | shadcn's 3px soft `ring` on `:focus-visible` (built into every component). Plain links and other custom clickables use the `focus-ring` utility, which matches it |
| Selected / active | `bg-muted text-foreground` (nav, list); `aria-pressed` / `aria-current` / `aria-sort` set accordingly |
| Disabled | `opacity-50` and no pointer events. Explain why nearby when it isn't obvious (e.g. a placeholder saying "Everyone is already a member") |
| Busy | `LoadingButton`; controls disable while their mutation is pending |
| Invalid | `aria-invalid` on the control (red border + ring) and `FormField error="…"` |

### Loading

- **Lists, tables, cards:** shadcn `Skeleton` (`DataTable` and `StatTileSkeleton` include it)
  shaped like the content. Never a blank area, never a centered spinner for
  a whole page.
- **Whole page (detail views):** a skeleton of the page layout.
- **A single action:** `LoadingButton`.
- Only show skeletons on the first load (`isPending`); keep stale data on screen while refetching.

### Empty

Always `EmptyState`: plain inside a card or table (`DataTable`'s `empty` prop), `bordered`
when standalone on a page. Distinguish:

- **Nothing exists yet:** say what will appear and how ("No tags yet —
  Create one so people can label tickets"), and offer the create action if the
  user can take it.
- **Filters hide everything:** "No tickets match these filters" + a
  **Clear filters** button.
- **Good news:** "Nothing pending" with a `CheckCircle2` icon.

### Errors

| Situation | Use |
|---|---|
| A list, card, or page failed to load | `ErrorState` with `onRetry` (`bordered` when standalone) |
| A dialog's submit failed | shadcn `Alert variant="destructive"` (icon, `AlertTitle`, `AlertDescription`) inside the dialog, above the footer; keep the dialog open and keep the input |
| A field is invalid | `FormField error` + `aria-invalid`; validate on submit, then live |
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
- **Destructive actions** (remove, delete): `Button variant="destructive"` trigger → `ConfirmDialog`
  with a specific title ("Remove Priya?") and what happens next. Reversible
  actions (Archive/Restore) don't need confirmation.
- **Clickable rows:** `DataTable onRowClick` for the mouse, plus a real
  `<Link>` in the first cell for keyboard and screen-reader users.
- **Rows needing attention:** `DataTable rowTone` → `'danger'`, always paired with a
  badge or icon in a cell. Status is never shown by color alone.
- **Forms:** every form is `useZodForm(schema, defaults)` (`lib/form.ts`,
  react-hook-form + zod) with its schema in `lib/schemas.ts`. Text inputs use
  `{...form.register('x')}`; `OptionSelect`, `CheckboxField` and `TagPicker` go through
  `<Controller>`. Pass `form.formState.errors.x?.message` to `FormField error` and
  set `aria-invalid`. Validation runs on submit, then live. Submit buttons stay
  enabled so the user can press them and see what's missing (the exception is Save
  on an unchanged settings form). `<form onSubmit noValidate>` so Enter
  submits; the footer order is Cancel (outline) then the primary action, right-aligned.
- **Pagination:** reset to page 1 whenever filters or sort change; keep the
  current page visible while the next one loads (`keepPreviousData`).

## Performance

- **Every page is lazy-loaded** (`React.lazy` in `App.tsx`); `Layout` shows
  `PageSkeleton` while a page's code arrives. Add new pages the same way.
- **Heavy, rarely-opened UI loads on demand.** Example: the create-ticket form
  (react-hook-form + zod) is fetched when the dialog opens (`CreateTicketDialog`).
- **Budget, enforced in CI** (`npm run check:bundle`, after a build): the
  first visit may download at most **190 kB of gzipped JavaScript**, and no
  single chunk may exceed 110 kB. Over budget means lazy-load something, not
  raise the number. Raise it only for a deliberate addition, with the reason
  noted in `scripts/check-bundle.mjs` and the PR.

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
- Every control has a visible label (`FormField`) or an `aria-label`.
- Every icon-only button has an `aria-label` and a `Tooltip`; decorative icons get `aria-hidden`.
- Every dialog has a `DialogTitle` and a `DialogDescription`.
- Everything works with the keyboard: rows have a link, sort headers are buttons, and tag chips are toggles.
- Table headers are real column headers (`DataTable` sets `scope="col"` and `aria-sort`).
- Status is never shown by color alone.

## Adding something new

1. Check this doc, `/design`, `components/patterns/`, and `components/ui/` first.
2. If a shadcn component you haven't installed fits, run `npx shadcn add <name>` in `frontend/`.
3. If you need a reusable combination, compose it in `components/patterns/` from
   `ui/` components only, then add it to `/design` and this doc.
4. Never edit `components/ui/`, and never import `@base-ui/react` directly.
5. New color? Add the token to `index.css` (light and `.dark`) and to the Theme section above.
6. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`,
   `npm run check:shadcn` and (after a build) `npm run check:bundle` must pass (CI runs all of them).
   Add an e2e test in `frontend/e2e/` for any new user flow.
