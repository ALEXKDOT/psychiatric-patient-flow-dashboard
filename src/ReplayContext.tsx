import { createContext, useContext } from 'react'
import type { ReplayClock } from './replay'

export const ReplayContext = createContext<ReplayClock | null>(null)

// The clock object is stable across simulation frames. Reading it here does
// not subscribe a React component to animation frames.
export function useReplayClock(): ReplayClock {
  const clock = useContext(ReplayContext)
  if (!clock) throw new Error('Replay controls require the application replay clock')
  return clock
}
