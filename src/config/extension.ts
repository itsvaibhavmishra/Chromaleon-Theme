// How Chromaleon identifies itself inside somebody else's settings file. Everything here
// ends up in a user's settings.json or in their theme block, so changing a value is a
// breaking change for anyone who already has it written down.

import { RUNTIME } from '@/generated'

// The settings namespace. Every contributed setting is `chromaleon.<key>`, and the reset
// command derives its key list from the manifest by matching this prefix.
export const NS = 'chromaleon'

// Tags the token rules we own so a rebuild can replace ours and leave the user's alone.
// Rules carry a name, so they are recognised exactly rather than by shape.
export const OWNED_MARK = `${RUNTIME.brand}:`
