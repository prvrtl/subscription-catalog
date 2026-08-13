import catalog from '../data/services.json' with { type: 'json' }

export type Cadence = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Plan {
  name: string
  priceCents: number
  currency: string
  cadence: Cadence
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
