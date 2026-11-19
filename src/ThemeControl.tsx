import { useLayoutEffect, useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import './theme.css'

export type AtlasTheme = 'light' | 'dark'
const storageKey = 'flow-atlas.theme'
const listeners = new Set<() => void>()

function readPreference(): AtlasTheme {
  try {
    return localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

let theme = readPreference()

function applyTheme(next: AtlasTheme) {
  theme = next
  document.documentElement.dataset.theme = next
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', next === 'dark' ? '#161b1e' : '#f8f8f4')
  for (const notify of listeners) notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Geographic renderers can consume the same theme as the chrome. */
export function useAtlasTheme() {
  return useSyncExternalStore(
    subscribe,
    () => theme,
    () => 'light' as const,
  )
}

export function ThemeControl() {
  const current = useAtlasTheme()
  useLayoutEffect(() => {
    applyTheme(readPreference())
    function syncTabs(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) applyTheme(readPreference())
    }
    window.addEventListener('storage', syncTabs)
    return () => window.removeEventListener('storage', syncTabs)
  }, [])

  function toggle() {
    const next = current === 'light' ? 'dark' : 'light'
    applyTheme(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // The selected theme remains usable for this session when storage is unavailable.
    }
  }

  return (
    <button
      type="button"
      className="theme-control"
      onClick={toggle}
      aria-label="Dark theme"
      aria-pressed={current === 'dark'}
      title={current === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      {current === 'light' ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
    </button>
  )
}
