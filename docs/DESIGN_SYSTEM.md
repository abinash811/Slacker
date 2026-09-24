# Design system

This is the source of truth for how the Slacker dashboard looks and behaves.
Any new page, dialog, or component must be built from what's documented here —
not by eyeballing an existing page and copying its Tailwind classes by hand.
If something you need isn't here, extend this doc in the same change that adds it.

## Typography

- **Typeface:** Inter, loaded via Google Fonts in `frontend/index.html`, applied
  to `body` in `frontend/src/index.css`. Never set `font-family` anywhere else —
  there should be zero matches for `font-family`/`fontFamily` outside `index.css`.
- **Scale** — use these components, don't hand-write the classes:

  | Use | Component | Renders as |
  |---|---|---|
  | Top-level page title (one per page) | `PageHeader` (`components/ui/typography.tsx`) | `h1 text-lg font-semibold` + optional `text-sm text-muted-foreground` description + right-aligned `actions` slot |
  | Settings section title (inside a Settings tab) | `SettingsPageHeader` (`components/SettingsPageHeader.tsx`) | `h2 text-base font-semibold` + optional description |
  | Card/section title | `CardTitle` (`components/ui/card.tsx`) | `h3 text-sm font-medium text-muted-foreground` (override className for emphasis, e.g. danger cards) |
  | Secondary paragraph text | `Muted` (`components/ui/typography.tsx`) | `p text-sm text-muted-foreground` |
  | Field labels, meta info, timestamps, table headers | `Caption` (`components/ui/typography.tsx`) | `text-xs text-muted-foreground`, pass `as="dt"` when used inside a `<dl>` |
  | Empty list/card placeholder | `EmptyState` (`components/ui/typography.tsx`) | `variant="inline"` (filled block, dashboard panels) or `variant="bordered"` (settings lists) |

  Don't invent a new heading size. If none of the above fits, that's a sign the
  page needs a new documented pattern, not a one-off `text-xl font-bold`.

## Color

All color comes from CSS custom properties defined once in `frontend/src/index.css`
(`:root`), mapped into Tailwind via `@theme inline`, with a parallel (currently
unused) `:root[data-theme="dark"]` block ready for a future theme toggle.

| Token | Use |
|---|---|
| `background` / `foreground` | page background / primary text |
| `card` / `card-foreground` | card surfaces |
| `muted` / `muted-foreground` | subdued backgrounds and secondary text |
| `border` | all borders (also the global default via `* { border-color: var(--border) }`) |
| `primary` / `primary-foreground` | primary buttons, active/selected states |
| `accent` / `accent-foreground` | tag badges, subtle highlights |
| `success` / `success-bg` | resolved/on-track states |
| `warning` / `warning-bg` | medium-urgency states |
| `danger` / `danger-bg` | SLA breaches, destructive actions, errors |

**Rule: never write a raw hex/rgb color or an inline `style={{ color: ... }}` in a
component.** Always go through a Tailwind class backed by one of these tokens
(`text-danger`, `bg-muted`, `border-border`, etc). This is currently 100% true
across the codebase — keep it that way. If a new semantic color is needed, add
the token to `index.css` (light + dark) first, then use it.

## Components

Shared primitives live in `frontend/src/components/ui/`: `button`, `card`,
`badge`, `dialog`, `input`, `label`, `select`, `share-bar`, `typography`.
Composite, feature-level components (`FilterBar`, `CreateTicketDialog`,
`StatTile`, `StatusPriorityBadges`, `SettingsPageHeader`, `TagPicker`) live in
`components/`. Before writing new markup for something that looks like a
button, badge, card, dialog, form field, page header, or empty state — **use
the existing component**, don't recreate its classes inline.

The "+ New" dialog pattern (`AddDialog` in `FormFields.tsx`, the role/team
dialogs in `TeamsPermissions.tsx`) is the standard way to add an item to a
list — a small `Dialog` triggered by a `Button` with a `Plus` icon, never a
permanently-visible inline add form.

## Interaction rules

- **Hover:** rows and nav items use `hover:bg-muted/50` (or `/40`, `/50` depending
  on surface) and `hover:text-foreground` on muted text. Table header cells that
  sort get `hover:text-foreground` too, since they're clickable.
- **Transitions:** interactive elements that change background/text on
  hover/active use `transition-colors`.
- **Status color-coding is never color-alone:** a danger/warning/success state
  always pairs the token color with an icon (`AlertTriangle`, `CheckCircle2`)
  and/or text label (e.g. "Breached", "On track") — see `StatusPriorityBadges.tsx`
  and the SLA cell in `Tickets.tsx`.
- **Row emphasis:** a row needing attention (SLA-breached tickets) gets
  `border-l-danger bg-danger-bg/30` rather than changing text color alone.
- **Empty states:** always through the `EmptyState` component (see Typography
  table above), never a bare centered `<p>`.
- **Forms:** always `Label` + `Input`/`Select` pairs from `components/ui`,
  grouped visually with a `Section`-style wrapper when a dialog has more than
  one logical group of fields (see `CreateTicketDialog.tsx`).

## Adding something new

1. Check this doc and the `components/ui/` + `components/` folders first.
2. If an existing component fits, use it — don't hand-roll the same visual
   result with raw Tailwind classes.
3. If nothing fits, build the new primitive in `components/ui/`, document it
   here in the same change, then use it.
4. Never introduce a new font, a new heading size, or a raw color value
   without adding it to this doc first.
