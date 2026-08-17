// Applies management links, notes and regional data to data/services.json.
//
// Written as a patch rather than by hand-editing ninety JSON entries: the diff
// on services.json is then the data change, and this file is the record of what
// was intended — including which prices were read off a vendor page on which
// day, which is the part that goes stale silently.
//
// Run: node scripts/enrich.mjs

import { readFileSync, writeFileSync } from 'node:fs'

const FILE = 'data/services.json'
const catalog = JSON.parse(readFileSync(FILE, 'utf8'))
const byId = new Map(catalog.services.map((s) => [s.id, s]))

/** Checked against the vendor's own page on this date. */
const TODAY = '2026-08-17'

// ─────────────────────────────────────────────────────────────────────────────
// Patches to services already in the catalogue.
//
// `plans` here REPLACES the existing plans, so it is only given where the
// prices were actually checked. Everything else merges.
// ─────────────────────────────────────────────────────────────────────────────
const PATCH = {
  netflix: {
    regions: ['DE', 'EU', 'UA'],
    pricing: 'published',
    source: 'https://help.netflix.com/en/node/24926',
    checkedOn: TODAY,
    plans: [
      { name: 'Standard with ads', priceCents: 499, currency: 'EUR', cadence: 'monthly' },
      { name: 'Standard', priceCents: 1399, currency: 'EUR', cadence: 'monthly' },
      { name: 'Premium', priceCents: 1999, currency: 'EUR', cadence: 'monthly' },
    ],
    manage: {
      account: 'https://www.netflix.com/youraccount',
      plan: 'https://www.netflix.com/changeplan',
      cancel: 'https://www.netflix.com/cancelplan',
    },
    notes: {
      en: 'Standard with ads is the same catalogue for a third of the price — the ads are the only difference, and 1080p is unchanged. Premium is only worth it for 4K or a fourth simultaneous screen. Cancelling leaves the account open until the period ends, so there is no reason to wait.',
      de: 'Standard mit Werbung bietet denselben Katalog zu einem Drittel des Preises — nur die Werbung unterscheidet sich, 1080p bleibt. Premium lohnt sich nur für 4K oder einen vierten gleichzeitigen Stream. Nach der Kündigung läuft das Konto bis zum Periodenende weiter, Warten bringt also nichts.',
      uk: 'Standard з рекламою — той самий каталог за третину ціни; різниця лише в рекламі, 1080p лишається. Premium має сенс тільки заради 4K або четвертого одночасного екрана. Після скасування акаунт працює до кінця оплаченого періоду, тож зволікати нема сенсу.',
    },
  },

  spotify: {
    regions: ['DE', 'EU', 'UA'],
    pricing: 'published',
    source: 'https://www.spotify.com/de/premium/',
    checkedOn: TODAY,
    plans: [
      { name: 'Individual', priceCents: 1299, currency: 'EUR', cadence: 'monthly' },
      { name: 'Duo', priceCents: 1799, currency: 'EUR', cadence: 'monthly' },
      { name: 'Family', priceCents: 2199, currency: 'EUR', cadence: 'monthly' },
      { name: 'Student', priceCents: 699, currency: 'EUR', cadence: 'monthly' },
    ],
    manage: {
      account: 'https://www.spotify.com/account/overview/',
      plan: 'https://www.spotify.com/account/subscription/change/',
      cancel: 'https://www.spotify.com/account/cancel/',
    },
    notes: {
      en: 'Duo pays for itself with two people and Family with three — both work for anyone at the same address, not only relatives. Student is verified yearly through SheerID and quietly reverts to full price when it lapses, which is the charge people notice a year late.',
      de: 'Duo rechnet sich ab zwei Personen, Family ab drei — beide gelten für alle unter derselben Adresse, nicht nur für Verwandte. Student wird jährlich über SheerID geprüft und wechselt danach stillschweigend auf den vollen Preis; genau diese Abbuchung fällt oft erst ein Jahr später auf.',
      uk: 'Duo окупається вдвох, Family — втрьох, і обидва працюють для всіх за однією адресою, не лише для родичів. Student щороку перевіряється через SheerID і після цього тихо стає повною ціною — саме це списання помічають із запізненням на рік.',
    },
  },

  disneyplus: {
    regions: ['DE', 'EU'],
    pricing: 'published',
    source: 'https://help.disneyplus.com/de/article/disneyplus-price',
    checkedOn: TODAY,
    plans: [
      { name: 'Standard mit Werbung', priceCents: 699, currency: 'EUR', cadence: 'monthly' },
      { name: 'Standard', priceCents: 1099, currency: 'EUR', cadence: 'monthly', annualPriceCents: 10990 },
      { name: 'Premium', priceCents: 1599, currency: 'EUR', cadence: 'monthly', annualPriceCents: 15990 },
    ],
    manage: {
      account: 'https://www.disneyplus.com/account',
      plan: 'https://www.disneyplus.com/account/subscription',
      cancel: 'https://www.disneyplus.com/account/subscription',
    },
    notes: {
      en: 'Annual is two months free on both paid tiers — the clearest annual saving of any streamer here. Worth it only if you would keep it a full year; most people watch one series and forget. Standard with ads has the same catalogue.',
      de: 'Jährlich sind bei beiden Bezahlstufen zwei Monate geschenkt — die deutlichste Jahresersparnis aller Streamingdienste hier. Lohnt sich nur, wenn du wirklich ein Jahr bleibst; die meisten schauen eine Serie und vergessen es. Standard mit Werbung hat denselben Katalog.',
      uk: 'Річна оплата дає два місяці безкоштовно на обох платних тарифах — найпомітніша річна знижка серед тутешніх стримінгів. Варта лише якщо справді лишишся на рік; більшість дивиться один серіал і забуває. Standard з рекламою має той самий каталог.',
    },
  },

  primevideo: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://www.amazon.de/mc',
      plan: 'https://www.amazon.de/gp/primecentral',
      cancel: 'https://www.amazon.de/gp/primecentral',
    },
    notes: {
      en: 'Prime Video comes with Prime, so cancelling the video part alone is rarely what people mean — check whether you are paying for Prime itself. Ads were added to the base tier; removing them is a separate monthly fee on top.',
      de: 'Prime Video steckt in Prime drin — die Videostufe allein zu kündigen ist selten gemeint; prüfe, ob du Prime selbst zahlst. Werbung kam in der Basisstufe dazu, und sie loszuwerden kostet zusätzlich monatlich.',
      uk: 'Prime Video входить у Prime, тож скасовувати саме відео зазвичай не те, що мають на увазі — перевір, чи не платиш за сам Prime. У базовий тариф додали рекламу, і прибрати її коштує окремо щомісяця.',
    },
  },

  youtubepremium: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://www.youtube.com/paid_memberships',
      plan: 'https://www.youtube.com/paid_memberships',
      cancel: 'https://www.youtube.com/paid_memberships',
    },
    notes: {
      en: 'Includes YouTube Music, so paying for both this and Spotify is paying twice for the same thing. Family covers five people at one address. Signing up inside the iOS app costs more than signing up on the web — Apple takes a cut and the price reflects it.',
      de: 'YouTube Music ist enthalten — wer das und Spotify zahlt, zahlt zweimal für dasselbe. Family deckt fünf Personen an einer Adresse ab. In der iOS-App abgeschlossen kostet es mehr als im Browser: Apple nimmt eine Provision, und der Preis zeigt das.',
      uk: 'Включає YouTube Music, тож платити і за це, і за Spotify — платити двічі за одне. Family покриває пʼятьох за однією адресою. Оформлення в застосунку iOS дорожче, ніж у браузері: Apple бере комісію, і ціна це відображає.',
    },
  },

  applemusic: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://apps.apple.com/account/subscriptions',
      plan: 'https://apps.apple.com/account/subscriptions',
      cancel: 'https://apps.apple.com/account/subscriptions',
    },
    notes: {
      en: 'Every Apple subscription is cancelled from one page, and that page is not in the Music app — it is Settings, your name, Subscriptions. If you pay for two or more Apple services, Apple One is usually cheaper than the sum.',
      de: 'Alle Apple-Abos werden auf einer Seite gekündigt, und die steckt nicht in der Musik-App, sondern unter Einstellungen, dein Name, Abonnements. Wer zwei oder mehr Apple-Dienste zahlt, fährt mit Apple One meist günstiger.',
      uk: 'Усі підписки Apple скасовуються з однієї сторінки, і вона не в застосунку «Музика», а в «Налаштування → твоє імʼя → Підписки». Якщо платиш за два й більше сервіси Apple, Apple One зазвичай дешевший за суму.',
    },
  },

  appleone: {
    regions: ['DE', 'EU'],
    manage: {
      account: 'https://apps.apple.com/account/subscriptions',
      plan: 'https://apps.apple.com/account/subscriptions',
      cancel: 'https://apps.apple.com/account/subscriptions',
    },
    notes: {
      en: 'Worth it from two services upwards, and the family tiers include the iCloud storage most households are already buying separately — check whether you are paying for both. Switching to Apple One cancels the individual subscriptions automatically.',
      de: 'Lohnt sich ab zwei Diensten, und die Familienstufen enthalten den iCloud-Speicher, den viele Haushalte ohnehin separat zahlen — prüfe, ob du doppelt zahlst. Der Wechsel zu Apple One kündigt die Einzelabos automatisch.',
      uk: 'Має сенс від двох сервісів, а сімейні тарифи включають сховище iCloud, яке більшість і так купує окремо — перевір, чи не платиш двічі. Перехід на Apple One автоматично скасовує окремі підписки.',
    },
  },

  icloud: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://apps.apple.com/account/subscriptions',
      plan: 'https://apps.apple.com/account/subscriptions',
      cancel: 'https://apps.apple.com/account/subscriptions',
    },
    notes: {
      en: 'The 50 GB tier exists mainly so phone backups stop failing, and most people never outgrow it. Before paying for the next tier up, check what Photos is actually storing — originals of videos you have already shared are usually most of it.',
      de: 'Die 50-GB-Stufe gibt es vor allem, damit Handy-Backups nicht mehr scheitern, und die meisten brauchen nie mehr. Bevor du die nächste Stufe zahlst, sieh nach, was Fotos wirklich speichert — meist sind es Originale von längst geteilten Videos.',
      uk: 'Тариф на 50 ГБ існує здебільшого щоб резервні копії телефона перестали зриватися, і більшості його вистачає назавжди. Перш ніж платити за наступний, подивись, що насправді зберігає «Фото» — зазвичай це оригінали вже надісланих відео.',
    },
  },

  googleone: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://one.google.com/settings',
      plan: 'https://one.google.com/about/plans',
      cancel: 'https://one.google.com/settings',
    },
    notes: {
      en: 'Annual is about two months cheaper than monthly on every tier. Storage is shared across Drive, Gmail and Photos, so a full quota usually means Gmail attachments rather than photos — worth checking before upgrading.',
      de: 'Jährlich ist auf jeder Stufe rund zwei Monate günstiger als monatlich. Der Speicher gilt für Drive, Gmail und Fotos zusammen, ein volles Kontingent liegt also meist an Gmail-Anhängen statt an Fotos — vor dem Upgrade nachsehen.',
      uk: 'Річна оплата на кожному тарифі приблизно на два місяці дешевша за місячну. Сховище спільне для Drive, Gmail і «Фото», тож заповнене місце — це зазвичай вкладення в Gmail, а не фото; варто перевірити перед оновленням.',
    },
  },

  microsoft365: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://account.microsoft.com/services',
      plan: 'https://account.microsoft.com/services',
      cancel: 'https://account.microsoft.com/services',
    },
    notes: {
      en: 'Family covers six people at six separate addresses and costs barely more than Single — sharing it is the single biggest saving here. Each person gets their own 1 TB, and the others never see your files.',
      de: 'Family deckt sechs Personen an sechs verschiedenen Adressen ab und kostet kaum mehr als Single — Teilen ist hier die mit Abstand größte Ersparnis. Jede Person bekommt eigenes 1 TB, und niemand sieht die Dateien der anderen.',
      uk: 'Family покриває шістьох людей за шістьма різними адресами і коштує ледь дорожче за Single — розділити його тут найбільша економія. Кожен отримує власний 1 ТБ, і ніхто не бачить чужих файлів.',
    },
  },

  chatgpt: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://chatgpt.com/#settings/Subscription',
      plan: 'https://chatgpt.com/#pricing',
      cancel: 'https://chatgpt.com/#settings/Subscription',
    },
    notes: {
      en: 'Billed in dollars, so what lands on a euro account moves with the exchange rate and never matches the sticker price exactly. Cancelling keeps access until the period ends.',
      de: 'Wird in Dollar abgerechnet — was auf einem Euro-Konto ankommt, schwankt mit dem Kurs und passt nie exakt zum ausgewiesenen Preis. Nach der Kündigung bleibt der Zugang bis zum Periodenende.',
      uk: 'Оплата в доларах, тож сума на євровому рахунку залежить від курсу й ніколи точно не збігається з ціною на сайті. Після скасування доступ лишається до кінця періоду.',
    },
  },

  adobe: {
    regions: ['DE', 'EU'],
    manage: {
      account: 'https://account.adobe.com/plans',
      plan: 'https://account.adobe.com/plans',
      cancel: 'https://account.adobe.com/plans',
    },
    notes: {
      en: 'The annual plan paid monthly is a twelve-month contract, and leaving early costs half of what is left — this is the cancellation fee people are most often caught by. The month-to-month plan costs more per month and can be stopped any time; if you use it seasonally, that is the cheaper arrangement.',
      de: 'Der Jahresvertrag mit monatlicher Zahlung läuft zwölf Monate, und ein vorzeitiger Ausstieg kostet die Hälfte der Restlaufzeit — an dieser Gebühr scheitern die meisten. Der monatlich kündbare Tarif kostet mehr pro Monat, lässt sich aber jederzeit beenden; wer saisonal arbeitet, fährt damit günstiger.',
      uk: 'Річний план з щомісячною оплатою — це договір на дванадцять місяців, і достроковий вихід коштує половину залишку; саме на цій комісії найчастіше попадаються. Помісячний план дорожчий за місяць, але спиняється будь-коли — якщо користуєшся сезонно, він вигідніший.',
    },
  },

  audible: {
    regions: ['DE', 'EU'],
    manage: {
      account: 'https://www.audible.de/account/membership',
      plan: 'https://www.audible.de/account/membership',
      cancel: 'https://www.audible.de/account/membership',
    },
    notes: {
      en: 'Credits already bought stay yours after cancelling, and unused ones expire before the audiobooks do — spend them before you leave. Audible usually offers a pause of up to three months instead of cancellation, which is the better option if you are simply behind.',
      de: 'Gekaufte Guthaben bleiben nach der Kündigung erhalten, ungenutzte verfallen aber früher als die Hörbücher — vorher einlösen. Audible bietet meist eine Pause von bis zu drei Monaten statt einer Kündigung an, was besser passt, wenn du nur im Rückstand bist.',
      uk: 'Уже куплені кредити лишаються твоїми після скасування, але невикористані згорають раніше за самі аудіокниги — витрать їх до виходу. Audible зазвичай пропонує паузу до трьох місяців замість скасування, і це кращий варіант, якщо ти просто не встигаєш слухати.',
    },
  },

  dazn: {
    regions: ['DE', 'EU'],
    manage: {
      account: 'https://www.dazn.com/account',
      plan: 'https://www.dazn.com/account/plan',
      cancel: 'https://www.dazn.com/account/cancel',
    },
    notes: {
      en: 'The cheaper headline price is a twelve-month commitment; the monthly plan costs roughly twice as much and can be stopped between seasons. If you only watch one league, check when its rights actually run — DAZN loses and gains competitions every couple of years.',
      de: 'Der günstigere Schaufelpreis ist eine Zwölf-Monats-Bindung; der Monatstarif kostet rund das Doppelte, lässt sich aber zwischen den Saisons beenden. Wer nur eine Liga schaut, sollte prüfen, wie lange deren Rechte laufen — DAZN verliert und gewinnt alle paar Jahre Wettbewerbe.',
      uk: 'Нижча ціна на вітрині — це зобовʼязання на дванадцять місяців; місячний тариф коштує приблизно вдвічі більше, але його можна спинити між сезонами. Якщо дивишся одну лігу, перевір, доки діють права — DAZN втрачає й отримує турніри кожні кілька років.',
    },
  },

  nordvpn: {
    regions: ['DE', 'EU', 'UA'],
    manage: {
      account: 'https://my.nordaccount.com/billing/',
      plan: 'https://my.nordaccount.com/billing/subscriptions/',
      cancel: 'https://my.nordaccount.com/billing/subscriptions/',
    },
    notes: {
      en: 'The two-year price everyone signs up at renews at the ordinary yearly rate, which is several times higher — the renewal, not the first payment, is what to budget for. Turn off auto-renew and re-buy at the offer price instead.',
      de: 'Der Zwei-Jahres-Preis, zu dem alle abschließen, verlängert sich zum normalen Jahrespreis und ist dann um ein Vielfaches teurer — planen musst du mit der Verlängerung, nicht mit der ersten Zahlung. Automatische Verlängerung abschalten und zum Aktionspreis neu abschließen.',
      uk: 'Дворічна ціна, за якою всі підписуються, продовжується за звичайним річним тарифом у кілька разів дорожче — планувати треба саме продовження, а не перший платіж. Вимкни автопродовження й оформ заново за акційною ціною.',
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Services the catalogue was missing. Ukrainian ones especially: the app speaks
// Ukrainian now, and a catalogue that cannot find Kyivstar is not much use to
// somebody paying for it.
// ─────────────────────────────────────────────────────────────────────────────
const ADD = [
  // ── Ukraine ────────────────────────────────────────────────────────────────
  // Priced in hryvnia, because that is what the bill says. The app converts on
  // the way in and keeps what was typed, so a Ukrainian household does not have
  // to do arithmetic to enter its own phone bill.
  {
    id: 'kyivstar', name: 'Київстар', category: 'Utilities', domain: 'kyivstar.ua',
    brandColor: '#00A9E0', simpleIcons: null, aliases: ['kyivstar', 'київстар'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA'], checkedOn: TODAY,
    plans: [
      { name: 'Мобільний тариф', priceCents: 25000, currency: 'UAH', cadence: 'monthly' },
      { name: 'Домашній інтернет', priceCents: 30000, currency: 'UAH', cadence: 'monthly' },
    ],
    manage: {
      account: 'https://my.kyivstar.ua/',
      plan: 'https://kyivstar.ua/uk/mobile/tariffs',
    },
    notes: {
      en: 'Tariffs are charged for a fixed period rather than a calendar month, so the date it leaves your account drifts. Paying several months ahead is usually cheaper per month, and Kyivstar TV is bundled into some tariffs — worth checking before paying for a streaming service separately.',
      de: 'Tarife laufen über einen festen Zeitraum statt über einen Kalendermonat, das Abbuchungsdatum verschiebt sich also. Mehrere Monate im Voraus sind meist günstiger pro Monat, und in einigen Tarifen steckt Kyivstar TV — vor einem separaten Streamingabo nachsehen.',
      uk: 'Тариф списується за фіксований період, а не за календарний місяць, тож дата списання поступово зсувається. Оплата на кілька місяців наперед зазвичай дешевша в перерахунку, а в деякі тарифи вже входить Київстар ТБ — варто перевірити, перш ніж платити за стримінг окремо.',
    },
  },
  {
    id: 'vodafoneua', name: 'Vodafone Україна', category: 'Utilities', domain: 'vodafone.ua',
    brandColor: '#E60000', simpleIcons: 'vodafone', aliases: ['vodafone ua', 'водафон'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA'], checkedOn: TODAY,
    plans: [{ name: 'Мобільний тариф', priceCents: 25000, currency: 'UAH', cadence: 'monthly' }],
    manage: { account: 'https://my.vodafone.ua/', plan: 'https://www.vodafone.ua/tariffs' },
    notes: {
      en: 'Like the other Ukrainian operators, the charge repeats every four weeks rather than monthly, which works out to thirteen payments a year and not twelve — worth knowing when the yearly total looks higher than expected.',
      de: 'Wie bei den anderen ukrainischen Anbietern wird alle vier Wochen abgebucht statt monatlich — das sind dreizehn Zahlungen im Jahr, nicht zwölf. Gut zu wissen, wenn die Jahressumme höher aussieht als gedacht.',
      uk: 'Як і в інших українських операторів, списання повторюється кожні чотири тижні, а не щомісяця — це тринадцять платежів на рік, а не дванадцять. Варто памʼятати, коли річна сума виглядає більшою, ніж очікувалося.',
    },
  },
  {
    id: 'lifecell', name: 'lifecell', category: 'Utilities', domain: 'lifecell.ua',
    brandColor: '#F5A623', simpleIcons: null, aliases: ['лайфселл'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA'], checkedOn: TODAY,
    plans: [{ name: 'Мобільний тариф', priceCents: 20000, currency: 'UAH', cadence: 'monthly' }],
    manage: { account: 'https://my.lifecell.ua/', plan: 'https://www.lifecell.ua/uk/tariffs/' },
    notes: {
      en: 'Usually the cheapest of the three for the same data, and the one most likely to change your tariff terms with a text message you did not read. Check the price against your statement every few months rather than trusting what you signed up for.',
      de: 'Meist der günstigste der drei bei gleichem Datenvolumen — und der, der die Tarifbedingungen am ehesten per SMS ändert, die niemand liest. Den Preis alle paar Monate gegen den Kontoauszug prüfen statt dem Abschluss zu vertrauen.',
      uk: 'Зазвичай найдешевший із трьох за той самий обсяг даних — і найчастіше змінює умови тарифу повідомленням, якого ніхто не читає. Звіряй ціну з випискою раз на кілька місяців, а не покладайся на те, з чим підключався.',
    },
  },
  {
    id: 'megogo', name: 'MEGOGO', category: 'Entertainment', domain: 'megogo.net',
    brandColor: '#FF6600', simpleIcons: null, aliases: ['мегого'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA'], checkedOn: TODAY,
    plans: [
      { name: 'Оптимальна', priceCents: 19900, currency: 'UAH', cadence: 'monthly' },
      { name: 'Максимальна', priceCents: 29900, currency: 'UAH', cadence: 'monthly' },
    ],
    manage: { account: 'https://megogo.net/ua/subscriptions', cancel: 'https://megogo.net/ua/subscriptions' },
    notes: {
      en: 'Frequently bundled free with a mobile tariff or a bank package — check whether you already have it before paying. Subscriptions bought inside the iOS app cost more and must be cancelled through Apple, not through MEGOGO.',
      de: 'Oft kostenlos in einem Mobilfunktarif oder Bankpaket enthalten — vor dem Bezahlen prüfen, ob du es schon hast. In der iOS-App gekaufte Abos kosten mehr und müssen über Apple gekündigt werden, nicht über MEGOGO.',
      uk: 'Часто йде безкоштовно з мобільним тарифом або банківським пакетом — перевір, чи вже не маєш його, перш ніж платити. Підписки, куплені в застосунку iOS, дорожчі й скасовуються через Apple, а не через MEGOGO.',
    },
  },
  {
    id: 'sweettv', name: 'sweet.tv', category: 'Entertainment', domain: 'sweet.tv',
    brandColor: '#E5006D', simpleIcons: null, aliases: ['світ тв'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA'], checkedOn: TODAY,
    plans: [
      { name: 'Base', priceCents: 15000, currency: 'UAH', cadence: 'monthly' },
      { name: 'Premium', priceCents: 25000, currency: 'UAH', cadence: 'monthly' },
    ],
    manage: { account: 'https://sweet.tv/profile', cancel: 'https://sweet.tv/profile' },
    notes: {
      en: 'Long prepaid periods are heavily discounted — a year often costs about half of twelve monthly payments, which is a bigger gap than most services offer. Only worth it if you are staying put.',
      de: 'Lange Vorauszahlungen sind stark rabattiert — ein Jahr kostet oft etwa die Hälfte von zwölf Monatszahlungen, ein größerer Unterschied als bei den meisten Diensten. Nur sinnvoll, wenn du bleibst.',
      uk: 'Довгі періоди передоплати сильно здешевлені — рік часто коштує близько половини від дванадцяти місячних платежів, більший розрив, ніж дає більшість сервісів. Має сенс, лише якщо точно лишаєшся.',
    },
  },
  {
    id: 'comebackalive', name: 'Повернись живим', category: 'Charity', domain: 'savelife.in.ua',
    brandColor: '#1B1B1B', simpleIcons: null, aliases: ['come back alive', 'savelife'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA', 'EU', 'DE'], checkedOn: TODAY,
    plans: [{ name: 'Щомісячний внесок', priceCents: 20000, currency: 'UAH', cadence: 'monthly' }],
    manage: { account: 'https://savelife.in.ua/en/donate/' },
    notes: {
      en: 'A recurring donation, so it belongs in the forecast like any other standing commitment rather than being remembered as a one-off. German taxpayers can claim donations up to 20% of income; the receipt arrives yearly and is worth keeping.',
      de: 'Eine wiederkehrende Spende gehört wie jede andere Dauerverpflichtung in die Prognose statt als Einmalzahlung erinnert zu werden. In Deutschland sind Spenden bis 20 % des Einkommens absetzbar; die Zuwendungsbestätigung kommt jährlich und sollte aufgehoben werden.',
      uk: 'Регулярний внесок — його місце в прогнозі, як і будь-якого іншого постійного зобовʼязання, а не в памʼяті як разового переказу. У Німеччині донати зменшують податок у межах 20% доходу; підтвердження приходить раз на рік, і його варто зберігати.',
    },
  },
  {
    id: 'preply', name: 'Preply', category: 'Education', domain: 'preply.com',
    brandColor: '#F03D2F', simpleIcons: null, aliases: ['преплай'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['UA', 'EU', 'DE'], checkedOn: TODAY,
    plans: [
      { name: '6 годин на місяць', priceCents: 9900, currency: 'EUR', cadence: 'monthly' },
      { name: '12 годин на місяць', priceCents: 18900, currency: 'EUR', cadence: 'monthly' },
    ],
    manage: { account: 'https://preply.com/en/settings/subscription', cancel: 'https://preply.com/en/settings/subscription' },
    notes: {
      en: 'Hours are bought monthly and expire at the end of the month — unused lessons are simply lost, which is where the real cost hides for anyone who books irregularly. Pausing is possible and is almost always the better move over a busy month.',
      de: 'Stunden werden monatlich gekauft und verfallen am Monatsende — ungenutzte Einheiten sind schlicht weg, und genau da versteckt sich der eigentliche Preis für alle, die unregelmäßig buchen. Pausieren ist möglich und in einem vollen Monat fast immer die bessere Wahl.',
      uk: 'Години купуються помісячно й згорають наприкінці місяця — невикористані заняття просто зникають, і саме тут ховається справжня вартість для тих, хто займається нерегулярно. Паузу можна поставити, і в напружений місяць це майже завжди краще рішення.',
    },
  },

  // ── Europe ─────────────────────────────────────────────────────────────────
  {
    id: 'revolut', name: 'Revolut', category: 'Utilities', domain: 'revolut.com',
    brandColor: '#0666EB', simpleIcons: 'revolut', aliases: [],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['EU', 'DE', 'UA'], checkedOn: TODAY,
    plans: [
      { name: 'Plus', priceCents: 399, currency: 'EUR', cadence: 'monthly' },
      { name: 'Premium', priceCents: 999, currency: 'EUR', cadence: 'monthly' },
      { name: 'Metal', priceCents: 1699, currency: 'EUR', cadence: 'monthly' },
    ],
    manage: { account: 'https://app.revolut.com/settings/plan', plan: 'https://app.revolut.com/settings/plan' },
    notes: {
      en: 'The paid tiers pay for themselves mainly through travel insurance and the weekend exchange-rate markup being waived — if you neither travel nor exchange currency, the free account does the same job. Annual billing takes roughly two months off.',
      de: 'Die Bezahlstufen rechnen sich vor allem über die Reiseversicherung und den entfallenden Wochenendaufschlag beim Umtausch — wer weder reist noch Währungen tauscht, bekommt mit dem kostenlosen Konto dasselbe. Jahreszahlung spart etwa zwei Monate.',
      uk: 'Платні тарифи окупаються здебільшого туристичною страховкою та скасуванням націнки на курс у вихідні — якщо не подорожуєш і не обмінюєш валюту, безкоштовний рахунок робить те саме. Річна оплата економить близько двох місяців.',
    },
  },
  {
    id: 'woltplus', name: 'Wolt+', category: 'Groceries', domain: 'wolt.com',
    brandColor: '#00C2E8', simpleIcons: 'wolt', aliases: ['wolt plus'],
    defaultCadence: 'monthly', pricing: 'estimate', regions: ['DE', 'EU', 'UA'], checkedOn: TODAY,
    plans: [{ name: 'Wolt+', priceCents: 499, currency: 'EUR', cadence: 'monthly' }],
    manage: { account: 'https://wolt.com/me/subscriptions', cancel: 'https://wolt.com/me/subscriptions' },
    notes: {
      en: 'Free delivery above a minimum order, so it pays for itself at roughly two orders a month and costs you money below that — the honest test is how many orders you placed last month, not how many you plan to.',
      de: 'Kostenlose Lieferung ab einem Mindestbestellwert — rechnet sich ab etwa zwei Bestellungen im Monat und kostet darunter Geld. Der ehrliche Test ist, wie oft du letzten Monat bestellt hast, nicht wie oft du vorhast.',
      uk: 'Безкоштовна доставка від мінімальної суми — окупається приблизно від двох замовлень на місяць, а нижче цього просто забирає гроші. Чесна перевірка — скільки замовлень було минулого місяця, а не скільки плануєш.',
    },
  },
]

let patched = 0
for (const [id, patch] of Object.entries(PATCH)) {
  const service = byId.get(id)
  if (!service) {
    console.warn(`skipped ${id}: not in the catalogue`)
    continue
  }
  Object.assign(service, patch)
  patched++
}

let added = 0
for (const service of ADD) {
  if (byId.has(service.id)) {
    Object.assign(byId.get(service.id), service)
    continue
  }
  catalog.services.push(service)
  byId.set(service.id, service)
  added++
}

catalog.services.sort((a, b) => a.id.localeCompare(b.id))
writeFileSync(FILE, JSON.stringify(catalog, null, 2) + '\n')
console.log(`patched ${patched}, added ${added}, total ${catalog.services.length}`)
