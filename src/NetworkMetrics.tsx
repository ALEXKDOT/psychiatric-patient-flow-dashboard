import { Layers3, Network, RadioTower, Hospital } from 'lucide-react'
import { Trendline } from './ui'
import type { Frame } from './sim'

export function NetworkMetrics({ frame }: { frame: Frame }) {
  const metrics = frame.metrics
  const occupancy = Math.round((100 * metrics.occupied) / metrics.capacity)
  return (
    <section className="metrics" aria-label="Network-wide simulation metrics">
      {[
        {
          name: 'Placement queue',
          value: metrics.queue,
          unit: 'episodes in ED',
          icon: <Layers3 />,
          line: frame.trends.map((t) => t.queue),
          color: '#b6663c',
        },
        {
          name: 'Open referrals',
          value: metrics.openReferrals,
          unit: 'pending requests',
          icon: <Network />,
        },
        {
          name: 'In transit',
          value: metrics.inTransit,
          unit: 'intercampus transfers',
          icon: <RadioTower />,
          line: frame.trends.map((t) => t.inTransit),
          color: '#687e73',
        },
        {
          name: 'Pool occupancy',
          value: occupancy,
          percent: true,
          unit: metrics.occupied + ' / ' + metrics.capacity + ' slots',
          icon: <Hospital />,
          line: frame.trends.map((t) => t.occupied),
          color: '#657969',
        },
      ].map((card) => (
        <article key={card.name} className="kpi">
          <div className="kpi-title">
            {card.icon}
            {card.name}
          </div>
          <div className="kpi-main">
            <strong>
              {card.value}
              {card.percent && <small>%</small>}
            </strong>
            <span>{card.unit}</span>
          </div>
          {card.line && <Trendline data={card.line.slice(-30)} color={card.color} />}
        </article>
      ))}
    </section>
  )
}
