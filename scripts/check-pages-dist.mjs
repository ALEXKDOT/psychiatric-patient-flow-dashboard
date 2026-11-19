// Read-only audit of the static output. Run after npm run build.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('../', import.meta.url))
const out = path.resolve(root, process.argv[2] ?? 'dist')
const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const campusSnapshot = await readJson('docs/attribution/campuses/snapshot.json')
const referenceDigests = new Set(await readJson('tests/fixtures/review-only-digests.json'))
const tileIndex = await readJson('src/cartography/terrain-index.json')

const staticFiles = new Set([
  'atlas.svg',
  'geography/terrain/coverage.json',
  'geography/terrain/flat.png',
  'geography/major-roads.geojson',
  'geography/roads-source.json',
  'geography/regional-light.webp',
  'geography/regional-dark.webp',
  ...tileIndex.tiles.map((tile) => 'geography/terrain/' + tile + '.png'),
  ...Object.keys(campusSnapshot)
    .filter((f) => f.startsWith('public/'))
    .map((f) => f.slice(7)),
  ...['ibm-plex-mono', 'ibm-plex-sans', 'lucide', 'maplibre-gl', 'react'].map(
    (name) => 'licenses/' + name + '.txt',
  ),
])
const generatedTypes = [
  /^(?:index|maplibre-gl)-[\w-]+\.(?:js|css)$/,
  /^ibm-plex-(?:mono|sans)-[\w-]+\.woff2?$/,
  /^locator-land-[\w-]+\.svg$/,
  /^GSHHG-COPYING(?:\.LESSER)?-[\w-]+\.txt$/,
  /^(?:terrain|westchester)-[\w-]+\.md$/,
  /^tidal-water-[\w-]+\.json$/,
]
async function* files(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix + entry.name
    assert.ok(!entry.isSymbolicLink(), 'Unexpected symlink: ' + relative)
    if (entry.isDirectory()) yield* files(path.join(dir, entry.name), relative + '/')
    else {
      assert.ok(entry.isFile(), 'Unexpected non-file: ' + relative)
      yield relative
    }
  }
}

const seen = new Set()
const checks = []
const groups = new Map()
const contentGroups = new Map()
let total = 0
function relativeDependency(from, reference) {
  if (reference.startsWith('data:') || reference.startsWith('#')) return
  assert.ok(
    !/^\/|^[a-z][\w+.-]*:/i.test(reference),
    from + ' depends on a non-relative asset: ' + reference,
  )
  const rel = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), reference.split(/[?#]/)[0]),
  )
  checks.push(rel)
}

for await (const name of files(out)) {
  const bytes = await readFile(path.join(out, name))
  seen.add(name)
  total += bytes.length
  const digest = sha256(bytes)
  assert.ok(!referenceDigests.has(digest), 'Review-only input included in release: ' + name)
  contentGroups.set(digest, [...(contentGroups.get(digest) ?? []), name])

  if (staticFiles.has(name)) {
    const supplied = campusSnapshot['public/' + name]
    const expected = supplied?.sha256 ?? sha256(await readFile(path.join(root, 'public', name)))
    assert.equal(digest, expected, 'Static asset changed in build: ' + name)
  } else if (name !== 'index.html' && name !== '.nojekyll') {
    assert.ok(
      path.posix.dirname(name) === 'assets' &&
        generatedTypes.some((re) => re.test(path.posix.basename(name))),
      'Unexpected release file: ' + name,
    )
  }

  let category = 'other'
  if (name.startsWith('campuses/')) category = 'campus geometry'
  else if (name.startsWith('geography/terrain/') && name.endsWith('.png')) category = 'terrain PNG'
  else if (name.endsWith('.js') || name.endsWith('.css')) category = 'JavaScript + CSS'
  else if (name.endsWith('.geojson') || name.endsWith('.json'))
    category = 'other geography + metadata'
  const group = groups.get(category) ?? { files: 0, bytes: 0, gzip6Bytes: 0 }
  group.files++
  group.bytes += bytes.length
  group.gzip6Bytes += gzipSync(bytes, { level: 6 }).length
  groups.set(category, group)

  if (/\.(html|js|css|svg)$/.test(name)) {
    const embedded = bytes.toString().matchAll(/data:[\w./+-]+;base64,([A-Za-z0-9+/=]+)/g)
    for (const [, value] of embedded) {
      const data = Buffer.from(value, 'base64')
      assert.ok(!referenceDigests.has(sha256(data)), 'Review-only input embedded in ' + name)
    }
  }
  if (name === 'index.html') {
    for (const [, value] of bytes.toString().matchAll(/(?:src|href)="([^"]+)"/g))
      relativeDependency(name, value)
  } else if (name.endsWith('.css')) {
    for (const [, value] of bytes.toString().matchAll(/url\(\s*['"]?([^)'"]+)['"]?\s*\)/g))
      relativeDependency(name, value.trim())
  }
}
for (const name of ['index.html', ...staticFiles, ...checks])
  assert.ok(seen.has(name), 'Missing release file: ' + name)
const duplicates = [...contentGroups.values()].filter((names) => names.length > 1)
console.log(
  JSON.stringify(
    {
      files: seen.size,
      bytes: total,
      groups: Object.fromEntries(groups),
      note: 'gzip6Bytes is an offline sum of individually compressed files, not an observed HTTP transfer.',
      reviewedInputDigests: referenceDigests.size,
      identicalFiles: duplicates,
    },
    null,
    2,
  ),
)
