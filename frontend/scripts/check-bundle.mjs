#!/usr/bin/env node
// Bundle-size budget. Run after `vite build` (npm run build does both).
// Fails if the JavaScript a first visit downloads grows past its limit, so
// size regressions are caught in CI instead of noticed later.
//
// "First load" = the app entry plus everything the Dashboard route needs,
// following static imports only (lazy chunks load later, on demand).
// Sizes are gzipped, which is what the browser actually downloads.
//
// Over budget? Lazy-load the new page, dialog, or heavy library
// (see App.tsx and CreateTicketDialog.tsx for the pattern). Raise the
// budget only for a deliberate, justified addition — note why in the PR.
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = {
  // Baseline 183 kB (Sep 2026): React, router, Base UI, React Query. Small headroom on purpose.
  firstLoad: 190, // entry + Dashboard, gzipped
  anyChunk: 110, // no single chunk bigger than this, gzipped
}

const dist = new URL('../dist/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('.vite/manifest.json', dist), 'utf8'))
const gz = (file) => gzipSync(readFileSync(new URL(file, dist))).length / 1024

function closure(key, seen = new Set()) {
  if (seen.has(key)) return seen
  seen.add(key)
  for (const dep of manifest[key].imports ?? []) closure(dep, seen)
  return seen
}

const entry = Object.keys(manifest).find((k) => manifest[k].isEntry)
const dashboard = Object.keys(manifest).find((k) => k.endsWith('src/pages/Dashboard.tsx'))
if (!entry || !dashboard) throw new Error('entry or Dashboard chunk not found in the Vite manifest')

const firstLoad = new Set([...closure(entry), ...closure(dashboard)])
const firstLoadKb = [...firstLoad].reduce((sum, k) => sum + gz(manifest[k].file), 0)

let failed = false
console.log(`First load (entry + Dashboard): ${firstLoadKb.toFixed(1)} kB gzipped (budget ${BUDGET_KB.firstLoad} kB)`)
if (firstLoadKb > BUDGET_KB.firstLoad) failed = true

for (const [key, chunk] of Object.entries(manifest)) {
  if (!chunk.file.endsWith('.js')) continue
  const kb = gz(chunk.file)
  if (kb > BUDGET_KB.anyChunk) {
    console.error(`✖ ${chunk.file} (${key}) is ${kb.toFixed(1)} kB gzipped (budget ${BUDGET_KB.anyChunk} kB per chunk)`)
    failed = true
  }
}

if (failed) {
  console.error('\n✖ Over the bundle budget. Lazy-load the new code, or justify raising the budget in scripts/check-bundle.mjs.')
  process.exit(1)
}
console.log('✓ bundle within budget')
