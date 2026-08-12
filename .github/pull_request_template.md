### Description

<!-- What changed, and why. The why is the part that is hard to recover later. -->

### Screenshots or Video

<!-- Anything that changes what the panel or a theme looks like. -->

### Devlog

<!-- Required for a PR into staging. Add your line to devlog.txt under the heading that
     matches who the change is for, and tick the box below.
     Not required for staging into main: npm run release has already moved the whole devlog
     into CHANGELOG.md by then. -->

- [ ] `devlog.txt` updated, or this is a staging into main pull request

### Release

<!-- Only meaningful on a staging into main pull request, because merging into main is what
     publishes. staging publishes nothing.

     A release is prepared by `npm run release <x.y.z>`, which opens both pull requests.
     `npm run skip-release` opens a staging into main pull request already labelled, for a
     merge that is deliberately not a release. -->

- [ ] Not a release, so this pull request carries the `skip release` label

### Checklist

- [ ] `npm run check` passes, and I gated on its exit code rather than reading its output
- [ ] `npm run check:history <base>..HEAD` passes, so every commit stands on its own
- [ ] `src/theme-lock.json` is untouched, or the commit body says why a theme changed on purpose
- [ ] Screenshots are up to date with the latest push
