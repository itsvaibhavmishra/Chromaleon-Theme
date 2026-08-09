const { ROOT, check, checkThat, baseStub, activateWith, run } = require('#test/harness.cjs')

module.exports = async function coexistence() {
  console.log('\ncombinations and cleanup')
  {
    const result = await run({ accent: 'Pink', borders: 'strong', shadows: false })
    checkThat(
      'combined settings merge',
      Object.keys(result.colors).length > 57,
      `${Object.keys(result.colors).length} keys`,
    )
    const left = await result.deactivate()
    check('deactivate clears our block', left, undefined)
  }
  {
    // A hand-written customisation must survive our add/remove cycle.
    const result = await run({ accent: 'Purple' })
    result.settings['workbench.colorCustomizations']['[Chromaleon Woad]']['editor.background'] =
      '#123456'
    const r2 = await run({ accent: 'Lime' })
    checkThat(
      'ours update without clobbering',
      r2.colors['button.background'] === '#a8d96f',
      r2.colors['button.background'],
    )
  }

  console.log('\nregressions (these three shipped as bugs once)')
  {
    // A workspace-level customization must not be absorbed into user settings.
    const result = await run(
      { accent: 'Purple' },
      {
        workspace: {
          'workbench.colorCustomizations': {
            '[Chromaleon Woad]': { 'editor.background': '#123456' },
          },
        },
      },
    )
    const globalBlock =
      (result.settings['workbench.colorCustomizations'] ?? {})['[Chromaleon Woad]'] ?? {}
    checkThat(
      'does not copy workspace customizations into global',
      globalBlock['editor.background'] === undefined,
      `leaked ${globalBlock['editor.background']}`,
    )
  }
  {
    // A hand-authored key in our own scope block must survive our add/remove cycle.
    const own = { '[Chromaleon Woad]': { 'editor.background': '#abcdef' } }
    const result = await run(
      { accent: 'Purple' },
      { global: { 'workbench.colorCustomizations': own } },
    )
    const after =
      (result.settings['workbench.colorCustomizations'] ?? {})['[Chromaleon Woad]'] ?? {}
    checkThat(
      'preserves hand-written keys in our scope block',
      after['editor.background'] === '#abcdef',
      JSON.stringify(after['editor.background']),
    )
  }
  {
    // Same for token customizations: only our own italic rules may be removed.
    const own = {
      '[Chromaleon Woad]': {
        textMateRules: [{ scope: 'keyword.control', settings: { foreground: '#ff0000' } }],
      },
    }
    const result = await run(
      { italics: true },
      { global: { 'editor.tokenColorCustomizations': own } },
    )
    const rules = (result.settings['editor.tokenColorCustomizations'] ?? {})['[Chromaleon Woad]']
      ?.textMateRules
    checkThat(
      "preserves the user's own textMateRules",
      Array.isArray(rules) && rules.some((rule) => rule.settings?.foreground === '#ff0000'),
      JSON.stringify(rules),
    )
  }
  {
    // The owned-key ledger has to be registered for Settings Sync, or the keys it
    // describes become unremovable orphans on every other machine.
    let synced = null
    const stub = baseStub()
    stub.workspace.getConfiguration = () => ({
      get: (key, fallback) => fallback,
      inspect: () => ({}),
      update: async () => {},
    })
    stub.commands = { registerCommand: () => ({ dispose() {} }), executeCommand: async () => {} }
    await activateWith(stub, {
      extensionPath: ROOT,
      extensionUri: { fsPath: ROOT },
      subscriptions: [],
      globalState: {
        get: (key, fallback) => fallback,
        update: async () => {},
        setKeysForSync: (keys) => void (synced = keys),
      },
    })
    checkThat(
      'registers the owned-key ledger for Settings Sync',
      Array.isArray(synced) && synced.length > 0,
      JSON.stringify(synced),
    )
  }

  {
    // Writing a value identical to the stored one is still an edit to settings.json. With that
    // file open in an editor the edit lands on the document, so it went dirty on every change
    // and VS Code surfaced it. Applying twice over unchanged settings must write nothing.
    const written = []
    const chromaleon = { accentedStatusBar: true }
    const settings = { 'workbench.colorTheme': 'Chromaleon Woad', 'workbench.iconTheme': 'vs-seti' }

    const stub = baseStub()
    stub.workspace.getConfiguration = (section) =>
      section === 'chromaleon'
        ? {
            get: (key, fallback) => (key in chromaleon ? chromaleon[key] : fallback),
            inspect: (key) => ({ key, globalValue: chromaleon[key] }),
            update: async (key, value) => void (chromaleon[key] = value),
          }
        : {
            get: (key, fallback) => (key in settings ? settings[key] : fallback),
            inspect: (key) => ({ key, globalValue: settings[key] }),
            update: async (key, value) => {
              written.push(key)
              settings[key] = value
            },
          }
    stub.commands = { registerCommand: () => ({ dispose() {} }), executeCommand: async () => {} }

    const context = () => ({
      extensionPath: ROOT,
      extensionUri: { fsPath: ROOT },
      extension: { packageJSON: { version: '0.0.0-test' } },
      subscriptions: [],
      globalState: {
        get: (key, fallback) => fallback,
        update: async () => {},
        setKeysForSync: () => {},
      },
    })

    await activateWith(stub, context())
    written.length = 0
    await activateWith(stub, context())
    check('applying unchanged settings writes nothing', written, [])
  }
}
