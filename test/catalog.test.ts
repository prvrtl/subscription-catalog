import { describe, expect, it } from 'vitest'
import { SERVICES, annualCents, byId, cheapestPlan, faviconUrl, iconUrl, search } from '../src/index'

describe('data', () => {
  it('has entries', () => {
    expect(SERVICES.length).toBeGreaterThan(50)
  })

  it('keeps every price in whole cents', () => {
    for (const s of SERVICES) {
      for (const p of s.plans) {
        expect(Number.isInteger(p.priceCents), `${s.id} / ${p.name}`).toBe(true)
      }
    }
  })

  it('has unique ids', () => {
    expect(new Set(SERVICES.map((s) => s.id)).size).toBe(SERVICES.length)
  })

  it('cites a source wherever pricing claims to be published', () => {
    for (const s of SERVICES.filter((s) => s.pricing === 'published')) {
      expect(s.source, s.id).toMatch(/^https:\/\//)
    }
  })
})

describe('search', () => {
  it('ranks a prefix above a substring', () => {
    expect(search('net')[0].id).toBe('netflix')
  })

  it('finds by alias', () => {
    expect(search('gez').map((s) => s.id)).toContain('rundfunk')
    expect(search('49 euro ticket').map((s) => s.id)).toContain('deutschlandticket')
  })

  it('finds N26 and its mobile plans', () => {
    const ids = search('n26', 10).map((s) => s.id)
    expect(ids).toContain('n26')
    expect(ids).toContain('n26sim')
    expect(ids).toContain('n26esim')
  })

  it('returns nothing for an empty query', () => {
    expect(search('')).toEqual([])
    expect(search('   ')).toEqual([])
  })
})

describe('helpers', () => {
  it('normalises billing frequency to a year', () => {
    expect(annualCents({ name: 'x', priceCents: 1000, currency: 'EUR', cadence: 'monthly' })).toBe(12_000)
    expect(annualCents({ name: 'x', priceCents: 3000, currency: 'EUR', cadence: 'quarterly' })).toBe(12_000)
    expect(annualCents({ name: 'x', priceCents: 12_000, currency: 'EUR', cadence: 'yearly' })).toBe(12_000)
    // 52.18 weeks a year, not a flat 52.
    expect(annualCents({ name: 'x', priceCents: 1000, currency: 'EUR', cadence: 'weekly' })).toBe(52_179)
  })

  it('picks the cheapest plan', () => {
    const netflix = byId('netflix')!
    expect(cheapestPlan(netflix)!.priceCents).toBe(499)
  })

  it('builds icon urls, or null when there is no mark', () => {
    expect(iconUrl(byId('netflix')!)).toBe('https://cdn.simpleicons.org/netflix/E50914')
    expect(iconUrl(byId('deutschlandticket')!)).toBe(null)
    expect(faviconUrl(byId('deutschlandticket')!)).toContain('bahn.de')
  })
})

describe('N26', () => {
  it('carries the published account plans', () => {
    const n26 = byId('n26')!
    expect(n26.pricing).toBe('published')
    expect(Object.fromEntries(n26.plans.map((p) => [p.name, p.priceCents]))).toEqual({
      Standard: 0,
      Smart: 490,
      Go: 990,
      Metal: 1690,
    })
  })

  it('marks the SIM plans as estimates, since N26 does not publish them', () => {
    const sim = byId('n26sim')!
    expect(sim.pricing).toBe('estimate')
    expect(sim.plans.map((p) => p.name)).toContain('Large — 100 GB')
  })
})
