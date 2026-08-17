// Which of our claimed marks still exist, and what to do about the ones that do not.
//
// simpleicons is being pruned. Brands are removed from it on trademark grounds
// — Disney, Microsoft, Adobe, Canva, Slack, LinkedIn, Xbox, Amazon, OpenAI,
// Allianz and AXA have all gone — and a catalogue entry pointing at a removed
// slug is worse than one pointing at nothing: the app fires a request, waits
// for it to fail, and only then draws the monogram it could have drawn at once.
//
// Run after any icon change:  node scripts/audit-icons.mjs [--fix]
//
// --fix rewrites src/services.json, nulling every slug the CDN no longer serves
// and applying the replacements below. Without it, this only reports.

import { readFileSync, writeFileSync } from 'node:fs'

const PATH = new URL('../data/services.json', import.meta.url)
const catalog = JSON.parse(readFileSync(PATH, 'utf8'))

// Where a brand still has a mark under a different name. Checked, not guessed:
// every one of these was fetched before it was written down.
const REPLACEMENTS = {
  telekom: 'deutschetelekom',
}

const fix = process.argv.includes('--fix')
const seen = new Map()

async function serves(slug) {
  if (seen.has(slug)) return seen.get(slug)
  const res = await fetch(`https://cdn.simpleicons.org/${slug}/ffffff`, { method: 'HEAD' })
  seen.set(slug, res.ok)
  return res.ok
}

let dead = 0
let moved = 0

for (const service of catalog.services) {
  const slug = service.simpleIcons
  if (!slug) continue
  if (await serves(slug)) continue

  const alternative = REPLACEMENTS[slug]
  if (alternative && (await serves(alternative))) {
    console.log(`${service.id}: ${slug} → ${alternative}`)
    if (fix) service.simpleIcons = alternative
    moved++
    continue
  }

  console.log(`${service.id}: ${slug} is gone — falls back to a monogram`)
  if (fix) service.simpleIcons = null
  dead++
}

if (fix) {
  writeFileSync(PATH, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(`\nrewrote services.json: ${moved} moved, ${dead} nulled`)
} else {
  console.log(`\n${moved} could move, ${dead} are gone. Re-run with --fix to apply.`)
}
