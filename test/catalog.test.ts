import { describe, expect, it } from 'vitest'
import { SERVICES, annualCents, byId, cheapestPlan, faviconUrl, iconUrl, search } from '../src/index.js'

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

describe('the fields that help somebody act', () => {
  it('only ever links somewhere over https', () => {
    // A management link is followed by a person who is about to type a password
    // into whatever it opens. http, or a link to somewhere that is not the
    // vendor, is not a broken feature — it is a phishing hop with our name on it.
    const bad: string[] = []
    for (const s of SERVICES) {
      for (const [kind, url] of Object.entries(s.manage ?? {})) {
        if (!url.startsWith('https://')) bad.push(`${s.id}.${kind}: ${url}`)
      }
    }
    expect(bad).toEqual([])
  })

  it('links to the vendor rather than anywhere else', () => {
    // Checked against the service's own domain, so a copy-paste error that
    // points Netflix at Spotify's cancel page fails here rather than in a
    // reader's browser. Apple is the exception the rule needs: every Apple
    // subscription is genuinely cancelled on apple.com, whatever the service.
    // Named one by one rather than allowed in bulk. Vendors legitimately manage
    // billing on a second domain, and every one of these was checked; a blanket
    // allowance would let the next copy-paste error through unnoticed.
    const ALLOWED_ELSEWHERE = [
      'apps.apple.com', // every Apple subscription, whatever the service
      'account.microsoft.com', // Microsoft 365 and Game Pass
      'amazon.de', // Prime and Audible
      'chatgpt.com', // OpenAI's product domain, distinct from openai.com
      'nordaccount.com', // Nord's billing portal, distinct from nordvpn.com
      'savelife.in.ua', // Come Back Alive
    ]
    const wrong: string[] = []
    for (const s of SERVICES) {
      if (!s.manage || !s.domain) continue
      const root = s.domain.split('.').slice(-2).join('.')
      for (const [kind, url] of Object.entries(s.manage)) {
        const host = new URL(url).hostname
        if (host.endsWith(root)) continue
        if (ALLOWED_ELSEWHERE.some((a) => host.endsWith(a))) continue
        wrong.push(`${s.id}.${kind} → ${host}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('writes a note in every language or in none', () => {
    // Half-translated notes are worse than untranslated ones: the reader gets
    // English inside a Ukrainian interface and cannot tell whether it is a
    // missing translation or a deliberate quotation.
    const partial = SERVICES.filter(
      (s) => s.notes && !(s.notes.en?.trim() && s.notes.de?.trim() && s.notes.uk?.trim()),
    ).map((s) => s.id)
    expect(partial).toEqual([])
  })

  it('keeps notes short enough that somebody reads them', () => {
    // A note nobody finishes is a note nobody acts on, and this is the only
    // place a limit can be enforced — the UI cannot shorten prose.
    const long = SERVICES.filter((s) => (s.notes?.en.length ?? 0) > 420).map(
      (s) => `${s.id}: ${s.notes!.en.length}`,
    )
    expect(long).toEqual([])
  })

  it('names only regions it knows', () => {
    const known = new Set(['DE', 'EU', 'UA'])
    const odd = SERVICES.flatMap((s) => (s.regions ?? []).filter((r) => !known.has(r)))
    expect(odd).toEqual([])
  })

  it('dates the prices it claims to have checked', () => {
    // A checkedOn without published pricing is a claim nobody made, and a
    // published price without a date is a claim that never expires.
    const odd = SERVICES.filter(
      (s) => s.checkedOn && !/^\d{4}-\d{2}-\d{2}$/.test(s.checkedOn),
    ).map((s) => s.id)
    expect(odd).toEqual([])
  })

  it('never prices a yearly option above twelve monthly payments', () => {
    // An annual price that costs more than paying monthly is either a typo or a
    // deal not worth surfacing, and both should stop here.
    const worse: string[] = []
    for (const s of SERVICES) {
      for (const p of s.plans) {
        if (p.annualPriceCents && p.cadence === 'monthly' && p.annualPriceCents > p.priceCents * 12) {
          worse.push(`${s.id} ${p.name}`)
        }
      }
    }
    expect(worse).toEqual([])
  })
})
