import '@testing-library/jest-dom'
import { vi } from 'vitest'

// 模拟 IndexedDB
class MockIndexedDB {
  open(_name: string, _version?: number) {
    return {
      onerror: null,
      onupgradeneeded: null,
      onsuccess: null,
    }
  }
}

// 模拟 window.indexedDB
Object.defineProperty(window, 'indexedDB', {
  value: new MockIndexedDB(),
  writable: true,
})

// 模拟 mermaid 渲染
Object.defineProperty(window, 'mermaid', {
  value: {
    initialize: vi.fn(),
    render: vi.fn(() => Promise.resolve('svg')),
  },
  writable: true,
})

// 模拟 ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// 模拟 matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})