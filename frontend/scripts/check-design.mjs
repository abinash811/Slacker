#!/usr/bin/env node
// Design-system guardrail. Fails (exit 1) when code bypasses the system in
// docs/DESIGN_SYSTEM.md. Runs as part of `npm run lint` and in CI.
//
// Rules apply to src/**/*.{ts,tsx}, except src/components/ui/ — that folder is
// unmodified shadcn/ui, verified separately by scripts/check-shadcn.mjs.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = new URL('../src', import.meta.url).pathname
const UI_DIR = join(SRC, 'components', 'ui') + sep
// Patterns compose raw elements on purpose; the 'use the component' rules skip them.
const PATTERNS_DIR = join(SRC, 'components', 'patterns') + sep

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white'

/** [regex, message, appliesInsideUi] */
const RULES = [
  [/#[0-9a-fA-F]{3,8}\b(?![\w-])/, 'Raw hex color — use a token class (text-destructive, bg-muted…) or add a token to index.css.', true],
  [/\b(?:rgb|rgba|hsl|hsla|oklch)\(/, 'Raw color function — colors live only in index.css tokens.', true],
  [new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|outline|from|via|to|divide|placeholder|decoration|shadow)-(?:${PALETTE})(?:-\\d{2,3})?\\b`), 'Tailwind palette color — use a semantic token (e.g. text-destructive, bg-muted).', true],
  [/\bshadow-/, 'No shadows in app code — surfaces come from shadcn components (Card, Dialog…), which own their elevation.', true],
  [/font-?[fF]amily/, 'Font is set once on <body> in index.css.', true],
  [/\bfont-bold\b|\btext-(?:xl|3xl|4xl|5xl|6xl)\b/, 'Off-scale type — use the typography components (PageHeader, SectionHeader, CardTitle…).', true],
  [/@radix-ui\//, 'Radix is not used — shadcn/ui here is built on Base UI.', true],
  [/from ['"]@base-ui\/react/, 'Use the shadcn component from components/ui/, not the Base UI primitive directly.', true],
  [/\b(?:bg|text|border|ring)-danger\b|\b(?:success|warning)-bg\b/, 'Removed token — use destructive / bg-success/10 / bg-warning/10.', true],
  [/<h[1-4][\s>/]/, 'Raw heading — use PageHeader / SectionHeader / CardTitle / SectionLabel.', false],
  [/<table[\s>/]/, 'Raw <table> — use DataTable (components/patterns) or shadcn Table.', false],
  [/<select[\s>/]/, 'Native <select> — use OptionSelect (components/patterns) or shadcn Select.', false],
  [/<textarea[\s>/]/, 'Raw <textarea> — use shadcn Textarea.', false],
  [/<input[\s>/]/, 'Raw <input> — use shadcn Input / Checkbox.', false],
  [/<label[\s>/]/, 'Raw <label> — use FormField (components/patterns) or shadcn Label.', false],
  [/style=\{\{/, 'Inline style — use token-backed classes. (Dynamic sizes belong inside a ui/ primitive.)', false],
  [/\bbg-black\b|\bbg-white\b/, 'Use theme tokens (bg-background, bg-foreground…).', true],
]

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) yield path
  }
}

let failures = 0
for (const file of walk(SRC)) {
  if (file.startsWith(UI_DIR)) continue
  const inUi = file.startsWith(PATTERNS_DIR)
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (line.includes('design-check-ignore')) return
      for (const [re, message, appliesInUi] of RULES) {
        if (inUi && !appliesInUi) continue
        if (re.test(line)) {
          failures++
          console.error(`${relative(process.cwd(), file)}:${i + 1}  ${message}\n    ${line.trim()}`)
        }
      }
    })
}

if (failures) {
  console.error(`\n✖ ${failures} design-system violation${failures === 1 ? '' : 's'}. See docs/DESIGN_SYSTEM.md.`)
  process.exit(1)
}
console.log('✓ design-system check passed')
