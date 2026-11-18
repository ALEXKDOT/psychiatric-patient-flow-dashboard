import { useEffect, useMemo, useRef, useState } from 'react'
import { Dashboard } from './Dashboard'
import { getRun } from './runs'
import { campusById } from './data'
import { EvidenceRecord, EvidenceDirectory } from './Evidence'
import { Playback } from './Playback'
import { Comparison } from './Comparison'
import { DEFAULT_SEED, type Scenario } from './sim'

export default function App() {
  const [scenario, setScenario] = useState<Scenario>('baseline')
  const run = useMemo(() => getRun(scenario, DEFAULT_SEED), [scenario])
  const [minute, setMinute] = useState(() => run.openingMinute)
  const [speed, setSpeed] = useState(360)
  const [playing, setPlaying] = useState(false)
  const minuteRef = useRef(minute)
  useEffect(() => {
    minuteRef.current = minute
  }, [minute])
  useEffect(() => {
    if (!playing) return
    const start = performance.now()
    const currentMinute = minuteRef.current
    const handle = window.setInterval(() => {
      const next = Math.min(
        run.duration,
        currentMinute + Math.floor(((performance.now() - start) * speed) / 60000),
      )
      setMinute(next)
      if (next >= run.duration) setPlaying(false)
    }, 180)
    return () => window.clearInterval(handle)
    // A new clock starts at the current replay time on play or speed change.
    // Clock ticks must not restart the interval or discard elapsed fractions.
  }, [playing, speed, run])
  const frame = useMemo(() => run.at(minute), [run, minute])
  function seek(time: number) {
    setPlaying(false)
    setMinute(time)
  }
  return (
    <Dashboard
      frame={frame}
      scenario={scenario}
      setScenario={(s) => {
        setPlaying(false)
        setScenario(s)
      }}
      playback={
        <Playback
          minute={minute}
          duration={run.duration}
          speed={speed}
          playing={playing}
          onPlay={() => {
            if (minute === run.duration) setMinute(0)
            setPlaying((p) => !p)
          }}
          onSpeed={setSpeed}
          sample={run.openingMinute}
          onSeek={seek}
        />
      }
      onInspect={() => setPlaying(false)}
      comparison={<Comparison seed={DEFAULT_SEED} currentScenario={scenario} />}
      record={(id) => <EvidenceRecord campus={campusById[id]} />}
      directory={(choose, id) => <EvidenceDirectory selectedId={id} onSelect={choose} />}
    />
  )
}
