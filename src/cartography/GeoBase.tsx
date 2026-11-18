import { memo, useEffect, useRef, useState } from 'react'
import type { Map as GLMap, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { land, tracts, palette, tidalWater, tidalShore, plateUrl, plateBounds as b } from './base'
import type { Camera } from './base'

const style: StyleSpecification = {
  version: 8,
  sources: {
    counties: { type: 'geojson', data: land, tolerance: 0.25 },
    tracts: { type: 'geojson', data: tracts, tolerance: 0.45 },
    tidalWater: { type: 'geojson', data: tidalWater, tolerance: 0.12 },
    tidalShore: { type: 'geojson', data: tidalShore, tolerance: 0.12 },
    plate: {
      type: 'image',
      url: plateUrl,
      coordinates: [
        [b.west, b.north],
        [b.east, b.north],
        [b.east, b.south],
        [b.west, b.south],
      ],
    },
  },
  layers: [
    { id: 'water', type: 'background', paint: { 'background-color': palette.water } },
    {
      id: 'coast-outer',
      type: 'line',
      source: 'counties',
      paint: { 'line-color': '#d2d7d5', 'line-width': 5 },
    },
    {
      id: 'coast-inner',
      type: 'line',
      source: 'counties',
      paint: { 'line-color': '#fbfcfa', 'line-width': 3 },
    },
    { id: 'land', type: 'fill', source: 'counties', paint: { 'fill-color': palette.land } },
    {
      id: 'engraved-geography',
      type: 'raster',
      source: 'plate',
      paint: { 'raster-fade-duration': 0 },
    },
    {
      id: 'tract-halo',
      type: 'line',
      source: 'tracts',
      paint: { 'line-color': palette.tractLight, 'line-width': 1.3, 'line-opacity': 0.55 },
    },
    {
      id: 'tract-line',
      type: 'line',
      source: 'tracts',
      paint: { 'line-color': palette.tracts, 'line-width': 0.48, 'line-opacity': 0.75 },
    },
    {
      id: 'county-line',
      type: 'line',
      source: 'counties',
      paint: { 'line-color': palette.shoreline, 'line-width': 1 },
    },
    {
      id: 'tidal-water',
      source: 'tidalWater',
      type: 'fill',
      paint: { 'fill-color': palette.water },
    },
    {
      id: 'tidal-edge-light',
      source: 'tidalShore',
      type: 'line',
      paint: { 'line-color': '#f8faf7', 'line-width': 2.8 },
    },
    {
      id: 'tidal-edge',
      source: 'tidalShore',
      type: 'line',
      paint: { 'line-color': '#899997', 'line-width': 0.75 },
    },
  ],
}

interface Props {
  camera: Camera
  pixelScale: number
  width: number
  height: number
  onReady: (ready: boolean) => void
}
export default memo(function GeoBase({ camera, pixelScale, width, height, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<GLMap | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const zoom = Math.log2((pixelScale * 360) / 512)
  const state = useRef({ camera, zoom })
  state.current = { camera, zoom }
  useEffect(() => {
    let canceled = false
    let map: GLMap | undefined
    async function mount() {
      try {
        if (new URLSearchParams(location.search).get('map') === 'svg') return
        const { Map } = await import('maplibre-gl')
        if (canceled || !host.current) return
        const { camera: initial, zoom: initialZoom } = state.current
        map = new Map({
          container: host.current,
          style,
          center: [initial.lon, initial.lat],
          zoom: initialZoom,
          interactive: false,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
          renderWorldCopies: false,
          trackResize: false,
          fadeDuration: 0,
        })
        instance.current = map
        map.on('idle', () => {
          if (!canceled) {
            setLoaded(true)
            onReady(true)
          }
        })
        map.on('webglcontextlost', () => {
          if (!canceled) {
            setLoaded(false)
            onReady(false)
          }
        })
        map.on('error', () => {
          if (!canceled) {
            setLoaded(false)
            onReady(false)
          }
        })
      } catch {
        if (!canceled) {
          setLoaded(false)
          onReady(false)
        }
      }
    }
    void mount()
    return () => {
      canceled = true
      instance.current = undefined
      map?.remove()
    }
  }, [onReady])
  useEffect(() => {
    const map = instance.current
    if (map) {
      map.resize()
      map.jumpTo({ center: [camera.lon, camera.lat], zoom })
    }
  }, [camera, zoom, width, height])
  return (
    <div ref={host} className="geo-gl" aria-hidden="true" style={{ opacity: loaded ? 1 : 0 }} />
  )
})
