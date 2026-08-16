import * as vscode from 'vscode'

import type { Layout } from '@/webview/protocol'

// The only signal: a webview gets the theme's colours but not the sizes the layout is built from.
export const LAYOUT_SECTION = 'workbench.experimental.modernUI'

// Read here and nowhere else, so the day this experimental name moves costs one function.
export function activeLayout(): Layout {
  const on = vscode.workspace.getConfiguration().get<boolean>(LAYOUT_SECTION)
  return on === true ? 'modern' : 'classic'
}
