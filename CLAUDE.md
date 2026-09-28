# Slacker — instructions for Claude

Before making any frontend UI change (new page, component, dialog, or styling
edit), read `docs/DESIGN_SYSTEM.md` and build with it:

- **shadcn only.** `frontend/src/components/ui/` holds official shadcn/ui
  components (base-nova style on Base UI), installed with the CLI and never
  edited. Need one that isn't there? Run `npx shadcn add <name>` in `frontend/`.
  Radix is not used; don't import `@base-ui/react` directly.
- Need custom behavior? Compose it in `frontend/src/components/patterns/` from
  `ui/` components (`DataTable`, `FormField`, `OptionSelect`, `EmptyState`,
  `ErrorState`, `ConfirmDialog`, `ToneBadge`, `ButtonLink`, `LoadingButton`,
  typography roles). Never write the same markup twice in pages.
- Use the theme tokens in `frontend/src/index.css` for every color; never
  write raw values in components.
- Every data view handles its loading (`Skeleton`), empty (`EmptyState`),
  and error (`ErrorState`) states; mutations report their outcome through
  `meta` in `hooks/useApi.ts`. Forms use `useZodForm` + schemas in `lib/schemas.ts`.
- Follow the doc's Writing section for all UI copy.

If a change needs something the doc doesn't cover, add it to
`docs/DESIGN_SYSTEM.md` **and** to the `/design` gallery
(`frontend/src/pages/DesignSystem.tsx`) in the same change.

In `frontend/`: `npm run lint`, `npm run typecheck`, `npm test`,
`npm run test:e2e` and `npm run check:shadcn` must pass.
