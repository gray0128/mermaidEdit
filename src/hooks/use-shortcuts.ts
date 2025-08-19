import { useEffect } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

interface Shortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  handler: ShortcutHandler
  preventDefault?: boolean
}

export function useShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          shiftKey = false,
          altKey = false,
          metaKey = false,
          handler,
          preventDefault = true,
        } = shortcut

        if (
          e.key === key &&
          e.ctrlKey === ctrlKey &&
          e.shiftKey === shiftKey &&
          e.altKey === altKey &&
          e.metaKey === metaKey
        ) {
          if (preventDefault) {
            e.preventDefault()
          }
          handler(e)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts])
}