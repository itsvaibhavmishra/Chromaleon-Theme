# Changelog

> Chromaleon - Shift your colours

All notable changes to this extension are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-08-16

### New

- The miniature follows VS Code's new rounded workbench, and can preview either layout.
- Settings the workbench you are running ignores are disabled, and say why.

### Improvements

- A new banner, leading with what you can make rather than how many themes ship.
- The customizer remembers how tall you left the miniature.

### Fixed

- The miniature draws the panel edges a theme paints, which high contrast ones always had.

## [0.1.2] - 2026-08-13

### New

- Merging staging into main is the release. It tags, builds, runs the full check against that commit and publishes the GitHub release, so there is no tag to push by hand.

### Fixed

- The readme no longer opens on a literal `[!IMPORTANT]`. GitHub renders that as an alert and the marketplace does not, so the listing showed the markup instead of the message.
- The readme no longer shows a broken installs badge. Shields retired its marketplace endpoints and the replacement vsmarketplacebadges.dev returns 500 for every extension, so there is no working provider to point at.

### Developers

- `docs/development.md` covers branches and releasing, which it never did: what each branch publishes, what `npm run release` and `npm run skip-release` do, and what blocks a release that is not ready.

### Internal

- staging no longer publishes a beta on every merge. Merging into main is the only thing that publishes, and `skip release` now means one thing rather than two.
- A required release-ready check blocks a staging into main merge unless the version went up, the changelog has a dated section for it, the devlog is empty and the tag is free.
- `npm run skip-release` opens a staging into main pull request already labelled, for moving work to main without cutting a version.
- `npm run release <x.y.z>` now cuts the branch, runs check, commits, pushes and opens both pull requests, so a release is one command and a failing check never becomes a branch anybody has to look at.
- `npm run release` retries the commit three times, thirty seconds apart, when signing fails. The key asks for a touch and the prompt arrives after a long check, so it was easy to miss and lose the run to a rollback.
- A release is dated where it is cut rather than in UTC. Cutting one in the first hours of the day was stamping it with yesterday.
- The release-ready check no longer reads an empty devlog as a full one. It matched the headings as well as the entries, so it would have blocked every release.

## [0.1.1] - 2026-08-12

### New

- Tagging main publishes a GitHub release with the vsix attached and the changelog as its notes.
- Every push to staging publishes a pre-release build, so there is always an installable copy of what is coming.
- A release can be started by hand against any tag, which is the only way to publish one tagged before this existed.
- The `skip release` label on a PR merges into staging without publishing a beta, and the commit marker still works for a push that had no PR.
- Open Customizer and Open Settings sit on Chromaleon's own row in the Extensions view, so the panel is reachable without knowing the command palette.

### Improvements

- The readme leads with the customizer and walks a first run through picking a theme, changing a colour and saving it, with a screenshot at every step.
- The variant table lists Chalk, which it had been missing while the text below it referred to Chalk's neutrals.

### Fixed

- A beta build no longer fails its own verification for having a version the changelog has never heard of.
- The manifest no longer marks itself private, which would have refused to publish.

### Developers

- Build, architecture and variant instructions moved to `docs/development.md`, so the readme is only what someone installing the extension needs.

### Internal

- `npm run release <x.y.z>` moves the devlog into the changelog and bumps the version, so the two cannot disagree.
- The README version badge reads the latest release rather than being edited by hand.
- `npm run release` no longer breaks its own changelog. It parted the reference links with a blank line, which fails the format check, so every release after the first would have.

## [0.1.0] - 2026-08-09

### New

- 20+ colour themes, dark and light, each variant generating a high contrast version alongside it.
- **Chromaleon Icons**, built on [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) (MIT) with 672 file icons, 578 folder icons, 13,017 associations.
- Fifteen settings covering accent, status bar, selections, cursor, current line, tabs, borders, shadows, italics, folder tinting and where the customizer opens, plus five commands.
- **The customizer**, a panel for editing any of the 29 colour roles against a live miniature of the window. The miniature is a map as well as a preview: clicking a region names the role that paints it, and selecting a role rings every region it touches. It reflects the settings that change surfaces, and draws file icons from whichever icon theme is active.
- Edits are held as a draft, so nothing reaches VS Code until Save, with undo and redo across the whole session. A shipped theme is never written to: editing one forks it into a preset first.
- Presets, saved with the theme they were built on and when they were saved, searchable, applied or deleted in bulk, and previewed by holding the eye on a card.
- Import and export of presets as versioned `.json` files. A file that is not ours, is truncated, or was made by a newer format says so rather than failing quietly, and a preset built on a theme that is not installed is refused while the rest of the file still imports. An import identical to something already saved is flagged rather than duplicated.
- A one-click fix for a role below its contrast floor, which moves lightness only so the hue survives.
- A walkthrough under Get Started, since VS Code strips command links out of an extension's README.
- Contrast auditing in `npm run check`: body text, syntax hues, accent-on-background and on-accent text all have enforced floors.
- A theme fingerprint (`src/theme-lock.json`) so refactors cannot change how a theme looks by accident.

### Fixed

- Settings are no longer rewritten with the value they already hold. VS Code applies a configuration write to the open document rather than to disk, so an open `settings.json` was marked dirty on every change.
- `Chromaleon: Reset All Settings` now clears every contributed setting. The list was hand-kept and had missed `customizerLocation`, so the command reported success and left it in place.
- `.gitignore` no longer excludes `src/icons/`. The pattern was unanchored, so it matched the source directory as well as the build output, so a clone would not have built.
- The package manifest is an allowlist, so only the files an installed extension needs are shipped and nothing new leaks in by default.

- Workspace-level `workbench.colorCustomizations` are no longer copied into user settings.
- Hand-authored `"[Chromaleon …]"` scope blocks are no longer deleted; only keys this extension wrote are removed.
- The owned-key ledger is registered for Settings Sync, so keys stay removable on every machine.
- The README no longer ends on a profile view counter. The marketplace refuses an extension whose readme loads images from a domain outside its allowlist, so the badge made this unpublishable.

[0.1.0]: https://github.com/itsvaibhavmishra/Chromaleon-Theme/releases/tag/v0.1.0
[0.1.1]: https://github.com/itsvaibhavmishra/Chromaleon-Theme/releases/tag/v0.1.1
[0.1.2]: https://github.com/itsvaibhavmishra/Chromaleon-Theme/releases/tag/v0.1.2
[0.1.3]: https://github.com/itsvaibhavmishra/Chromaleon-Theme/releases/tag/v0.1.3
