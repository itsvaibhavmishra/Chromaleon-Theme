# Changelog

> Chromaleon - Shift your colours

All notable changes to this extension are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-09

### Added

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

[0.1.0]: https://github.com/itsvaibhavmishra/Chromaleon-Theme/releases/tag/v0.1.0
