import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'
import {
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  LocateFixed,
  Orbit,
  Pause,
  Info,
  ExternalLink,
} from 'lucide-react'
import type { Campus } from '../data'
import { useAtlasTheme } from '../ThemeControl'
import {
  campusTargets,
  campusCacheSize,
  loadCampusPack,
  type CampusPack,
} from '../cartography/campusPacks'
import { CampusGL, type SceneControls } from './CampusGL'
import { CampusPlan } from './CampusPlan'
import type { CampusPose } from './geometry'
import type { MotionSegment } from '../sim'
import './campus.css'
export type { CampusPose } from './geometry'

interface Props {
  campus: Campus
  theme?: 'light' | 'dark'
  initialPose?: CampusPose
  onPoseChange?: (pose: CampusPose) => void
  orbitEnabled?: boolean
  onOrbitChange?: (enabled: boolean) => void
  transfers?: MotionSegment[]
  onInspectTransfer?: (id: string) => void
  onManualCamera?: () => void
}
const motionQuery = () => window.matchMedia('(prefers-reduced-motion: reduce)')
function subscribeMotion(fn: () => void) {
  const q = motionQuery()
  q.addEventListener('change', fn)
  return () => q.removeEventListener('change', fn)
}
export function CampusScene(props: Props) {
  return <Scene key={props.campus.id} {...props} />
}
function Scene({
  campus,
  theme,
  initialPose,
  onPoseChange,
  orbitEnabled,
  onOrbitChange,
  transfers,
  onInspectTransfer,
  onManualCamera,
}: Props) {
  const [pack, setPack] = useState<CampusPack | null>(null)
  const [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0)
  const [flat, setFlat] = useState(() => new URLSearchParams(location.search).get('map') === 'svg')
  const [glReady, setGlReady] = useState(false),
    [preferred, setPreferred] = useState(true)
  const [sources, setSources] = useState(false)
  const controls = useRef<SceneControls | null>(null)
  const activePose = useRef(initialPose)
  const external = useRef({ onPoseChange, onOrbitChange, onManualCamera })
  external.current = { onPoseChange, onOrbitChange, onManualCamera }
  const abortGeneration = useRef(0)
  const target = campusTargets[campus.id]
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => motionQuery().matches,
    () => true,
  )
  const atlasTheme = useAtlasTheme(),
    dark = (theme ?? atlasTheme) === 'dark'
  const enabled = (orbitEnabled ?? preferred) && !flat && !reduced
  const requestOrbit = useCallback((next: boolean) => {
    setPreferred(next)
    external.current.onOrbitChange?.(next)
  }, [])
  const interrupt = useCallback(() => {
    requestOrbit(false)
    external.current.onManualCamera?.()
  }, [requestOrbit])
  const updatePose = useCallback((p: CampusPose) => {
    activePose.current = p
    external.current.onPoseChange?.(p)
  }, [])
  const fallback = useCallback(() => {
    setFlat(true)
    setGlReady(false)
  }, [])
  const markReady = useCallback(() => setGlReady(true), [])
  useEffect(() => {
    const generation = ++abortGeneration.current
    const controller = new AbortController()
    setError(false)
    void loadCampusPack(campus.id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted && generation === abortGeneration.current) setPack(result)
      })
      .catch(() => {
        if (!controller.signal.aborted && generation === abortGeneration.current) setError(true)
      })
    return () => controller.abort()
  }, [campus.id, attempt])
  const props = {
    pack: pack!,
    dark,
    controls,
    initialPose,
    onPose: updatePose,
    interrupt,
    transfers,
    onInspectTransfer,
  }
  const height = target.display_height_m
  const county = campus.id === 'ny_nyp_westchester_bh'
  return (
    <section
      className="campus-scene"
      aria-label={'Campus focus: ' + campus.shortName}
      data-campus-id={campus.id}
      data-feature-id={target.feature_id}
      data-cached-packs={campusCacheSize()}
      data-height-m={height ?? 'unknown'}
      data-renderer={flat ? 'svg' : 'maplibre'}
      data-orbit={glReady && enabled ? 'running' : 'paused'}
      data-theme={dark ? 'dark' : 'light'}
    >
      {pack ? (
        flat ? (
          <CampusPlan {...props} initialPose={initialPose ?? activePose.current} />
        ) : (
          <CampusGL {...props} orbit={enabled} onFallback={fallback} onReady={markReady} />
        )
      ) : (
        <div className="campus-pending">
          <LocateFixed size={30} />
          <strong>{campus.shortName}</strong>
          <span>
            {target.focus_lonlat[1].toFixed(5)}°N · {Math.abs(target.focus_lonlat[0]).toFixed(5)}°W
          </span>
          {error ? (
            <>
              <p role="status">The local neighborhood could not be loaded.</p>
              <button onClick={() => setAttempt((n) => n + 1)}>Retry campus map</button>
            </>
          ) : (
            <p role="status">Loading campus map…</p>
          )}
        </div>
      )}
      {pack && (
        <>
          <div className="campus-tools">
            <button
              aria-label={
                flat
                  ? 'Orbit unavailable in 2D map'
                  : reduced
                    ? 'Orbit off for reduced motion'
                    : enabled
                      ? 'Stop orbit'
                      : 'Resume orbit'
              }
              disabled={flat || reduced || !glReady}
              title={
                flat
                  ? 'Orbit requires the 3D map'
                  : reduced
                    ? 'Reduced motion is enabled'
                    : enabled
                      ? 'Stop orbit'
                      : 'Resume orbit'
              }
              className="orbit-toggle"
              onClick={() => requestOrbit(!enabled)}
            >
              {enabled ? <Pause size={13} /> : <Orbit size={16} />}
              <span>
                {flat
                  ? '2D map'
                  : reduced
                    ? 'Static view'
                    : enabled
                      ? 'Stop orbit'
                      : 'Resume orbit'}
              </span>
            </button>
            <div className="campus-tool-stack">
              <button
                aria-label="Zoom in"
                title="Zoom in"
                onClick={() => controls.current?.zoom(0.5)}
              >
                <Plus />
              </button>
              <button
                aria-label="Zoom out"
                title="Zoom out"
                onClick={() => controls.current?.zoom(-0.5)}
              >
                <Minus />
              </button>
              {!flat && (
                <>
                  <button
                    aria-label="Rotate left"
                    title="Rotate left"
                    onClick={() => controls.current?.rotate(-15)}
                  >
                    <RotateCcw />
                  </button>
                  <button
                    aria-label="Rotate right"
                    title="Rotate right"
                    onClick={() => controls.current?.rotate(15)}
                  >
                    <RotateCw />
                  </button>
                </>
              )}
              <button
                aria-label="Recenter campus"
                title="Recenter campus"
                onClick={() => controls.current?.reset()}
              >
                <LocateFixed />
              </button>
            </div>
          </div>
        </>
      )}
      <div className="campus-credit">
        <span>
          {county ? 'Westchester County GIS' : 'NYC Open Data'} · DCP · GSHHG
          {!flat ? ' · Mapzen terrain' : ''}
        </span>
        <button
          type="button"
          aria-label="Campus map sources"
          aria-expanded={sources}
          onClick={() => setSources((s) => !s)}
        >
          <Info size={13} />
          Sources
        </button>
      </div>
      {sources && (
        <div className="campus-source-card">
          <strong>{campus.shortName}</strong>
          <p>
            Building footprints and streets follow public GIS data. Window spacing and roof trim are
            illustrative.
          </p>
          <p>
            {county
              ? 'Westchester County GIS · General information only.'
              : 'NYC Open Data · Building footprints and street centerlines.'}{' '}
          </p>
          <a href={target.evidence_url} target="_blank" rel="noreferrer">
            Identity source <ExternalLink size={12} />
          </a>
          {target.height_evidence_url && (
            <a href={target.height_evidence_url} target="_blank" rel="noreferrer">
              Height source <ExternalLink size={12} />
            </a>
          )}
          <button onClick={() => setSources(false)}>Close sources</button>
        </div>
      )}
    </section>
  )
}
