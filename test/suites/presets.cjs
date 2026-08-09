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
    // Three separate bugs shipped with the same shape: a base rule pinned a property, so the
    // class meant to change it could never win, and the setting silently did nothing. These
    // pin that each mode still has something to move. No browser: the question is whether the
    // rule can reach the property at all, which is a question about the stylesheet.
    const css = fs.readFileSync(path.join(ROOT, 'dist', 'webview.css'), 'utf8')
    const MODES = [
      ['.cv-indicator-top .cv-tab-on', 'border-top-color'],
      ['.cv-indicator-bottom .cv-tab-on', 'border-bottom-color'],
      ['.cv-line-outline .cv-line-on', 'box-shadow'],
      ['.cv-line-solid .cv-line-on', 'background'],
      ['.cv-tabbar-contrasted .cv-tabs', 'background'],
      ['.cv-borders-subtle .cv-side', 'border-color'],
      ['.cv-accented-status .cv-status', 'background'],
      ['.cv-italics .cv-em', 'font-style'],
      ['.cv-selection-accent .cv-sel', 'background'],
      ['.cv-cursor-accent .cv-cursor', 'background'],
    ]
    for (const [selector, property] of MODES) {
      const block = css.slice(css.indexOf(selector))
      checkThat(
        `${selector} still sets ${property}`,
        css.includes(selector) && block.slice(0, block.indexOf('}')).includes(property),
        'the rule is gone, so the setting changes nothing',
      )
    }

    // The base rules the modes act on must leave those properties free to be moved. The
    // bundle is minified, so the selector runs straight into its brace.
    const ruleFor = (selector) => {
      const at = css.indexOf(`${selector}{`)
      return at === -1 ? '' : css.slice(at, css.indexOf('}', at))
    }
    const baseTab = ruleFor('.cv-tab')
    checkThat(
      'the tab carries both edges for the indicator to colour',
      baseTab.includes('border-top') && baseTab.includes('border-bottom'),
      'an edge is missing, so one indicator setting cannot show',
    )
    checkThat(
      'and the active tab pins neither, so the setting decides',
      !ruleFor('.cv-tab-on').includes('border-top-color') &&
        !ruleFor('.cv-tab-on').includes('border-bottom-color'),
      'the active tab hardcodes an edge again, which is the bug that shipped',
    )

    for (const asset of ['webview.js', 'webview.css', 'extension.cjs']) {
      checkThat(`dist/${asset} is built`, fs.existsSync(path.join(ROOT, 'dist', asset)), 'missing')
    }
  }
}
