# Slacker — instructions for Claude

Before making any frontend UI change (new page, component, dialog, or styling
edit), read `docs/DESIGN_SYSTEM.md` and build with it:

- Assemble UI from `frontend/src/components/ui/` (Base UI + Tailwind,
  shadcn-style). Radix is not used.
- Use the tokens in `frontend/src/index.css` for every color, shadow, and
  motion value; never write raw values in components.
- Every data view handles its loading (`Skeleton`), empty (`EmptyState`),
  and error (`ErrorState`) states; mutations report their outcome through
  `meta` in `hooks/useApi.ts`.
- Follow the doc's Writing section for all UI copy.

If a change needs something the doc doesn't cover (a new heading size, color,
component, or state), add it to `docs/DESIGN_SYSTEM.md` **and** to the `/design`
gallery (`frontend/src/pages/DesignSystem.tsx`) in the same change.

`npm run lint` in `frontend/` runs the design-system check
(`scripts/check-design.mjs`); it must pass.
