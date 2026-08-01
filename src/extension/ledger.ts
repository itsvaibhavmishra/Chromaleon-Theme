import type * as vscode from 'vscode'

import { NS } from './settings'

// Which keys we wrote, per scope block, so a later pass can remove exactly what it added
// and nothing the user set by hand.
const OWNED = `${NS}.ownedColorKeys`

export type Owned = Record<string, string[]>

// Settings Sync carries settings.json between machines but not extension globalState.
// Without this the ledger stays behind and the keys it describes become unremovable
// orphans on every other machine.
export function registerForSync(context: vscode.ExtensionContext): void {
  context.globalState.setKeysForSync([OWNED])
}

export function readOwned(context: vscode.ExtensionContext): Owned {
  return context.globalState.get<Owned>(OWNED, {})
}

export async function writeOwned(context: vscode.ExtensionContext, owned: Owned): Promise<void> {
  await context.globalState.update(OWNED, owned)
}

// Removes only tracked keys from each scope, dropping a block when it becomes empty.
// Deleting whole blocks by brand name would destroy a user's own "[Chromaleon Payne]" entry.
export function stripOwned(all: Record<string, unknown>, owned: Owned): void {
  for (const [scope, keys] of Object.entries(owned)) {
    const value = all[scope]
    if (typeof value !== 'object' || value === null) continue
    const block = { ...(value as Record<string, string>) }
    for (const key of keys) delete block[key]
    if (Object.keys(block).length === 0) delete all[scope]
    else all[scope] = block
  }
}
