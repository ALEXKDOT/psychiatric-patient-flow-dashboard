import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Map as GLMap, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { land, tidalWater, tidalShore, type Camera } from './base'
import { terrainSource, registerTerrainProtocol } from './terrain'
import { useAtlasTheme, type AtlasTheme } from '../ThemeControl'

function style(theme: AtlasTheme): StyleSpecification {
  const dark = theme === 'dark'
  const water = dark ? '#202b30' : '#d7e3e5'
  return {
    version: 8,
    transition: { duration: 0, delay: 0 },
    sources: {
      counties: { type: 'geojson', data: land, tolerance: 0.25 },
      water: { type: 'geojson', data: tidalWater, tolerance: 0.12 },
      shore: { type: 'geojson', data: tidalShore, tolerance: 0.12 },
      relief: terrainSource(),
      roads: {
        type: 'geojson',
        data: new URL(import.meta.env.BASE_URL + 'geography/major-roads.geojson', document.baseURI)
          .href,
        tolerance: 0.35,
      },
    },
    layers: [
      { id: 'water-bg', type: 'background', paint: { 'background-color': water } },
      {
        id: 'land',
        source: 'counties',
        type: 'fill',
        paint: { 'fill-color': dark ? '#343b3a' : '#e9ebe5' },
      },
      {
        id: 'relief',
        type: 'hillshade',
        source: 'relief',
        paint: {
          'hillshade-shadow-color': dark ? '#171d1b' : '#758175',
          'hillshade-highlight-color': dark ? '#777e70' : '#fafbf7',
          'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 12.5, 0.2],
          'hillshade-illumination-direction': 315,
        },
      },
      { id: 'water', source: 'water', type: 'fill', paint: { 'fill-color': water } },
      {
        id: 'bank-edge',
        source: 'shore',
        type: 'line',
        paint: { 'line-color': dark ? '#475558' : '#f8faf7', 'line-width': 2.8 },
      },
      {
        id: 'banks',
        source: 'shore',
        type: 'line',
        paint: { 'line-color': dark ? '#798783' : '#899997', 'line-width': 0.75 },
      },
      {
        id: 'arterials',
        source: 'roads',
        type: 'line',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'rank'], 'primary'],
            dark ? '#7b8580' : '#b1b8af',
            dark ? '#586160' : '#c9cdc4',
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 12, 1.45, 15, 2.7],
        },
      },
    ],
  }
}

interface Props {
  active: boolean
  camera: Camera
  pixelScale: number
  width: number
  height: number
  onReady: (ready: boolean) => void
  onInstance: (map: GLMap | null) => void
  onNativeMove: (lon: number, lat: number, pixelScale: number) => void
  onInterrupt: () => void
}
export default memo(function GeoBase({
  active,
  camera,
  pixelScale,
  width,
  height,
  onReady,
  onInstance,
  onNativeMove,
  onInterrupt,
}: Props) {
  const theme = useAtlasTheme()
  const host = useRef<HTMLDivElement>(null)
  const instance = useRef<GLMap | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const appliedTheme = useRef<AtlasTheme | null>(null)
  const zoom = Math.log2((pixelScale * 360) / 512)
  const state = useRef({ camera, zoom, theme, onNativeMove, onInterrupt })
  state.current = { camera, zoom, theme, onNativeMove, onInterrupt }
  useEffect(() => {
    let canceled = false
    let lost = false
    let map: GLMap | undefined
    async function mount() {
      try {
        if (new URLSearchParams(location.search).get('map') === 'svg') return
        const gl = await import('maplibre-gl')
        if (canceled || !host.current) return
        registerTerrainProtocol(gl)
        const { camera: initial, zoom: initialZoom, theme: initialTheme } = state.current
        appliedTheme.current = initialTheme
        map = new gl.Map({
          container: host.current,
          style: style(initialTheme),
          center: [initial.lon, initial.lat],
          zoom: initialZoom,
          maxPitch: 0,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: false,
          keyboard: false,
          canvasContextAttributes: { antialias: true },
          renderWorldCopies: false,
          trackResize: false,
          fadeDuration: 0,
        })
        map.touchZoomRotate.disableRotation()
        map.getCanvas().tabIndex = -1
        instance.current = map
        map.on('load', () => {
          if (canceled || lost || !map) return
          setLoaded(true)
          onReady(true)
          onInstance(map)
        })
        map.on('webglcontextlost', () => {
          if (canceled) return
          lost = true
          setLoaded(false)
          onReady(false)
          onInstance(null)
        })
      } catch {
        if (!canceled) {
          setLoaded(false)
          onReady(false)
          onInstance(null)
        }
      }
    }
    void mount()
    return () => {
      canceled = true
      instance.current = undefined
      map?.remove()
      onInstance(null)
    }
  }, [onReady, onInstance])
  useEffect(() => {
    const map = instance.current
    if (!map || !loaded || !active) return
    const start = (event: { originalEvent?: Event }) => {
      if (event.originalEvent) state.current.onInterrupt()
    }
    const move = (event: object) => {
      if ('atlasSync' in event && event.atlasSync) return
      const center = map.getCenter()
      state.current.onNativeMove(center.lng, center.lat, (512 * Math.pow(2, map.getZoom())) / 360)
    }
    map.on('movestart', start)
    map.on('move', move)
    return () => {
      map.off('movestart', start)
      map.off('move', move)
      map.stop()
    }
  }, [active, loaded])
  useLayoutEffect(() => {
    const map = instance.current
    if (!map || !active) return
    const current = map.getCenter()
    if (
      Math.abs(current.lng - camera.lon) > 1e-8 ||
      Math.abs(current.lat - camera.lat) > 1e-8 ||
      Math.abs(map.getZoom() - zoom) > 1e-7
    ) {
      map.jumpTo({ center: [camera.lon, camera.lat], zoom }, { atlasSync: true })
    }
  }, [active, camera.lon, camera.lat, zoom])
  useLayoutEffect(() => {
    if (active && width > 0 && height > 0) instance.current?.resize({ atlasSync: true })
  }, [active, width, height])
  useEffect(() => {
    const map = instance.current
    if (!map || !active || !loaded || theme === appliedTheme.current) return
    appliedTheme.current = theme
    map.setStyle(style(theme))
  }, [active, theme, loaded])
  return (
    <div
      ref={host}
      className="geo-gl"
      aria-hidden="true"
      style={{
        display: active ? undefined : 'none',
        opacity: loaded ? 1 : 0,
        pointerEvents: active && loaded ? 'auto' : 'none',
      }}
    />
  )
})
