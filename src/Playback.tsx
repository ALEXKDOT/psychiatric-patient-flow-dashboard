import { Pause, Play, RotateCcw, LocateFixed } from 'lucide-react'
import { clockLabel } from './ui'
type Props = {
  minute: number
  duration: number
  playing: boolean
  speed: number
  onPlay: () => void
  onSpeed: (speed: number) => void
  onSeek: (minute: number) => void
  sample: number
}
export function Playback({
  minute,
  duration,
  playing,
  speed,
  onPlay,
  onSpeed,
  onSeek,
  sample,
}: Props) {
  const complete = minute >= duration
  const displayTime = complete ? 'D7 · 24:00' : clockLabel(minute)
  const playLabel = complete ? 'Replay from Day 1' : playing ? 'Pause replay' : 'Play replay'
  return (
    <section className="playback" aria-label="Simulation playback">
      <button onClick={onPlay} className="play-toggle" title={playLabel} aria-label={playLabel}>
        {playing ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
      </button>
      <div className="replay-clock">
        <span>{complete ? 'Replay complete' : playing ? 'Simulated replay' : 'Replay paused'}</span>
        <output aria-live="off">{displayTime}</output>
      </div>
      <div className="replay-track">
        <div className="day-labels" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i}>D{1 + i}</span>
          ))}
        </div>
        <label className="scrubber">
          <span className="sr-only">Replay minute</span>
          <input
            type="range"
            min={0}
            max={duration}
            step={1}
            value={minute}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-valuetext={displayTime.replace(/^D/, 'Day ')}
            style={{
              backgroundImage:
                'linear-gradient(to right,var(--orange) ' +
                (100 * minute) / duration +
                '%,#d2d6d5 0)',
            }}
          />
        </label>
      </div>
      <select
        className="speed"
        aria-label="Playback speed"
        value={speed}
        onChange={(e) => onSpeed(Number(e.target.value))}
      >
        {[1, 60, 360, 1440].map((v) => (
          <option key={v} value={v}>
            {v}×
          </option>
        ))}
      </select>
      <button
        className="icon-btn"
        title="Reset to Day 1"
        aria-label="Reset to Day 1"
        onClick={() => onSeek(0)}
      >
        <RotateCcw size={14} />
      </button>
      <button
        className="icon-btn"
        title="Seek to sample transfer"
        aria-label="Seek to sample transfer"
        onClick={() => onSeek(sample)}
      >
        <LocateFixed size={15} />
      </button>
    </section>
  )
}
