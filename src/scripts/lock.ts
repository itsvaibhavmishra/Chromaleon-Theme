import { writeFile } from 'node:fs/promises'

import { fingerprint, LOCK, readLock } from '@/scripts/fingerprint'

// Re-records the theme fingerprint. Only correct when a change to how the themes LOOK is
// intended: refactors and tooling changes must leave it untouched.
async function main() {
  const current = await fingerprint()
  const lock = await readLock()
  const previous = lock.sha256
  await writeFile(LOCK, `${JSON.stringify({ ...lock, sha256: current }, null, 2)}\n`)
  console.log(
    previous === current
      ? `theme fingerprint unchanged: ${current}`
      : `theme fingerprint re-locked\n  was ${previous}\n  now ${current}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
