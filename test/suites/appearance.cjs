const { DEFAULT_ACCENT, contrast, check, checkThat, run } = require('#test/harness.cjs')

module.exports = async function appearance() {
  console.log('\ndefaults')
  {
    const result = await run({})
    check('writes no colour overrides', result.scopes, [])
    check('writes no token overrides', result.tokens, undefined)
    check('switches icon theme', result.iconTheme, 'chromaleon-icons')
    check('shows explorer arrows by default', result.iconThemeJson.hidesExplorerArrows, false)
    checkThat(
      "keeps Material's folder colours",
      !result.folderSvg.includes(DEFAULT_ACCENT),
      'folder was tinted with the accent when accentFolders is off',
    )
  }

  console.log('\naccent')
  {
    const result = await run({ accent: 'Purple' })
    check('repaints button background', result.colors['button.background'], '#b583db')
    checkThat(
      'repaints all accent keys',
      Object.keys(result.colors).length === 57,
      `${Object.keys(result.colors).length} keys`,
    )
    check('scopes overrides to the active theme', result.scopes, ['[Chromaleon Woad]'])
    check('picks black on a light accent', result.colors['button.foreground'], '#000000')
  }
  {
    const result = await run({ accent: 'Chromaleon' })
    check('default accent is a no-op', result.scopes, [])
  }
  {
    const result = await run({ customAccent: '#ff0000', accent: 'Purple' })
    check('customAccent overrides the named accent', result.colors['button.background'], '#ff0000')
  }
  {
    const result = await run({ customAccent: 'nonsense', accent: 'Purple' })
    check('invalid customAccent falls back', result.colors['button.background'], '#b583db')
  }
  {
    const result = await run({ customAccent: '#101010' })
    check('picks white on a very dark accent', result.colors['button.foreground'], '#ffffff')
  }

  console.log('\naccentedStatusBar')
  {
    const result = await run({ accentedStatusBar: true })
    check('paints the status bar', result.colors['statusBar.background'], DEFAULT_ACCENT)
    checkThat(
      'keeps status bar text legible on it',
      contrast(result.colors['statusBar.background'], result.colors['statusBar.foreground']) >= 4.5,
      `${contrast(result.colors['statusBar.background'], result.colors['statusBar.foreground']).toFixed(2)}:1`,
    )
  }
  {
    const result = await run({ accentedStatusBar: true, accent: 'Purple' })
    check('follows the chosen accent', result.colors['statusBar.background'], '#b583db')
    check(
      'flips its text to black on a light accent',
      result.colors['statusBar.foreground'],
      '#000000',
    )
  }

  console.log('\nselectionStyle')
  {
    const base = await run({})
    const result = await run({ selectionStyle: 'accent' })
    checkThat(
      'retints selection onto the accent',
      result.colors['editor.selectionBackground'] !== undefined,
      'nothing written',
    )
    checkThat(
      'differs from the room-hue default',
      result.colors['editor.selectionBackground'] !== base.colors['editor.selectionBackground'],
      'identical to default',
    )
  }
  {
    const result = await run({ selectionStyle: 'room' })
    check('room is the no-op default', result.scopes, [])
  }

  console.log('\ncursorStyle')
  {
    const result = await run({ cursorStyle: 'accent' })
    check('uses the accent', result.colors['editorCursor.foreground'], DEFAULT_ACCENT)
  }
  {
    const result = await run({ cursorStyle: 'theme' })
    check('theme is the no-op default', result.scopes, [])
  }

  console.log('\nitalics')
  {
    const result = await run({ italics: false })
    checkThat(
      'emits textMateRules',
      Array.isArray(result.tokens?.textMateRules),
      JSON.stringify(result.tokens),
    )
    checkThat(
      'clears fontStyle on every italic scope',
      result.tokens?.textMateRules?.every((rule) => rule.settings.fontStyle === ''),
      'a rule kept its italic style',
    )
    checkThat(
      'covers more than one scope',
      (result.tokens?.textMateRules?.length ?? 0) >= 5,
      `${result.tokens?.textMateRules?.length} scopes`,
    )
  }
  {
    const result = await run({ italics: true })
    check('on is the no-op default', result.tokens, undefined)
  }

  console.log('\ncurrentLine')
  {
    const result = await run({ currentLine: 'solid' })
    checkThat(
      'fills the line and drops the outline',
      result.colors['editor.lineHighlightBorder'] === '#00000000' &&
        result.colors['editor.lineHighlightBackground'] !== '#00000000',
      JSON.stringify(result.colors),
    )
  }
  {
    const result = await run({ currentLine: 'none' })
    check(
      'none clears both',
      [
        result.colors['editor.lineHighlightBackground'],
        result.colors['editor.lineHighlightBorder'],
      ],
      ['#00000000', '#00000000'],
    )
  }
  {
    const result = await run({ currentLine: 'outline' })
    check('outline is the no-op default', result.scopes, [])
  }

  console.log('\ntabIndicator')
  {
    const result = await run({ tabIndicator: 'top' })
    check(
      'moves to the top edge',
      [result.colors['tab.activeBorderTop'], result.colors['tab.activeBorder']],
      [DEFAULT_ACCENT, '#00000000'],
    )
  }
  {
    const result = await run({ tabIndicator: 'none' })
    check(
      'none clears both edges',
      [result.colors['tab.activeBorderTop'], result.colors['tab.activeBorder']],
      ['#00000000', '#00000000'],
    )
  }
  {
    const result = await run({ tabIndicator: 'bottom' })
    check('bottom is the no-op default', result.scopes, [])
  }

  console.log('\ntabBar')
  {
    const result = await run({ tabBar: 'contrasted' })
    checkThat(
      'darkens the tab bar',
      result.colors['editorGroupHeader.tabsBackground'] !== undefined &&
        result.colors['editorGroupHeader.tabsBackground'] !== '#11131d',
      result.colors['editorGroupHeader.tabsBackground'],
    )
  }
  {
    const result = await run({ tabBar: 'flat' })
    check('flat is the no-op default', result.scopes, [])
  }

  console.log('\nborders')
  {
    const subtle = await run({ borders: 'subtle' })
    const strong = await run({ borders: 'strong' })
    checkThat(
      'subtle sets every border key',
      Object.keys(subtle.colors).length === 8,
      Object.keys(subtle.colors).join(','),
    )
    checkThat(
      'strong is brighter than subtle',
      contrast('#11131d', strong.colors['sideBar.border']) >
        contrast('#11131d', subtle.colors['sideBar.border']),
      `${subtle.colors['sideBar.border']} vs ${strong.colors['sideBar.border']}`,
    )
  }
  {
    const result = await run({ borders: 'none' })
    check('none is the no-op default', result.scopes, [])
  }
  {
    // An accented status bar must keep its own edge rather than a grey one.
    const result = await run({ borders: 'strong', accentedStatusBar: true })
    check(
      'accented status bar keeps its own border',
      result.colors['statusBar.border'],
      DEFAULT_ACCENT,
    )
  }

  console.log('\nshadows')
  {
    const result = await run({ shadows: false })
    check(
      'clears the shadows',
      [result.colors['widget.shadow'], result.colors['scrollbar.shadow']],
      ['#00000000', '#00000000'],
    )
  }
  {
    const result = await run({ shadows: true })
    check('on is the no-op default', result.scopes, [])
  }
}
