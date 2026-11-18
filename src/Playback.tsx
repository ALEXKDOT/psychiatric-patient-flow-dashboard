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
  return (
    <section className="playback" aria-label="Simulation playback">
      <button
        onClick={onPlay}
        className="play-toggle"
        aria-label={playing ? 'Pause replay' : 'Play replay'}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="replay-clock">
        <span>REPLAY</span>
        <output>{clockLabel(minute)}</output>
      </div>
      <label className="scrubber">
        <span className="sr-only">Replay minute</span>
        <input
          type="range"
          min="0"
          max={duration}
          step="1"
          value={minute}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-valuetext={clockLabel(minute)}
          style={{
            background:
              'linear-gradient(to right,#af5a31 ' + (100 * minute) / duration + '%,#cdd4c9 0)',
          }}
        />
      </label>
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
        <LocateFixed size={14} />
      </button>
    </section>
  )
}
