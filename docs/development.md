<div align="center">
  <img src="assets/banner.png" alt="Chromaleon - Shift your colours" width="100%" />
</div>

<br/>

# Development

How Chromaleon is built, and how to work on it. For what the extension does, see the
[README](../README.md).

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![esbuild](https://img.shields.io/badge/esbuild-FFCF00?style=for-the-badge&logo=esbuild&logoColor=black)
![Preact](https://img.shields.io/badge/Preact-673AB8?style=for-the-badge&logo=preact&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

## 🧬 How it works

Themes are **generated, not hand-written**. A variant declares three values and the build
expands them into 279 workbench colour keys, 81 TextMate rules and 18 semantic tokens.

```
src/core/        colour maths, Palette type, accents (pure, no vscode, no fs)
src/theme/       variants, workbench/token/semantic maps, high-contrast transform
src/icons/       Material icon ingest + accent recolouring
src/extension/   extension-host runtime (settings, colours, italics, icons, ledger)
src/webview/     the customizer panel, its protocol and canvas
src/scripts/     build, check, lock, release
```

Three properties fall out of that:

- **The manifest cannot drift.** `contributes.themes` and `contributes.iconThemes` are rewritten
  by the build from the variant list. You never edit them.
- **Contrast is structural.** Every neutral is a fixed step along `bg -> fg`, so a new variant
  inherits the same contrast relationships instead of needing them re-tuned by eye.
- **The runtime cannot fall out of step.** Which colour keys carry the accent is _discovered_ at
  build time by rendering the mapping with sentinel colours. Add an accent-coloured key and the
  accent setting picks it up with no second list to update.

## 🛠️ Build

The repo carries **source only**. `themes/`, `icons/`, `dist/` and `src/generated.ts` are all
build output and gitignored. [`src/theme-lock.json`](../src/theme-lock.json) fingerprints what the
build must produce, so a fresh clone is verifiably identical rather than merely present.

```bash
npm install
npm run build              # required after cloning, nothing is generated yet
npm run check              # build + audits + typecheck + lint + format + tests
npm test                   # behavioural tests only
npm run package            # produce a .vsix
npm run lock               # re-record the fingerprint (intended visual changes only)
```

`npm run check` fails on:

- The generated themes differing from the fingerprint. Refactors must be visually neutral.
- Body text below 7:1, or a meaning-carrying syntax colour below 3.5:1.
- An accent below 3:1 on its background, or on-accent text below 4.5:1.
- A high contrast pair brightening in-editor texture rather than separating regions.
- An icon theme with a missing SVG or an association pointing at nothing.

Then the behavioural tests run the built bundle against a stubbed `vscode` module and check what
each setting actually does. Pass an extension directory to test an installed copy:

```bash
node test/settings.cjs ~/.vscode/extensions/<id>
```

## 🎯 Adding a variant

Append to `VARIANTS` in [`src/theme/variants.ts`](../src/theme/variants.ts):

```ts
defineVariant({ name: 'Ember', bg: [18, 22, 10], fg: [24, 26] }),
// or a light one, where every derivation flips direction:
defineVariant({ name: 'Vellum', bg: [42, 26, 95], fg: [30, 20], light: true }),
```

Then `npm run check`. That produces `Chromaleon Ember` and `Chromaleon Ember High Contrast`,
registers both in the manifest, and verifies every contrast floor.

## 📄 License

[MIT](../LICENSE.txt)
