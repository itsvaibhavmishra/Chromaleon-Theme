import { execFileSync } from 'node:child_process'

import { ROOT } from '@/scripts/fingerprint'

// Running git and gh from the release commands. Kept together so both spell the failure the
// same way, and so a command that shells out is obvious from its imports.

export function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** For anything whose output the person running it should see, like check or gh pr create. */
export function loud(command: string, args: string[]): void {
  execFileSync(command, args, { cwd: ROOT, stdio: 'inherit' })
}

export function capture(command: string, args: string[]): string {
  return execFileSync(command, args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

export function fail(message: string): never {
  console.error(`\n${message}`)
  process.exit(1)
}

/** Blocks the whole script, which is the point: nothing else should happen while it waits. */
function pause(seconds: number): void {
  execFileSync('sleep', [String(seconds)], { stdio: 'ignore' })
}

// Commit signing goes through a key that asks for a touch, and a prompt is easy to miss while
// the check that precedes it runs. Missing one should cost a wait, not the whole release.
export function commitSigned(message: string, attempts = 3, waitSeconds = 30): void {
  for (let attempt = 1; ; attempt += 1) {
    try {
      git('commit', '-m', message)
      return
    } catch (error) {
      if (attempt >= attempts) throw error
      console.log(
        `\nsigning failed on attempt ${attempt} of ${attempts}. ` +
          `Retrying in ${waitSeconds}s, approve the prompt when it appears.`,
      )
      pause(waitSeconds)
    }
  }
}

/** The open pull request from one branch into another, if there is one. */
export function openPullRequest(base: string, head: string): number | undefined {
  const found = capture('gh', ['pr', 'list', '--base', base, '--head', head, '--json', 'number'])
  const [first] = JSON.parse(found || '[]') as { number: number }[]
  return first?.number
}

/** Opens the pull request, or corrects the one already open so a stale title cannot survive. */
export function upsertPullRequest(options: {
  base: string
  head: string
  title: string
  body: string
  labels?: string[]
}): void {
  const existing = openPullRequest(options.base, options.head)
  const labelArgs = (options.labels ?? []).flatMap((label) => ['--add-label', label])

  if (existing === undefined) {
    loud('gh', [
      'pr',
      'create',
      '--base',
      options.base,
      '--head',
      options.head,
      '--title',
      options.title,
      '--body',
      options.body,
      ...(options.labels ?? []).flatMap((label) => ['--label', label]),
    ])
    return
  }

  console.log(`\nupdating the open ${options.head} into ${options.base} pull request, #${existing}`)
  loud('gh', [
    'pr',
    'edit',
    String(existing),
    '--title',
    options.title,
    '--body',
    options.body,
    ...labelArgs,
  ])
}
