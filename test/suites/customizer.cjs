const {
  ROOT,
  MANIFEST,
  check,
  checkThat,
  baseStub,
  activateWith,
  run,
} = require('#test/harness.cjs')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function customizer() {
  console.log('\ncustomizer opens where the setting says')
  {
    const open = async (location, theme = 'Chromaleon Woad') => {
      const executed = []
      const posted = []
      const written = []
      let column
      let receive
      // inspect() reflects what update() wrote. A stub that always reports nothing lets a
      // read-modify-write cycle look like it works when it is really overwriting itself,
      // which is exactly the shape of bug 1.
      const store = {}
      const stub = baseStub()
      stub.workspace.getConfiguration = (section) => ({
        get: (key, fallback) => {
          if (key in store) return store[key]
          if (key === 'customizerLocation') return location
          if (key === 'workbench.colorTheme') return theme
          return fallback
        },
        inspect: (key) => ({ key, globalValue: store[key] }),
        update: async (key, value) => {
          if (value === undefined) delete store[key]
          else store[key] = value
          written.push(`${section ?? ''}.${key}=${JSON.stringify(value)}`)
        },
      })
      // Here the panel is the thing under test, so opening it is expected rather than fatal.
      stub.window.createWebviewPanel = (_type, _title, viewColumn) => {
        column = viewColumn
        return {
          webview: {
            options: {},
            html: '',
            cspSource: 'vscode-webview:',
            asWebviewUri: (uri) => uri,
            onDidReceiveMessage: (handler) => {
              receive = handler
              return { dispose() {} }
            },
            postMessage: async (message) => void posted.push(message),
          },
          onDidDispose: () => ({ dispose() {} }),
          reveal() {},
        }
      }
      stub.commands = {
        registerCommand: (id, handler) => {
          if (id === 'chromaleon.openCustomizer') stub.__open = handler
          return { dispose() {} }
        },
        executeCommand: async (id) => void executed.push(id),
      }

      const { withStub } = await activateWith(stub, {
        extensionPath: ROOT,
        extensionUri: { fsPath: ROOT },
        extension: { packageJSON: { version: '0.0.0', ...MANIFEST } },
        subscriptions: [],
        globalState: {
          get: (key, fallback) => fallback,
          update: async () => {},
          setKeysForSync: () => {},
        },
      })
      // Applying the active theme on activation writes settings, and should. Drop those so
      // `written` holds only what opening and driving the panel did.
      const activationWrites = written.splice(0)

      await withStub(async () => {
        await stub.__open()
        // The panel asks for state as soon as its script runs; nothing is sent before that.
        if (receive) await receive({ type: 'ready' })
      })
      for (let flush = 0; flush < 8; flush++) await new Promise((resolve) => setTimeout(resolve, 0))
      // onDidReceiveMessage cannot be awaited by VS Code, so the handlers are fire and
      // forget. Settling the queue here is what lets a test see writes that a real user
      // would see land a few milliseconds later.
      const settle = async () => {
        for (let flush = 0; flush < 8; flush++)
          await new Promise((resolve) => setTimeout(resolve, 0))
      }
      const send = async (message) => {
        await withStub(() => receive(message))
        await settle()
      }
      return { executed, column, posted, written, activationWrites, send }
    }

    // There is no ViewColumn for a separate window, so this is the only observable
    // difference between opening in a new window and opening in this one.
    const moved = await open('newWindow')
    checkThat(
      'newWindow moves the panel out to its own window',
      moved.executed.includes('workbench.action.moveEditorToNewWindow'),
      moved.executed.join(', ') || 'nothing executed',
    )

    const active = await open('active')
    checkThat(
      'active leaves the panel in this window',
      !active.executed.includes('workbench.action.moveEditorToNewWindow'),
      'moved anyway',
    )
    check('active opens in the active column', active.column, -1)

    const beside = await open('beside')
    check('beside opens in the column alongside', beside.column, -2)
    checkThat(
      'beside leaves the panel in this window',
      !beside.executed.includes('workbench.action.moveEditorToNewWindow'),
      'moved anyway',
    )

    console.log('\ncustomizer state, and what it must never write')
    const opened = await open('active', 'Chromaleon Tyrian')
    const state = opened.posted.find((message) => message.type === 'state')?.state
    checkThat('the panel is sent state when it reports ready', !!state, 'nothing posted')

    check('every shipped theme is offered', state.themes.length, 22)
    check('every palette travels with them', Object.keys(state.palettes).length, 22)
    check('the catalogue travels once, not per theme', state.roles.length, 32)
    check('the active theme is named', state.active, 'Chromaleon Tyrian')
    checkThat(
      'high contrast variants are flagged rather than parsed in the panel',
      state.themes.filter((theme) => theme.highContrast).length === 11,
      `${state.themes.filter((theme) => theme.highContrast).length} flagged`,
    )

    // The whole point of switching themes inside the customizer is that it previews without
    // restyling the editor the user is working in. Writing colorTheme would break that, and
    // it is the kind of thing an innocent-looking refactor reintroduces.
    checkThat(
      'opening the customizer writes no settings of its own',
      opened.written.length === 0,
      opened.written.join(', '),
    )
    checkThat(
      'the panel never sets workbench.colorTheme',
      !opened.written.some((written) => written.includes('colorTheme')),
      opened.written.join(', '),
    )

    // A shipped theme is an origin, never a target. Saving a draft against one forks it, and
    // the 22 stay exactly as the build made them no matter what anyone does in the panel.
    await opened.send({
      type: 'save',
      base: 'Chromaleon Tyrian',
      preset: null,
      overrides: { fg: '#ff0000' },
    })
    const wrote = opened.written.join(' | ')
    checkThat(
      'saving against a shipped theme creates a preset instead',
      wrote.includes('chromaleon.presets=') && wrote.includes('"base":"Chromaleon Tyrian"'),
      wrote || 'nothing written',
    )
    checkThat(
      'the new preset is numbered from one',
      wrote.includes('"name":"Preset 1"') && wrote.includes('"overrides":{"fg":"#ff0000"}'),
      wrote,
    )

    // Saving must not switch the editor over on its own: that is what Apply is for.
    // The panel cannot know the id of a preset the host just forked, so it has to be told or
    // it keeps showing the shipped theme it was editing a moment ago.
    const told = opened.posted.filter((message) => message.type === 'saved').at(-1)
    checkThat(
      'the panel is told which preset the save landed in',
      told?.preset === 'p1',
      JSON.stringify(told) || 'nothing posted back',
    )

    checkThat(
      'saving changes neither the running theme nor which preset is on',
      !wrote.includes('colorTheme') && !wrote.includes('activePresets'),
      wrote,
    )

    // Apply is the one path allowed to move the editor, and it moves both halves together.
    const beforeApply = opened.written.length
    await opened.send({ type: 'applyTheme', base: 'Chromaleon Tyrian', preset: 'p1' })
    const applied = opened.written.slice(beforeApply).join(' | ')
    checkThat(
      'applying switches the theme and turns the preset on',
      applied.includes('workbench.colorTheme="Chromaleon Tyrian"') &&
        applied.includes('"Chromaleon Tyrian":"p1"'),
      applied,
    )

    // Choosing a theme is a deliberate, user-initiated act, so it goes through VS Code's own
    // picker rather than us writing the setting behind their back.
    // Reset all is a draft like any other edit, so it arrives as a save of an empty set. The
    // preset itself survives: only Delete removes one.
    await opened.send({
      type: 'save',
      base: 'Chromaleon Tyrian',
      preset: 'p1',
      overrides: {},
    })
    const afterReset = opened.written.at(-1)
    checkThat(
      'saving an empty set empties the preset and keeps it',
      afterReset.includes('"overrides":{}') && afterReset.includes('"name":"Preset 1"'),
      afterReset,
    )

    // A name is a label, so it lands immediately. It must not touch the overrides beside it.
    await opened.send({ type: 'renamePreset', preset: 'p1', name: '  Low glare  ' })
    const renamed = opened.written.at(-1)
    checkThat(
      'renaming trims and keeps the overrides',
      renamed.includes('"name":"Low glare"') && renamed.includes('"base":"Chromaleon Tyrian"'),
      renamed,
    )

    // An unnamed preset is unpickable from a list that shows nothing else about it.
    const beforeBlank = opened.written.length
    await opened.send({ type: 'renamePreset', preset: 'p1', name: '   ' })
    checkThat(
      'an empty name is refused rather than written',
      opened.written.length === beforeBlank,
      opened.written.slice(beforeBlank).join(' | '),
    )

    const beforeGhost = opened.written.length
    await opened.send({ type: 'renamePreset', preset: 'p99', name: 'Ghost' })
    checkThat(
      'and renaming a preset that is gone writes nothing',
      opened.written.length === beforeGhost,
      opened.written.slice(beforeGhost).join(' | '),
    )

    await opened.send({ type: 'deletePreset', preset: 'p1' })
    const afterDelete = opened.written.slice(-2).join(' | ')
    checkThat(
      'deleting removes it and switches it off, leaving no dangling id',
      !afterDelete.includes('"p1"') || afterDelete.includes('presets=undefined'),
      afterDelete,
    )

    // Applying a shipped theme with no preset is how you get back to what we ship.
    await opened.send({ type: 'applyTheme', base: 'Chromaleon Chalk', preset: null })
    const plain = opened.written.slice(-2).join(' | ')
    checkThat(
      'applying a shipped theme with no preset clears the one that was on',
      plain.includes('workbench.colorTheme="Chromaleon Chalk"'),
      plain,
    )

    const before = opened.written.length
    await opened.send({ type: 'pickTheme' })
    checkThat(
      'choosing a theme defers to the VS Code picker',
      opened.executed.includes('workbench.action.selectTheme'),
      opened.executed.join(', '),
    )
    checkThat(
      'and writes nothing itself',
      opened.written.length === before,
      opened.written.slice(before).join(', '),
    )

    // The settings tab drives every contributed setting through this one message.
    const settings = state.settings.map((setting) => setting.key)
    check('the panel is told every contributed setting', settings.length, 15)
    checkThat(
      'each one carries the control it needs',
      state.settings.every(
        (setting) =>
          ['boolean', 'enum', 'text'].includes(setting.kind) &&
          (setting.kind !== 'enum' || (setting.options?.length ?? 0) > 1),
      ),
      JSON.stringify(state.settings.find((setting) => !setting.kind)),
    )
    check('and what each is set to', typeof state.settingValues.italics, 'boolean')

    await opened.send({ type: 'setSetting', key: 'accentedStatusBar', value: true })
    checkThat(
      'setting one writes it globally',
      opened.written.some((entry) => entry.includes('accentedStatusBar=true')),
      opened.written.slice(-4).join(', ') || 'nothing written',
    )

    await opened.send({ type: 'setSetting', key: 'selectionStyle', value: 'accent' })
    checkThat(
      'and an enum lands the same way',
      opened.written.some((entry) => entry.includes('selectionStyle="accent"')),
      opened.written.slice(-4).join(', ') || 'nothing written',
    )
  }

  console.log('\nevery setting is declared in package.json')
  {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const declared = manifest.contributes.configuration.properties
    const names = Object.keys(declared).map((name) => name.replace('chromaleon.', ''))
    const READ = [
      'accent',
      'customAccent',
      'accentedStatusBar',
      'selectionStyle',
      'cursorStyle',
      'italics',
      'currentLine',
      'tabIndicator',
      'tabBar',
      'borders',
      'shadows',
      'accentFolders',
      'hideExplorerArrows',
      'syncIconTheme',
      'customizerLocation',
      'presets',
      'activePresets',
    ]
    check('manifest declares exactly what the runtime reads', names.sort(), [...READ].sort())

    // Reset used to walk a hand-kept list, and customizerLocation was never on it: the command
    // reported success and left the setting exactly where it was.
    const everySetting = Object.fromEntries(names.map((name) => [name, 'set']))
    const reset = await run(everySetting)
    await reset.runCommand('chromaleon.reset')
    check('reset clears every declared setting', Object.keys(reset.chromaleon), [])
    checkThat(
      'accent and customAccent lead the list',
      declared['chromaleon.accent'].order === 1 && declared['chromaleon.customAccent'].order === 2,
      'ordering changed',
    )
    const dupes = names.length !== new Set(names).size
    checkThat(
      'no duplicate orders',
      !dupes && new Set(Object.values(declared).map((entry) => entry.order)).size === names.length,
      'duplicate order values',
    )
  }
}
