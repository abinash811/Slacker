#!/usr/bin/env node
// Design-system guardrail. Fails (exit 1) when code bypasses the system in
// docs/DESIGN_SYSTEM.md. Runs as part of `npm run lint` and in CI.
//
// Rules apply to src/**/*.{ts,tsx}. Files under src/components/ui/ are the
// system itself, so the "use the primitive" rules don't apply to them.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SRC = new URL('../src', import.meta.url).pathname
const UI_DIR = join(SRC, 'components', 'ui') + sep

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white'

/** [regex, message, appliesInsideUi] */
const RULES = [
  [/#[0-9a-fA-F]{3,8}\b(?![\w-])/, 'Raw hex color — use a token class (text-danger, bg-muted…) or add a token to index.css.', true],
  [/\b(?:rgb|rgba|hsl|hsla|oklch)\(/, 'Raw color function — colors live only in index.css tokens.', true],
  [new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|outline|from|via|to|divide|placeholder|decoration|shadow)-(?:${PALETTE})(?:-\\d{2,3})?\\b`), 'Tailwind palette color — use a semantic token (e.g. text-danger, bg-muted).', true],
  [/\bshadow-\[/, 'Arbitrary shadow — use shadow-card / shadow-popover / shadow-dialog / shadow-toast.', true],
  [/\bshadow-(?:sm|md|lg|xl|2xl)\b/, 'Tailwind default shadow — use shadow-card / shadow-popover / shadow-dialog / shadow-toast.', true],
  [/font-?[fF]amily/, 'Font is set once on <body> in index.css.', true],
  [/\bfont-bold\b|\btext-(?:xl|3xl|4xl|5xl|6xl)\b/, 'Off-scale type — use the typography components (PageHeader, SectionHeader, CardTitle…).', true],
  [/@radix-ui\//, 'Radix is not used — build on @base-ui/react via components/ui.', true],
  [/<h[1-4][\s>/]/, 'Raw heading — use PageHeader / SectionHeader / CardTitle / SectionLabel.', false],
  [/<table[\s>/]/, 'Raw <table> — use Table, TableHeader, TableRow… from components/ui/table.', false],
  [/<select[\s>/]/, 'Native <select> — use Select from components/ui/select.', false],
  [/<textarea[\s>/]/, 'Raw <textarea> — use Textarea from components/ui/input.', false],
  [/<input[\s>/]/, 'Raw <input> — use Input / Checkbox from components/ui.', false],
  [/<label[\s>/]/, 'Raw <label> — use Field (or Label) from components/ui.', false],
  [/style=\{\{/, 'Inline style — use token-backed classes. (Dynamic sizes belong inside a ui/ primitive.)', false],
  [/\bbg-black\b|\bbg-white\b/, 'Use bg-overlay / bg-background tokens.', true],
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
  const inUi = file.startsWith(UI_DIR)
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
