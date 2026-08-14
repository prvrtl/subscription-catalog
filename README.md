# subscription-catalog

Services people actually subscribe to, with their plans, prices and brand marks.
Weighted towards the German market: Deutschlandticket, Rundfunkbeitrag, N26,
Telekom, Urban Sports Club alongside the usual streaming and software.

77 services, 132 plans.

## Why this exists

There is no public API for consumer subscription prices. Every app that offers
"type a name, get the price" maintains its own list. This is that list, kept
separate so it can be corrected and reused without touching an app.

## Reading the prices

Each service carries a `pricing` field:

- `published` — checked against the vendor's own price page, with `source` set
- `estimate` — plausible, but nobody has confirmed it

Right now one service is `published` and the rest are `estimate`. Treat estimates
as a starting point for a form, not as a fact. Prices drift, differ by country,
and change with promotions.

If you verify one, set `pricing` to `published`, add the `source` URL, and the
validator will hold you to it.

## Data

`data/services.json` is the whole thing. Plain JSON, no build step, usable from
any language.

```json
{
  "id": "netflix",
  "name": "Netflix",
  "category": "Entertainment",
  "domain": "netflix.com",
  "brandColor": "#E50914",
  "simpleIcons": "netflix",
  "aliases": [],
  "defaultCadence": "monthly",
  "plans": [
    { "name": "Standard with ads", "priceCents": 499, "currency": "EUR", "cadence": "monthly" }
  ],
  "pricing": "estimate"
}
```

Prices are integer cents. Never floats — a rounding error in someone's budget is
a bad way to find out.

## Logos

Two fields, because neither source covers everything:

- `simpleIcons` — a [Simple Icons](https://simpleicons.org) slug. Free, no key,
  but only brands that submitted a mark.
- `domain` — for a favicon lookup. Lower quality, near universal. This is what
  catches Deutschlandticket, waipu.tv and congstar.

`iconUrl()` and `faviconUrl()` build the URLs. Fall back to a monogram when both
return null.

## Use

```ts
import { search, byId, cheapestPlan, annualCents } from 'subscription-catalog'

search('net')[0]            // Netflix
byId('n26')?.plans          // Standard, Smart, Go, Metal
annualCents(plan)           // normalised across billing frequencies
```

Or read the JSON directly and skip the package.

## Adding a service

Append to `data/services.json` and run:

```bash
npm run validate
```

It checks ids and plan names for duplicates, hex colours, domains, cadences, and
that prices are whole cents. It warns on anything above €1000 and on entries
with no icon and no domain.

```bash
npm test        # validate + unit tests
```

## Known gaps

- N26 publishes account plan prices but not the SIM monthly prices, which are
  only visible in the app. The data allowances are right; the prices are guesses.
- The travel eSIM is bought per trip as a data bundle, so it has no meaningful
  monthly price and is left at zero.
- Everything is EUR and German pricing. Other regions would need a currency and
  region dimension the schema does not have yet.
