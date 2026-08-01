import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOCK = join(ROOT, 'src', 'theme-lock.json')

/** Hashes every generated theme file, in a stable order. */
export async function fingerprint(): Promise<string> {
  const dir = join(ROOT, 'themes')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  const hash = createHash('sha256')
  for (const file of files) {
    hash.update(file)
    hash.update(await readFile(join(dir, file)))
  }
  return hash.digest('hex')
}

export async function readLock(): Promise<{ note: string; sha256: string }> {
  return JSON.parse(await readFile(LOCK, 'utf8'))
}

export { LOCK }
