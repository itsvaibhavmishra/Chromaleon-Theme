# Changelog

> Chromaleon - Shift your colours

All notable changes to this extension are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Eleven colour themes, ten dark and one light (Chalk), each with a generated high contrast pair.
- **Chromaleon Icons**, built on [Material Icon Theme](https://github.com/material-extensions/vscode-material-icon-theme) (MIT) with 672 file icons, 578 folder icons, 13,017 associations.
- Fourteen settings covering accent, status bar, selections, cursor, current line, tabs, borders, shadows, italics and folder tinting, plus four commands.
- Contrast auditing in `npm run check`: body text, syntax hues, accent-on-background and on-accent text all have enforced floors.
- A theme fingerprint (`src/theme-lock.json`) so refactors cannot change how a theme looks by accident.

### Fixed

- `.gitignore` no longer excludes `src/icons/`. The pattern was unanchored, so it matched the source directory as well as the build output, so a clone would not have built.
- The package manifest is an allowlist, so only the files an installed extension needs are shipped and nothing new leaks in by default.

- Workspace-level `workbench.colorCustomizations` are no longer copied into user settings.
- Hand-authored `"[Chromaleon …]"` scope blocks are no longer deleted; only keys this extension wrote are removed.
- The owned-key ledger is registered for Settings Sync, so keys stay removable on every machine.
