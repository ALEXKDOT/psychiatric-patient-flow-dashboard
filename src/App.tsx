import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Dashboard } from './Dashboard'
import { getRun } from './runs'
import { campusById } from './data'
import { EvidenceRecord, EvidenceDirectory } from './Evidence'
import { Playback } from './Playback'
import { Comparison } from './Comparison'
import { DEFAULT_SEED, type Scenario } from './sim'
import { createReplayClock } from './replay'
import { ReplayContext } from './ReplayContext'

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('baseline')
  const run = useMemo(() => getRun(scenario, DEFAULT_SEED), [scenario])
  const [clock] = useState(() =>
    createReplayClock({
      minute: run.openingMinute,
      duration: run.duration,
      speed: 360,
    })
  )
  const { minute, playing, speed } = useSyncExternalStore(clock.subscribe, clock.getSnapshot)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncVisibility = () => clock.setVisible(!document.hidden)
    const syncMotion = () => clock.setReducedMotion(preference.matches)
    syncVisibility()
    syncMotion()
    if (!preference.matches) clock.play()
    preference.addEventListener('change', syncMotion)
    document.addEventListener('visibilitychange', syncVisibility)
    return () => {
      preference.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', syncVisibility)
      clock.pause()
    }
  }, [clock])
  const frame = useMemo(() => run.presentationAt(minute), [run, minute])
  return (
    <ReplayContext.Provider value={clock}>
      <Dashboard
        frame={frame}
        scenario={scenario}
        setScenario={(s) => {
          clock.pause()
          setScenario(s)
        }}
        playback={
          <Playback
            minute={minute}
            duration={run.duration}
            speed={speed}
            playing={playing}
            onPlay={playing ? clock.pause : clock.play}
            onSpeed={clock.setSpeed}
            sample={run.openingMinute}
            onSeek={clock.seek}
          />
        }
        comparison={<Comparison seed={DEFAULT_SEED} currentScenario={scenario} />}
        record={(id) => <EvidenceRecord campus={campusById[id]} />}
        directory={(choose, id) => <EvidenceDirectory selectedId={id} onSelect={choose} />}
      />
    </ReplayContext.Provider>
  )
}
