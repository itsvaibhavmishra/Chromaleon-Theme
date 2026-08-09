import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { ROOT } from '@/scripts/fingerprint'

// `npm run check` validates the working tree and CI validates the commit that was pushed.
// Neither looks at the commits in between, and an intermediate tree is a state that never
// existed on disk. Splitting a change is exactly when one stops standing up on its own.
//
// Each commit is checked in its own worktree, so this runs safely with uncommitted work in
// progress and cannot leave the repo on a detached head if it fails halfway.

const git = (...args: string[]) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()

function main() {
  const range = process.argv[2] ?? 'origin/main..HEAD'
  const commits = git('rev-list', '--reverse', range).split('\n').filter(Boolean)

  if (commits.length === 0) {
    console.log(`ok   nothing to check, ${range} is empty`)
    return
  }

  console.log(`checking ${commits.length} commit${commits.length === 1 ? '' : 's'} in ${range}\n`)
  const failed: string[] = []

  for (const sha of commits) {
    const subject = git('log', '-1', '--format=%s', sha)
    const short = sha.slice(0, 7)
    const dir = mkdtempSync(join(tmpdir(), 'chromaleon-'))

    try {
      git('worktree', 'add', '--detach', '--quiet', dir, sha)
      // A worktree has no node_modules, and every tool the check runs resolves from cwd.
      symlinkSync(
        join(ROOT, 'node_modules'),
        join(dir, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir',
      )
      execFileSync('npm', ['run', 'check'], { cwd: dir, stdio: 'pipe', shell: true })
      console.log(`ok   ${short}  ${subject}`)
    } catch (error) {
      failed.push(short)
      console.log(`FAIL ${short}  ${subject}`)
      const output = (error as { stdout?: Buffer }).stdout?.toString() ?? ''
      for (const line of output
        .split('\n')
        .filter((l) => /error|FAIL/i.test(l))
        .slice(0, 6)) {
        console.log(`       ${line.trim()}`)
      }
    } finally {
      git('worktree', 'remove', '--force', dir)
      rmSync(dir, { recursive: true, force: true })
    }
  }

  console.log(`\n${commits.length - failed.length}/${commits.length} commits pass`)
  if (failed.length > 0) process.exit(1)
}

main()
