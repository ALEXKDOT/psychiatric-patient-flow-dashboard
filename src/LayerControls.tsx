import { Check, ArrowUpRight } from 'lucide-react'
import type { MapLayers } from './GeoMap'

export type VisibleLayers = Required<MapLayers>
export const initialLayers: VisibleLayers = {
  facilities: true,
  transfers: true,
  trails: true,
  referrals: true,
  labels: true,
}

const layerOptions: { key: keyof VisibleLayers; label: string }[] = [
  { key: 'facilities', label: 'Campus sites' },
  { key: 'transfers', label: 'Transfer tracks' },
  { key: 'trails', label: 'Recent trails · 2h' },
  { key: 'referrals', label: 'Selected referrals' },
  { key: 'labels', label: 'Place names' },
]

export function LayerControls({
  layers,
  onToggle,
  onMovements,
  activeCount,
}: {
  layers: VisibleLayers
  onToggle: (key: keyof VisibleLayers) => void
  onMovements: () => void
  activeCount: number
}) {
  return (
    <section className="layer-controls" aria-label="Map layers">
      <h2 className="rail-caption">
        Map layers <span>{Object.values(layers).filter(Boolean).length} / 5</span>
      </h2>
      <div className="layer-list">
        {layerOptions.map(({ key, label }) => (
          <label key={key} className="layer-toggle">
            <input type="checkbox" checked={layers[key]} onChange={() => onToggle(key)} />
            <span className="layer-box" aria-hidden="true">
              {layers[key] && <Check size={11} strokeWidth={3} />}
            </span>
            <span>{label}</span>
            <i aria-hidden="true" className={'map-key key-' + key}>
              {key === 'labels' ? 'Aa' : ''}
            </i>
          </label>
        ))}
      </div>
      <button className="transfer-index" onClick={onMovements} aria-label="Schematic transfers">
        <span>Schematic transfers</span>
        <b>{String(activeCount).padStart(2, '0')}</b>
        <ArrowUpRight size={13} />
      </button>
    </section>
  )
}
