// What every panel suite shares: the two assertion helpers, their counters, and a PanelState
// fixture small enough to read but shaped exactly like the real one.
//
// The counters are module state on purpose. One process runs every suite and the entry point
// reports a single total, so a suite that failed cannot be lost in the noise.

import type { PanelState } from '@/webview/protocol'

let passed = 0
let failed = 0

export function check(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++
    console.log(`  ok    ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}`)
    console.log(`          expected ${JSON.stringify(expected)}`)
    console.log(`          actual   ${JSON.stringify(actual)}`)
  }
}

export function checkThat(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ok    ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}${detail ? `, ${detail}` : ''}`)
  }
}

export const OBSIDIAN = { bg: '#111113', fg: '#d6d8db', accent: '#2578b3', green: '#98bd73' }
export const CHALK = { bg: '#f7f6f3', fg: '#2e3642', accent: '#2578b3', green: '#477826' }

export function panel(over: Partial<PanelState> = {}): PanelState {
  return {
    roles: [
      {
        id: 'bg',
        label: 'Editor background',
        group: 'Surfaces',
        keys: ['a'],
        scopes: [],
        floor: { on: 'none' },
      },
      {
        id: 'fg',
        label: 'Primary text',
        group: 'Foregrounds',
        keys: ['b'],
        scopes: ['c'],
        floor: { on: 'bg', min: 7 },
      },
      {
        id: 'green',
        label: 'Green',
        group: 'Hue ramp',
        keys: [],
        scopes: ['d'],
        floor: { on: 'bg', min: 3.5 },
      },
      {
        id: 'accent',
        label: 'Accent',
        group: 'Accent',
        keys: ['e'],
        scopes: [],
        floor: { on: 'bg', min: 3 },
      },
    ],
    concepts: [{ term: 'comment', role: 'fg', reads: 'Comments are painted by Primary text' }],
    themes: [
      { label: 'Chromaleon Obsidian', highContrast: false },
      { label: 'Chromaleon Chalk', highContrast: false },
    ],
    palettes: { 'Chromaleon Obsidian': OBSIDIAN, 'Chromaleon Chalk': CHALK },
    active: 'Chromaleon Obsidian',
    accentOverride: null,
    presets: {},
    activePresets: {},
    settings: [{ key: 'italics', kind: 'boolean', description: 'Italicise comments.' }],
    settingValues: { italics: true },
    treeIcons: {},
    ...over,
  }
}

export const withPreset = (overrides: Record<string, string> = {}, on = false) =>
  panel({
    presets: { p1: { name: 'Preset 1', base: 'Chromaleon Obsidian', overrides } },
    activePresets: on ? { 'Chromaleon Obsidian': 'p1' } : {},
  })

export const tally = () => ({ passed, failed })
