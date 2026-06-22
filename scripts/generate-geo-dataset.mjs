/**
 * Genera el dataset geográfico curado (ISO 3166-1 países + ISO 3166-2
 * subdivisiones) a partir de `iso-3166` e `i18n-iso-countries` (devDependencies).
 *
 * Se ejecuta UNA vez (o cuando ISO publique cambios, que es rarísimo) y deja los
 * JSON commiteados en `src/lib/geo/data/`. El runtime NO depende de esos
 * paquetes: solo lee los JSON. Por eso `iso-3166`/`i18n-iso-countries` viven en
 * devDependencies y nunca llegan al bundle de producción.
 *
 *   node scripts/generate-geo-dataset.mjs
 *
 * Limitación conocida: los nombres de subdivisión salen en su forma local
 * (no hay traducción es/en universal). Las provincias de CR ya están en español.
 */
import { iso31661, iso31662 } from 'iso-3166'
import countries from 'i18n-iso-countries'
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
countries.registerLocale(require('i18n-iso-countries/langs/es.json'))
countries.registerLocale(require('i18n-iso-countries/langs/en.json'))

const namesEs = countries.getNames('es')
const namesEn = countries.getNames('en')

// Solo países asignados (descarta reservados/históricos sin alpha-2 utilizable).
const countryList = iso31661
  .filter((entry) => entry.state === 'assigned')
  .map((entry) => ({
    code: entry.alpha2,
    nameEs: namesEs[entry.alpha2] ?? entry.name,
    nameEn: namesEn[entry.alpha2] ?? entry.name,
  }))
  .sort((a, b) => a.nameEs.localeCompare(b.nameEs, 'es'))

// Subdivisiones ISO 3166-2: { code: 'CR-SJ', name: 'San José', parent: 'CR' }.
const subdivisionList = iso31662
  .map((entry) => ({ code: entry.code, name: entry.name, parent: entry.parent }))
  .sort((a, b) => a.code.localeCompare(b.code))

const scriptDir = dirname(fileURLToPath(import.meta.url))
const dataDir = join(scriptDir, '..', 'src', 'lib', 'geo', 'data')
mkdirSync(dataDir, { recursive: true })

writeFileSync(
  join(dataDir, 'countries.json'),
  JSON.stringify(countryList) + '\n',
)
writeFileSync(
  join(dataDir, 'subdivisions.json'),
  JSON.stringify(subdivisionList) + '\n',
)

const crProvincias = subdivisionList.filter((s) => s.parent === 'CR').length
process.stdout.write(
  `countries.json: ${countryList.length} paises\n` +
    `subdivisions.json: ${subdivisionList.length} subdivisiones (CR: ${crProvincias})\n`,
)
