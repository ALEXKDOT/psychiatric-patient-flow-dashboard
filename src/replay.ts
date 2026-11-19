// Read-only renderers sample the same monotonic clock. Only run.at() projects
// patient locations, admissions and other ledger state.
export interface ReplayDriver {
  now(): number
  request(callback: () => void): number
  cancel(handle: number): void
}

interface ReplayOptions {
  minute: number
  duration: number
  speed: number
  driver?: ReplayDriver
}

const browserDriver: ReplayDriver = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
}

export function createReplayClock({
  minute,
  duration,
  speed,
  driver = browserDriver,
}: ReplayOptions) {
  let base = minute
  let anchor = driver.now()
  let wantsPlay = false
  let visible = true
  let reducedMotion = false
  let paintedMinute: number | null = null
  let frameHandle: number | null = null
  let snapshot = { minute: Math.floor(minute), playing: false, speed }
  const changes = new Set<() => void>()
  const painters = new Set<(minute: number) => void>()

  function readMinute() {
    if (!visible || !wantsPlay) return base
    return Math.min(duration, base + ((driver.now() - anchor) * speed) / 60000)
  }
  function freeze() {
    base = readMinute()
    anchor = driver.now()
  }
  function update() {
    const current = readMinute()
    if (current >= duration) {
      base = duration
      wantsPlay = false
    }
    const playing = wantsPlay && visible
    const integer = Math.floor(current)
    if (integer !== snapshot.minute || playing !== snapshot.playing || speed !== snapshot.speed) {
      snapshot = { minute: integer, playing, speed }
      for (const notify of changes) notify()
    }
    const paintTime = reducedMotion ? integer : current
    if (paintTime !== paintedMinute) {
      paintedMinute = paintTime
      for (const paint of painters) paint(paintTime)
    }
    // Schedule once, including when a callback synchronously changes the clock.
    if (wantsPlay && visible && frameHandle === null) {
      frameHandle = driver.request(() => {
        frameHandle = null
        update()
      })
    } else if ((!wantsPlay || !visible) && frameHandle !== null) {
      driver.cancel(frameHandle)
      frameHandle = null
    }
  }
  function play() {
    if (wantsPlay) return
    if (base >= duration) base = 0
    anchor = driver.now()
    wantsPlay = true
    update()
  }
  function pause() {
    if (!wantsPlay) return
    freeze()
    wantsPlay = false
    update()
  }
  function seek(next: number) {
    if (!Number.isFinite(next)) return
    base = Math.max(0, Math.min(duration, next))
    wantsPlay = false
    anchor = driver.now()
    update()
  }
  function setSpeed(next: number) {
    if (!Number.isFinite(next) || next <= 0 || next === speed) return
    freeze()
    speed = next
    update()
  }
  function setVisible(next: boolean) {
    if (visible === next) return
    freeze()
    visible = next
    update()
  }
  function setReducedMotion(next: boolean) {
    if (reducedMotion === next) return
    freeze()
    reducedMotion = next
    if (reducedMotion) wantsPlay = false
    update()
  }
  function subscribe(callback: () => void) {
    changes.add(callback)
    return () => {
      changes.delete(callback)
    }
  }
  function subscribeFrame(callback: (minute: number) => void) {
    painters.add(callback)
    const current = readMinute()
    callback(reducedMotion ? Math.floor(current) : current)
    return () => {
      painters.delete(callback)
    }
  }
  return {
    readMinute,
    getSnapshot: () => snapshot,
    subscribe,
    subscribeFrame,
    play,
    pause,
    seek,
    setSpeed,
    setVisible,
    setReducedMotion,
  }
}

export type ReplayClock = ReturnType<typeof createReplayClock>
