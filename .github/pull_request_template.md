### Description

<!-- What changed, and why. The why is the part that is hard to recover later. -->

### Screenshots or Video

<!-- Anything that changes what the panel or a theme looks like. -->

### Devlog

<!-- Required for a PR into staging. Add your line to devlog.txt under the heading that
     matches who the change is for, and tick the box below.
     Not required for staging into main: that PR moves the whole devlog into CHANGELOG.md. -->

- [ ] `devlog.txt` updated, or this is a staging into main release PR

### Release

<!-- Merging into staging publishes a beta build. If this change is not worth one, add the
     `skip release` label. Merging into main never publishes; tagging does. -->

- [ ] Not worth a beta build, so this PR carries the `skip release` label

### Checklist

- [ ] `npm run check` passes, and I gated on its exit code rather than reading its output
- [ ] `npm run check:history <base>..HEAD` passes, so every commit stands on its own
- [ ] `src/theme-lock.json` is untouched, or the commit body says why a theme changed on purpose
- [ ] Screenshots are up to date with the latest push
