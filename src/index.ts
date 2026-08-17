import catalog from '../data/services.json' with { type: 'json' }

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Plan {
  name: string
  priceCents: number
  currency: string
  cadence: Cadence
  /**
   * The same tier paid a year at a time, where the vendor offers the choice.
   *
   * One row per tier carrying both prices rather than two rows that happen to
   * share a name: the question a reader has is "is annual worth it for the plan
   * I am on", and that is only answerable when the two numbers sit together.
   */
  annualPriceCents?: number
}

/**
 * Where the vendor lets you change or end it.
 *
 * The single most useful thing this catalogue can hold. Everyone knows they are
 * paying for something they meant to cancel; almost nobody can find the page.
 * Vendors bury it, and the search results for "cancel <service>" are a field of
 * affiliate spam.
 *
 * One `plan` link rather than separate upgrade and downgrade links, because
 * vendors have one change-plan page and inventing two would be modelling a
 * distinction that does not exist on their side.
 */
export interface ManageLinks {
  /** Subscription or account overview. */
  account?: string
  /** Where a tier is changed, in either direction. */
  plan?: string
  /** Where it is ended. Deep-linked wherever the vendor has a real cancel page. */
  cancel?: string
}

/**
 * The thing a friend who knows the service would tell you.
 *
 * Not marketing, and not a description — the reader already knows what Netflix
 * is. This is the non-obvious fact that changes a decision: the cheaper tier
 * with the same catalogue, the annual option that is genuinely worth it, the
 * notice period that catches people out, the employer subsidy nobody claims.
 */
export interface Notes {
  en: string
  de: string
  uk: string
}

export interface Service {
  id: string
  name: string
  category: string
  /** Backs a favicon lookup when there is no Simple Icons mark. */
  domain: string | null
  brandColor: string
  /** Simple Icons slug, or null when the brand has no submitted mark. */
  simpleIcons: string | null
  aliases: string[]
  defaultCadence: Cadence
  plans: Plan[]
  /**
   * published — checked against the vendor's own price page, with `source` set.
   * estimate  — a plausible figure that needs confirming against a statement.
   */
  pricing: 'published' | 'estimate'
  source?: string
  manage?: ManageLinks
  notes?: Notes
  /**
   * Where the service is actually worth offering — 'DE', 'EU', 'UA'.
   *
   * A German household searching for a phone plan should not wade through
   * Kyivstar, and a Ukrainian one should not have to scroll past Vodafone
   * Germany to reach it. Ranking, not filtering: a service left out of a
   * region's list is still findable by typing its name.
   */
  regions?: string[]
  /**
   * When somebody last checked the prices against the vendor's own page.
   *
   * Prices drift and a catalogue that does not say when it was read is a
   * catalogue claiming to be current forever. The app shows this rather than
   * implying freshness it cannot promise.
   */
  checkedOn?: string
}

export interface Catalog {
  version: number
  currency: string
  region: string
  services: Service[]
}

export const CATALOG = catalog as Catalog
export const SERVICES: Service[] = CATALOG.services

export function byId(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id)
}

export function cheapestPlan(service: Service): Plan | undefined {
  return service.plans.reduce<Plan | undefined>(
    (best, p) => (!best || p.priceCents < best.priceCents ? p : best),
    undefined,
  )
}

/** What a plan costs over a year, for comparing across billing frequencies. */
export function annualCents(plan: Plan): number {
  switch (plan.cadence) {
    case 'weekly':
      return Math.round(plan.priceCents * (365.25 / 7))
    case 'monthly':
      return plan.priceCents * 12
    case 'quarterly':
      return plan.priceCents * 4
    case 'yearly':
      return plan.priceCents
  }
}

/**
 * Ranked search over names and aliases. Prefix beats substring so "net" puts
 * Netflix first rather than something that merely contains those letters.
 */
export function search(query: string, limit = 7): Service[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const scored: Array<{ service: Service; score: number }> = []
  for (const service of SERVICES) {
    let best = Infinity
    for (const candidate of [service.name, ...service.aliases]) {
      const h = candidate.toLowerCase()
      if (h === q) best = Math.min(best, 0)
      else if (h.startsWith(q)) best = Math.min(best, 1)
      else if (h.includes(q)) best = Math.min(best, 2)
      else if (initials(h).startsWith(q)) best = Math.min(best, 3)
    }
    if (best < Infinity) scored.push({ service, score: best })
  }

  scored.sort((a, b) => a.score - b.score || a.service.name.localeCompare(b.service.name))
  return scored.slice(0, limit).map((s) => s.service)
}

/** Simple Icons CDN, tinted to the brand colour. Null when there is no mark. */
export function iconUrl(service: Service): string | null {
  if (!service.simpleIcons) return null
  return `https://cdn.simpleicons.org/${service.simpleIcons}/${service.brandColor.replace('#', '')}`
}

/** Favicon fallback for the long tail Simple Icons does not cover. */
export function faviconUrl(service: Service, size = 64): string | null {
  if (!service.domain) return null
  return `https://www.google.com/s2/favicons?domain=${service.domain}&sz=${size}`
}

function initials(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
}
