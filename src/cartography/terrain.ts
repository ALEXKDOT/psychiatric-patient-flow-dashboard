import type { RasterDEMSourceSpecification } from 'maplibre-gl'
import inventory from './terrain-index.json'

const available = new Set(inventory.tiles)
const bounds: Record<string, number[]> = inventory.bounds
function tileUrl(path: string) {
  return new URL(import.meta.env.BASE_URL + 'geography/terrain/' + path, document.baseURI).href
}
const registrations = new WeakSet<object>()

export function terrainSource(campusId = 'network'): RasterDEMSourceSpecification {
  const [west, south, east, north] = bounds[campusId] ?? bounds.network
  return {
    type: 'raster-dem',
    encoding: 'terrarium',
    tileSize: 256,
    tiles: ['atlas-dem://tile/{z}/{x}/{y}'],
    bounds: [west, south, east, north],
    minzoom: campusId === 'network' ? 8 : 12,
    maxzoom: campusId === 'network' ? 11 : 15,
  }
}

export function findTerrainTile(z: number, x: number, y: number) {
  for (let level = z; level >= 8; level--) {
    const n = 2 ** (z - level)
    const key = `${level}/${Math.floor(x / n)}/${Math.floor(y / n)}`
    if (available.has(key)) return { key, n, offsetX: x % n, offsetY: y % n }
  }
  return null
}

let neutralElevation: Promise<Blob> | undefined

async function flatTile(signal: AbortSignal) {
  signal.throwIfAborted()
  // A missing optional relief directory must still complete MapLibre's tile
  // requests. RGB(128, 0, 0) decodes to zero meters in Terrarium encoding.
  neutralElevation ??= new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')
    if (!context) {
      reject(new Error('Could not create neutral elevation tile'))
      return
    }
    context.fillStyle = '#800000'
    context.fillRect(0, 0, 256, 256)
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Elevation encoding failed'))),
      'image/png',
    )
  })
  const blob = await neutralElevation
  signal.throwIfAborted()
  return blob.arrayBuffer()
}

export function registerTerrainProtocol(gl: typeof import('maplibre-gl')) {
  if (registrations.has(gl)) return
  gl.addProtocol('atlas-dem', async (request, abort) => {
    const signal = abort.signal
    const [z, x, y] = new URL(request.url).pathname.slice(1).split('/').map(Number)
    const tile = findTerrainTile(z, x, y)
    if (!tile) return { data: await flatTile(signal) }
    try {
      const response = await fetch(tileUrl(tile.key + '.png'), { signal })
      if (!response.ok) throw new Error('Elevation tile unavailable')
      if (tile.n === 1) return { data: await response.arrayBuffer() }
      const img = await createImageBitmap(await response.blob(), { colorSpaceConversion: 'none' })
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const ctx = canvas.getContext('2d')!
      // Sampling the nearest encoded sample preserves the multi-byte Terrarium value.
      const side = 256 / tile.n
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, tile.offsetX * side, tile.offsetY * side, side, side, 0, 0, 256, 256)
      img.close()
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('DEM encoding failed'))),
          'image/png',
        ),
      )
      return { data: await blob.arrayBuffer() }
    } catch (err) {
      if (signal.aborted) throw err
      return { data: await flatTile(signal) }
    }
  })
  registrations.add(gl)
}
