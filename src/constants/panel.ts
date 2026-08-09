// Named data the customizer panel lays itself out by. No logic, and nothing that reads the
// DOM or the host, so a component can pull one value without dragging the panel in with it.

import type { RoleGroup } from '@/webview/protocol'

export const CANVAS_DEFAULT = 300
export const CANVAS_MIN = 150
// Leaves the list and the editor a workable share no matter how far the handle is dragged.
export const LOWER_MIN = 220

// Regions that own a click; anywhere else clears the selection. The detail pane is here
// because it is the selection, and the resizer because a drag ends in a click.
export const KEEPS_SELECTION =
  '.canvas, .list-pane, .detail, .resizer, .menu, .row-menu, button, input'

export const GROUPS: RoleGroup[] = ['Surfaces', 'Foregrounds', 'Accent', 'Hue ramp', 'Fixed']

export const TABS = ['Colours', 'Settings', 'Presets'] as const
export type Tab = (typeof TABS)[number]

// How many painted keys the detail pane shows before Show all. Primary text paints 70 things
// and nobody reads 70 identifiers; the canvas answers "where" better by ringing the regions.
export const KEY_PREVIEW = 6
