#!/usr/bin/env node
// Checks data/services.json before anything depends on it. Run in CI and
// before committing an entry.

import { readFileSync } from 'node:fs'

const CADENCES = new Set(['weekly', 'monthly', 'quarterly', 'yearly'])
const data = JSON.parse(readFileSync(new URL('../data/services.json', import.meta.url), 'utf8'))

const errors = []
const warnings = []
const seenIds = new Set()
const seenNames = new Set()

for (const [i, s] of data.services.entries()) {
  const at = `services[${i}] ${s.id ?? '(no id)'}`

  if (!s.id || !/^[a-z0-9]+$/.test(s.id)) errors.push(`${at}: id must be lowercase alphanumeric`)
  if (seenIds.has(s.id)) errors.push(`${at}: duplicate id`)
  seenIds.add(s.id)

  if (!s.name) errors.push(`${at}: name is required`)
  const key = s.name?.toLowerCase()
  if (seenNames.has(key)) warnings.push(`${at}: another service is also called "${s.name}"`)
  seenNames.add(key)

  if (!/^#[0-9A-Fa-f]{6}$/.test(s.brandColor ?? '')) errors.push(`${at}: brandColor must be #RRGGBB`)
  if (s.domain !== null && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(s.domain ?? '')) {
    errors.push(`${at}: domain looks wrong: ${s.domain}`)
  }
  // Every entry needs at least one way to show a mark, or it falls back to a
  // monogram, which is fine but worth knowing about.
  if (!s.simpleIcons && !s.domain) warnings.push(`${at}: no icon and no domain, will render a monogram`)

  if (!CADENCES.has(s.defaultCadence)) errors.push(`${at}: bad defaultCadence ${s.defaultCadence}`)
  if (!Array.isArray(s.aliases)) errors.push(`${at}: aliases must be an array`)
  if (!['published', 'estimate'].includes(s.pricing)) errors.push(`${at}: pricing must be published or estimate`)
  if (s.pricing === 'published' && !s.source) errors.push(`${at}: published pricing needs a source url`)

  if (!Array.isArray(s.plans) || s.plans.length === 0) {
    errors.push(`${at}: needs at least one plan`)
    continue
  }

  const planNames = new Set()
  for (const p of s.plans) {
    const pat = `${at} plan "${p.name}"`
    if (!p.name) errors.push(`${at}: plan without a name`)
    if (planNames.has(p.name)) errors.push(`${pat}: duplicate plan name`)
    planNames.add(p.name)

    // Money is integer cents everywhere. A float here would round unpredictably
    // wherever it is consumed.
    if (!Number.isInteger(p.priceCents)) errors.push(`${pat}: priceCents must be an integer`)
    if (p.priceCents < 0) errors.push(`${pat}: priceCents cannot be negative`)
    if (p.priceCents > 100_000) warnings.push(`${pat}: ${p.priceCents} cents looks high`)
    if (!CADENCES.has(p.cadence)) errors.push(`${pat}: bad cadence ${p.cadence}`)
    if (p.currency !== data.currency) warnings.push(`${pat}: currency ${p.currency} differs from catalog default`)
  }
}

const plans = data.services.reduce((n, s) => n + s.plans.length, 0)
console.log(`${data.services.length} services, ${plans} plans`)

for (const w of warnings) console.log(`  warn  ${w}`)
for (const e of errors) console.log(`  ERROR ${e}`)

if (errors.length) {
  console.log(`\n${errors.length} error(s)`)
  process.exit(1)
}
console.log(warnings.length ? `\n${warnings.length} warning(s), no errors` : '\nall good')
