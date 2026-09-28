#!/usr/bin/env node
// Verifies src/components/ui/ contains only official shadcn/ui components,
// unmodified. For each file, asks the shadcn CLI what it would install
// (`shadcn add <name> --view`) and compares. Needs network access to
// ui.shadcn.com. Runs in CI; locally: `npm run check:shadcn`.
//
// Only difference ignored: a leading "use client" directive, which the CLI
// adds or omits depending on install order (irrelevant in a Vite app).
//
// To update a component to the latest registry version:
//   npx shadcn add <name> --overwrite
// Need different behavior? Don't edit ui/ — compose it in components/patterns/.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const UI = new URL('../src/components/ui/', import.meta.url).pathname

const normalize = (text) =>
  text
    .replace(/^\s*["']use client["'];?\s*\n+/, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim()

function registryVersion(name, file) {
  const out = execFileSync('npx', ['shadcn', 'add', name, '--view', `src/components/ui/${file}`], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const lines = out.split('\n')
  const start = lines.findIndex((l) => l.includes('┌──'))
  const end = lines.findIndex((l, i) => i > start && l.includes('└──'))
  if (start === -1 || end === -1) throw new Error(`unexpected CLI output:\n${out}`)
  return lines
    .slice(start + 1, end)
    .map((l) => l.replace(/^│ │ ?/, ''))
    .join('\n')
}

let failures = 0
for (const file of readdirSync(UI).sort()) {
  const name = file.replace(/\.tsx?$/, '')
  let expected
  try {
    expected = registryVersion(name, file)
  } catch (err) {
    failures++
    console.error(`✖ ${file}: not an official shadcn component (${String(err.message).split('\n')[0]})`)
    continue
  }
  if (normalize(readFileSync(join(UI, file), 'utf8')) !== normalize(expected)) {
    failures++
    console.error(`✖ ${file}: differs from shadcn. See: npx shadcn add ${name} --diff src/components/ui/${file}`)
  } else {
    console.log(`✓ ${file}`)
  }
}

if (failures) {
  console.error(
    `\n${failures} file(s) in components/ui/ are not unmodified shadcn components.\n` +
      'Revert local edits (compose custom behavior in components/patterns/), or run `npx shadcn add <name> --overwrite`.',
  )
  process.exit(1)
}
console.log('\n✓ components/ui/ matches the shadcn registry')
