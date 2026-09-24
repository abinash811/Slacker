# Slacker — instructions for Claude

Before making any frontend UI change (new page, component, dialog, or styling
edit), read `docs/DESIGN_SYSTEM.md` and build with it — reuse the documented
typography components (`PageHeader`, `SettingsPageHeader`, `CardTitle`,
`Muted`, `Caption`, `EmptyState`), the color tokens defined in
`frontend/src/index.css`, and the existing `components/ui/` primitives instead
of hand-writing new Tailwind class combinations that duplicate them.

If a change needs something the doc doesn't cover (a new heading size, a new
color, a new shared component), add it to `docs/DESIGN_SYSTEM.md` in the same
change, rather than introducing a one-off pattern silently.
