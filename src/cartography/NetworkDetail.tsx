import { memo } from 'react'
import { useAtlasTheme } from '../ThemeControl'
import tileIds from './network-tiles.json'

const available = new Set(tileIds)

// The regional stage has a north-up, unpitched Mercator camera in both renderers.
// Its scale is CSS pixels per projected degree, independent of device pixel ratio.
export const NetworkDetail = memo(function NetworkDetail({
  longitude,
  mercatorY,
  scale,
  width,
  height,
}: {
  longitude: number
  mercatorY: number
  scale: number
  width: number
  height: number
}) {
  const theme = useAtlasTheme()
  const z = scale < 1000 ? 9 : scale < 4500 ? 11 : 12
  const span = 360 / 2 ** z
  const side = span * scale
  const centerX = (180 + longitude) / span
  const centerY = (180 - mercatorY) / span
  const tiles = []
  for (
    let y = Math.floor(centerY - height / (2 * side));
    y <= Math.floor(centerY + height / (2 * side));
    y++
  ) {
    for (
      let x = Math.floor(centerX - width / (2 * side));
      x <= Math.floor(centerX + width / (2 * side));
      x++
    ) {
      const id = z + '-' + x + '-' + y
      if (!available.has(id)) continue
      tiles.push(
        <image
          key={id}
          href={import.meta.env.BASE_URL + 'geography/network/' + id + '-' + theme + '.webp'}
          x={width / 2 + (x - centerX) * side}
          y={height / 2 + (y - centerY) * side}
          width={side}
          height={side}
          preserveAspectRatio="none"
        />,
      )
    }
  }
  return (
    <g
      data-detail-level={z === 9 ? 'region' : z === 11 ? 'city' : 'street'}
      pointerEvents="none"
      aria-hidden="true"
    >
      {tiles}
    </g>
  )
})
