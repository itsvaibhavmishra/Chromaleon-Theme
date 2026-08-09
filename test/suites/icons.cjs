const { ROOT, ICON_THEME, contrast, check, checkThat, run } = require('#test/harness.cjs')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function icons() {
  console.log('\nicons')
  {
    const result = await run({ accentFolders: true, accent: 'Tomato' })
    checkThat(
      'tints folder icons',
      result.folderSvg.includes('#ff5c57'),
      result.folderSvg.slice(0, 90),
    )
    checkThat(
      'keeps the pale motive overlay distinct',
      new Set(result.folderSvg.match(/fill="#[0-9a-f]{6}"/gi) ?? []).size === 2,
      [...new Set(result.folderSvg.match(/fill="#[0-9a-f]{6}"/gi) ?? [])].join(' '),
    )
  }
  {
    const result = await run({ accentFolders: false })
    checkThat(
      'restores original colours when disabled',
      !result.folderSvg.includes('#ff5c57'),
      'stale tint left behind',
    )
  }
  {
    // Rewriting the SVGs in place leaves every iconPath identical, so VS Code serves its
    // cached images and the setting appears to do nothing. The directory has to move.
    const off = await run({ accentFolders: false })
    const on = await run({ accentFolders: true, accent: 'Tomato' })
    checkThat(
      'flipping the accent changes the icon paths, not just the bytes',
      off.folderSetDir !== on.folderSetDir,
      `both resolved to ${on.folderSetDir}`,
    )
    checkThat(
      'the theme json points at the live set',
      JSON.parse(fs.readFileSync(ICON_THEME, 'utf8')).iconDefinitions[
        'folder-src'
      ].iconPath.includes(on.folderSetDir),
      'theme json still points at a stale directory',
    )
  }
  {
    // Switching accents repeatedly must not accumulate directories in the install.
    for (const a of ['Tomato', 'Lime', 'Purple']) await run({ accentFolders: true, accent: a })
    const dirs = fs.readdirSync(path.join(ROOT, 'icons', 'folders'))
    checkThat('old folder sets are cleaned up', dirs.length === 2, dirs.join(', '))
  }
  {
    const result = await run({ hideExplorerArrows: true })
    check('hiding arrows sets the flag', result.iconThemeJson.hidesExplorerArrows, true)
  }
  {
    const result = await run({ syncIconTheme: false }, { iconTheme: 'vs-seti' })
    check('leaves the icon theme alone', result.iconTheme, 'vs-seti')
  }
  {
    const result = await run({}, { theme: 'Default Dark+', iconTheme: 'vs-seti' })
    check('does not hijack a non-Chromaleon theme', result.iconTheme, 'vs-seti')
    check('writes nothing for a non-Chromaleon theme', result.scopes, [])
  }

  console.log('\nlight variant (Chalk)')
  {
    // Every override that lifts a surface off the background has to flip direction on a
    // light variant. Mixing toward white on near-white paper produces nothing visible.
    const LIGHT = 'Chromaleon Chalk'
    const bg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'themes', 'Chromaleon-Chalk.json'), 'utf8'),
    ).colors['editor.background']

    const borders = await run({ borders: 'strong' }, { theme: LIGHT })
    checkThat(
      'borders are visible on a light background',
      contrast(bg, borders.colors['sideBar.border']) >= 1.35,
      `${borders.colors['sideBar.border']} on ${bg} = ${contrast(bg, borders.colors['sideBar.border']).toFixed(2)}:1`,
    )

    const currentLine = await run({ currentLine: 'solid' }, { theme: LIGHT })
    checkThat(
      'the solid current line is visible',
      currentLine.colors['editor.lineHighlightBackground'] !== bg &&
        contrast(bg, currentLine.colors['editor.lineHighlightBackground']) > 1.01,
      currentLine.colors['editor.lineHighlightBackground'],
    )

    const tabBar = await run({ tabBar: 'contrasted' }, { theme: LIGHT })
    checkThat(
      'the contrasted tab bar stays a shade of the paper, not a dark slab',
      contrast(bg, tabBar.colors['editorGroupHeader.tabsBackground']) < 2,
      `${tabBar.colors['editorGroupHeader.tabsBackground']} = ${contrast(bg, tabBar.colors['editorGroupHeader.tabsBackground']).toFixed(2)}:1`,
    )

    const untouched = await run({}, { theme: LIGHT })
    check('an untouched light install writes nothing', untouched.scopes, [])
  }
}
