const { ROOT, check, checkThat, run } = require('#test/harness.cjs')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function presets() {
  console.log('\npresets')
  {
    const on = {
      presets: {
        p1: { name: 'Preset 1', base: 'Chromaleon Woad', overrides: { green: '#00ff00' } },
      },
      activePresets: { 'Chromaleon Woad': 'p1' },
    }
    const result = await run(on)
    check(
      'recolours the workbench keys the role paints',
      result.colors['terminal.ansiGreen'],
      '#00ff00',
    )
    check(
      'including the translucent ones',
      result.colors['editorGutter.addedBackground'],
      '#00ff0099',
    )
    checkThat(
      'and every syntax scope, or the editor would not move',
      (result.tokens?.textMateRules ?? []).some(
        (rule) => rule.scope === 'string' && rule.settings.foreground === '#00ff00',
      ),
      JSON.stringify(result.tokens?.textMateRules?.slice(0, 2)),
    )
    checkThat(
      'scopes it does not paint are left alone',
      !(result.tokens?.textMateRules ?? []).some((rule) => rule.scope === 'comment'),
      'recoloured a scope belonging to another role',
    )
    check('overrides are scoped to the theme they were made on', result.scopes, [
      '[Chromaleon Woad]',
    ])
  }
  {
    // 119 of the 279 workbench keys render their role below full opacity. Writing a flat hex
    // over those turns every border and hover state into a slab, and the value would still
    // look correct in settings.json.
    const result = await run({
      presets: { p1: { name: 'Preset 1', base: 'Chromaleon Woad', overrides: { fg: '#ff0000' } } },
      activePresets: { 'Chromaleon Woad': 'p1' },
    })
    check('keeps the alpha the key renders at', result.colors['descriptionForeground'], '#ff0000cc')
    check('and leaves opaque keys opaque', result.colors['editor.foreground'], '#ff0000')
  }
  {
    const result = await run({ roleOverrides: { 'Chromaleon Basalt': { fg: '#ff0000' } } })
    check("another theme's overrides do not leak into this one", result.scopes, [])
  }
  {
    const result = await run({
      italics: false,
      presets: {
        p1: { name: 'Preset 1', base: 'Chromaleon Woad', overrides: { green: '#00ff00' } },
      },
      activePresets: { 'Chromaleon Woad': 'p1' },
    })
    const rules = result.tokens?.textMateRules ?? []
    checkThat(
      'italics and recolouring share one block without clobbering',
      rules.some((rule) => rule.settings.fontStyle === '') &&
        rules.some((rule) => rule.settings.foreground),
      `${rules.length} rules`,
    )
  }
  {
    const result = await run({
      presets: {
        p1: { name: 'Preset 1', base: 'Chromaleon Woad', overrides: { green: '#00ff00' } },
      },
      activePresets: { 'Chromaleon Woad': 'p1' },
    })
    const left = await result.deactivate()
    check('deactivate takes the overrides with it', left, undefined)
  }

  console.log('\ncustomizer panel')
  {
    const result = await run({})
    checkThat(
      'registers the open command',
      result.commands.includes('chromaleon.openCustomizer'),
      result.commands.join(', '),
    )
    // Opening on activation would pop a panel in everyone's face on every window.
    check('does not open the panel on activation', result.settings.__panelOpened, undefined)

    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const declared = manifest.contributes.commands.map((entry) => entry.command)
    checkThat(
      'every registered command is declared in the manifest',
      result.commands.every((command) => declared.includes(command)),
      result.commands.filter((command) => !declared.includes(command)).join(', '),
    )
    checkThat(
      'every declared command is actually registered',
      declared.every((command) => result.commands.includes(command)),
      declared.filter((command) => !result.commands.includes(command)).join(', '),
    )
  }
  {
    // The panel is served entirely from dist/, which is what localResourceRoots allows.
    for (const asset of ['webview.js', 'webview.css', 'extension.cjs']) {
      checkThat(`dist/${asset} is built`, fs.existsSync(path.join(ROOT, 'dist', asset)), 'missing')
    }
  }
}
