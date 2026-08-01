import type { Palette } from '../core/palette'
import { a } from '../core/color'

// Maps every workbench colour key VS Code exposes onto a palette role, grouped by
// namespace. Adding a variant never touches this file.
export function workbench(p: Palette): Record<string, string> {
  return {
    // activityBar
    'activityBar.activeBorder': p.accent,
    'activityBar.background': p.chrome,
    'activityBar.border': a(p.border, '99'),
    'activityBar.foreground': p.fg,
    'activityBar.inactiveForeground': a(p.fgMuted, 'b3'),

    // activityBarBadge
    'activityBarBadge.background': p.accent,
    'activityBarBadge.foreground': p.onAccent,

    // activityBarTop
    'activityBarTop.activeBorder': p.accent,
    'activityBarTop.background': p.chrome,
    'activityBarTop.foreground': p.fg,
    'activityBarTop.inactiveForeground': a(p.fgMuted, 'b3'),

    // activityErrorBadge
    'activityErrorBadge.background': p.red,
    'activityErrorBadge.foreground': p.black,

    // activityWarningBadge
    'activityWarningBadge.background': p.yellow,
    'activityWarningBadge.foreground': p.black,

    // agentsPanel
    'agentsPanel.border': a(p.border, '99'),

    // badge
    'badge.background': a(p.surfaceAlt, '99'),
    'badge.foreground': p.fg,

    // breadcrumb
    'breadcrumb.activeSelectionForeground': p.accent,
    'breadcrumb.background': p.bg,
    'breadcrumb.focusForeground': p.fg,
    'breadcrumb.foreground': p.fgMuted,

    // breadcrumbPicker
    'breadcrumbPicker.background': p.chrome,

    // button
    'button.background': p.accent,
    'button.foreground': p.onAccent,
    'button.hoverBackground': a(p.accent, 'cc'),
    'button.secondaryBackground': p.chrome,
    'button.secondaryForeground': p.fg,
    'button.separator': a(p.onAccent, '33'),

    // chat
    'chat.avatarForeground': p.accent,
    'chat.checkpointSeparator': p.guide,
    'chat.requestBorder': a(p.white, '0f'),
    'chat.requestBubbleBackground': p.surface,
    'chat.requestBubbleHoverBackground': p.surface,
    'chat.requestCodeBorder': p.lineNumber,
    'chat.slashCommandBackground': a(p.white, '00'),
    'chat.slashCommandForeground': p.accent,

    // commandCenter
    'commandCenter.activeBorder': a(p.bgAlt, '00'),
    'commandCenter.activeForeground': p.fg,
    'commandCenter.border': p.bgAlt,
    'commandCenter.foreground': a(p.fg, '99'),

    // _root
    contrastActiveBorder: a(p.bg, '00'),
    contrastBorder: a(p.bg, '00'),
    descriptionForeground: a(p.fg, 'cc'),
    disabledForeground: a(p.fgSubtle, 'ff'),
    focusBorder: a(p.white, '00'),
    foreground: p.fg,

    // debugConsole
    'debugConsole.errorForeground': p.red,
    'debugConsole.infoForeground': p.cyan,
    'debugConsole.warningForeground': p.yellow,

    // debugToolBar
    'debugToolBar.background': p.chrome,

    // diffEditor
    'diffEditor.insertedLineBackground': a(p.green, '14'),
    'diffEditor.insertedTextBackground': a(p.green, '14'),
    'diffEditor.removedLineBackground': a(p.red, '14'),
    'diffEditor.removedTextBackground': a(p.red, '14'),

    // dropdown
    'dropdown.background': p.chrome,
    'dropdown.border': a(p.white, '0f'),

    // editor
    'editor.background': p.bg,
    'editor.findMatchBackground': a(p.white, '26'),
    'editor.findMatchBorder': p.accent,
    'editor.findMatchHighlightBackground': a(p.white, '1a'),
    'editor.findMatchHighlightBorder': a(p.white, '4d'),
    'editor.findMatchHighlightForeground': p.fg,
    'editor.findRangeHighlightBackground': a(p.yellow, '4d'),
    'editor.foreground': p.fg,
    'editor.lineHighlightBackground': a(p.surfaceAlt, '00'),
    'editor.lineHighlightBorder': a(p.surfaceAlt, '99'),
    'editor.selectionBackground': a(p.accentDim, '80'),
    'editor.selectionForeground': p.fg,
    'editor.selectionHighlightBackground': a(p.cursor, '33'),
    'editor.wordHighlightBackground': a(p.pink, '4d'),
    'editor.wordHighlightStrongBackground': a(p.green, '4d'),

    // editorBracketMatch
    'editorBracketMatch.background': p.bg,
    'editorBracketMatch.border': a(p.cursor, '80'),

    // editorCodeLens
    'editorCodeLens.foreground': p.fgSubtle,

    // editorCursor
    'editorCursor.background': p.cursor,
    'editorCursor.foreground': p.cursor,

    // editorError
    'editorError.foreground': a(p.red, 'b3'),

    // editorGroup
    'editorGroup.border': a(p.fg, '0f'),

    // editorGroupHeader
    'editorGroupHeader.tabsBackground': p.bg,

    // editorGutter
    'editorGutter.addedBackground': a(p.green, '99'),
    'editorGutter.addedSecondaryBackground': a(p.green, '99'),
    'editorGutter.deletedBackground': a(p.red, '99'),
    'editorGutter.deletedSecondaryBackground': a(p.red, '99'),
    'editorGutter.modifiedBackground': a(p.blue, '99'),
    'editorGutter.modifiedSecondaryBackground': a(p.blue, '99'),

    // editorHoverWidget
    'editorHoverWidget.background': p.chrome,
    'editorHoverWidget.border': a(p.white, '0f'),

    // editorIndentGuide
    'editorIndentGuide.activeBackground': p.guide,
    'editorIndentGuide.background': a(p.guide, 'b3'),

    // editorInfo
    'editorInfo.foreground': a(p.blue, 'b3'),

    // editorLineNumber
    'editorLineNumber.activeForeground': p.fgMuted,
    'editorLineNumber.foreground': a(p.lineNumber, 'ff'),

    // editorLink
    'editorLink.activeForeground': p.fg,

    // editorMarkerNavigation
    'editorMarkerNavigation.background': a(p.fg, '0d'),

    // editorOverviewRuler
    'editorOverviewRuler.border': p.bg,
    'editorOverviewRuler.errorForeground': a(p.red, '99'),
    'editorOverviewRuler.findMatchForeground': p.accent,
    'editorOverviewRuler.infoForeground': a(p.blue, '99'),
    'editorOverviewRuler.warningForeground': a(p.yellow, '99'),

    // editorRuler
    'editorRuler.foreground': p.guide,

    // editorStickyScrollHover
    'editorStickyScrollHover.background': a(p.accentDim, '4d'),

    // editorSuggestWidget
    'editorSuggestWidget.background': p.chrome,
    'editorSuggestWidget.border': a(p.white, '0f'),
    'editorSuggestWidget.foreground': p.fg,
    'editorSuggestWidget.highlightForeground': p.accent,
    'editorSuggestWidget.selectedBackground': a(p.surfaceAlt, '99'),

    // editorWarning
    'editorWarning.foreground': a(p.yellow, 'b3'),

    // editorWhitespace
    'editorWhitespace.foreground': a(p.whitespace, 'ff'),

    // editorWidget
    'editorWidget.background': p.chrome,
    'editorWidget.border': p.accent,
    'editorWidget.resizeBorder': p.accent,

    // extensionBadge
    'extensionBadge.remoteForeground': p.fg,

    // extensionButton
    'extensionButton.background': a(p.accent, '14'),
    'extensionButton.border': a(p.accent, '14'),
    'extensionButton.foreground': p.accent,
    'extensionButton.hoverBackground': a(p.accent, '33'),
    'extensionButton.prominentBackground': a(p.accent, '14'),
    'extensionButton.prominentForeground': p.accent,
    'extensionButton.prominentHoverBackground': a(p.accent, '33'),
    'extensionButton.separator': a(p.accent, '33'),

    // extensionIcon
    'extensionIcon.preReleaseForeground': a(p.white, '1a'),
    'extensionIcon.verifiedForeground': p.green,

    // gitDecoration
    'gitDecoration.conflictingResourceForeground': a(p.yellow, 'e6'),
    'gitDecoration.deletedResourceForeground': a(p.red, 'e6'),
    'gitDecoration.ignoredResourceForeground': a(p.fgMuted, '80'),
    'gitDecoration.modifiedResourceForeground': a(p.blue, 'e6'),
    'gitDecoration.untrackedResourceForeground': a(p.green, 'e6'),

    // icon
    'icon.foreground': a(p.fg, 'b3'),

    // inlineChatInput
    'inlineChatInput.border': a(p.white, '0f'),

    // input
    'input.background': p.surface,
    'input.border': a(p.white, '0f'),
    'input.foreground': p.fg,
    'input.placeholderForeground': a(p.fg, '66'),

    // inputOption
    'inputOption.activeBackground': a(p.fg, '4d'),
    'inputOption.activeBorder': a(p.fg, '4d'),

    // inputValidation
    'inputValidation.errorBorder': p.red,
    'inputValidation.infoBorder': p.blue,
    'inputValidation.warningBorder': p.yellow,

    // keybindingLabel
    'keybindingLabel.border': p.border,
    'keybindingLabel.bottomBorder': p.border,

    // list
    'list.activeSelectionBackground': a(p.chrome, 'ff'),
    'list.activeSelectionForeground': p.accent,
    'list.activeSelectionIconForeground': p.accent,
    'list.dropBackground': a(p.fg, '1a'),
    'list.dropBetweenBackground': a(p.fg, '1a'),
    'list.focusBackground': a(p.fg, '26'),
    'list.focusForeground': p.fg,
    'list.highlightForeground': p.accent,
    'list.hoverBackground': p.chrome,
    'list.hoverForeground': p.white,
    'list.inactiveSelectionBackground': a(p.fg, '1a'),
    'list.inactiveSelectionForeground': p.accent,
    'list.inactiveSelectionIconForeground': p.accent,

    // listFilterWidget
    'listFilterWidget.background': a(p.fg, '1a'),
    'listFilterWidget.noMatchesOutline': a(p.fg, '1a'),
    'listFilterWidget.outline': a(p.fg, '1a'),

    // menu
    'menu.background': p.chrome,
    'menu.border': p.bgAlt,
    'menu.foreground': p.fg,
    'menu.selectionBackground': a(p.surfaceAlt, '99'),
    'menu.selectionBorder': a(p.fg, '1a'),
    'menu.selectionForeground': p.accent,
    'menu.separatorBackground': p.fg,

    // menubar
    'menubar.selectionBackground': a(p.fg, '1a'),
    'menubar.selectionBorder': a(p.fg, '1a'),
    'menubar.selectionForeground': p.accent,

    // merge
    'merge.border': a(p.bg, '00'),
    'merge.currentHeaderBackground': a(p.green, '4d'),
    'merge.incomingHeaderBackground': a(p.blue, '4d'),

    // notebook
    'notebook.focusedCellBorder': p.accent,
    'notebook.inactiveFocusedCellBorder': a(p.accent, '80'),

    // notificationLink
    'notificationLink.foreground': p.accent,

    // notificationToast
    'notificationToast.border': a(p.white, '0f'),

    // notifications
    'notifications.background': p.chrome,
    'notifications.foreground': p.fg,

    // notificationsWarningIcon
    'notificationsWarningIcon.foreground': p.yellow,

    // panel
    'panel.background': a(p.chrome, 'ff'),
    'panel.border': a(p.border, '99'),

    // panelSection
    'panelSection.dropBackground': a(p.fg, '1a'),

    // panelTitle
    'panelTitle.activeBorder': p.accent,
    'panelTitle.activeForeground': p.fg,
    'panelTitle.inactiveForeground': a(p.fg, '66'),

    // peekView
    'peekView.border': a(p.black, '4d'),

    // peekViewEditor
    'peekViewEditor.background': p.surface,
    'peekViewEditor.matchHighlightBackground': p.accentDim,

    // peekViewEditorGutter
    'peekViewEditorGutter.background': p.surface,

    // peekViewResult
    'peekViewResult.background': p.surface,
    'peekViewResult.matchHighlightBackground': p.accentDim,
    'peekViewResult.selectionBackground': a(p.fgMuted, 'b3'),

    // peekViewTitle
    'peekViewTitle.background': p.surface,

    // peekViewTitleDescription
    'peekViewTitleDescription.foreground': a(p.fg, '99'),

    // pickerGroup
    'pickerGroup.border': p.border,
    'pickerGroup.foreground': p.accent,

    // progressBar
    'progressBar.background': p.accent,

    // quickInput
    'quickInput.background': a(p.chrome, 'ff'),
    'quickInput.foreground': p.fgMuted,

    // quickInputList
    'quickInputList.focusBackground': a(p.fg, '26'),
    'quickInputList.focusIconForeground': p.fg,

    // quickInputTitle
    'quickInputTitle.background': p.chrome,

    // sash
    'sash.hoverBorder': a(p.accent, '80'),

    // scrollbar
    'scrollbar.shadow': a(p.black, '4d'),

    // scrollbarSlider
    'scrollbarSlider.activeBackground': p.accent,
    'scrollbarSlider.background': a(p.fgSlider, '21'),
    'scrollbarSlider.hoverBackground': a(p.fgSlider, '2e'),

    // selection
    'selection.background': p.accent,

    // settings
    'settings.checkboxBackground': p.chrome,
    'settings.checkboxForeground': p.fg,
    'settings.dropdownBackground': p.chrome,
    'settings.dropdownForeground': p.fg,
    'settings.headerForeground': p.fg,
    'settings.modifiedItemIndicator': p.accent,
    'settings.numberInputBackground': p.chrome,
    'settings.numberInputForeground': p.fg,
    'settings.textInputBackground': p.chrome,
    'settings.textInputForeground': p.fg,

    // sideBar
    'sideBar.background': p.chrome,
    'sideBar.border': a(p.border, '99'),
    'sideBar.foreground': p.fgMuted,

    // sideBarActivityBarTop
    'sideBarActivityBarTop.border': a(p.border, '99'),

    // sideBarSectionHeader
    'sideBarSectionHeader.background': p.chrome,
    'sideBarSectionHeader.border': a(p.border, '99'),

    // sideBarStickyScroll
    'sideBarStickyScroll.border': a(p.border, '99'),

    // sideBarTitle
    'sideBarTitle.foreground': p.fg,

    // statusBar
    'statusBar.background': p.chrome,
    'statusBar.border': a(p.border, '99'),
    'statusBar.debuggingBackground': a(p.accent, '1a'),
    'statusBar.debuggingForeground': p.accent,
    // fgUi, not fgMuted: status bar text conveys live information and must
    // clear WCAG AA. The muted ramp is tuned for mood and can fall below it.
    'statusBar.foreground': p.fgUi,
    'statusBar.noFolderBackground': p.chrome,

    // statusBarItem
    'statusBarItem.hoverBackground': a(p.fgSubtle, '33'),
    'statusBarItem.remoteBackground': a(p.accent, '14'),
    'statusBarItem.remoteForeground': p.accent,
    'statusBarItem.remoteHoverBackground': p.accent,
    'statusBarItem.remoteHoverForeground': p.onAccent,

    // tab
    'tab.activeBackground': p.bg,
    'tab.activeBorder': p.accent,
    'tab.activeBorderTop': a(p.accent, '00'),
    'tab.activeForeground': p.white,
    'tab.activeModifiedBorder': a(p.accent, '00'),
    'tab.border': p.bg,
    'tab.inactiveBackground': p.bg,
    'tab.inactiveForeground': p.fgMuted,
    'tab.unfocusedActiveBorder': p.accent,
    'tab.unfocusedActiveBorderTop': a(p.fgSubtle, '00'),
    'tab.unfocusedActiveForeground': p.fg,

    // terminal
    'terminal.ansiBlack': p.black,
    'terminal.ansiBlue': p.blue,
    'terminal.ansiBrightBlack': p.fgSubtle,
    'terminal.ansiBrightBlue': p.blue,
    'terminal.ansiBrightCyan': p.cyan,
    'terminal.ansiBrightGreen': p.green,
    'terminal.ansiBrightMagenta': p.purple,
    'terminal.ansiBrightRed': p.red,
    'terminal.ansiBrightWhite': p.white,
    'terminal.ansiBrightYellow': p.yellow,
    'terminal.ansiCyan': p.cyan,
    'terminal.ansiGreen': p.green,
    'terminal.ansiMagenta': p.purple,
    'terminal.ansiRed': p.red,
    'terminal.ansiWhite': p.white,
    'terminal.ansiYellow': p.yellow,

    // terminalCommandGuide
    'terminalCommandGuide.foreground': p.guide,

    // terminalCursor
    'terminalCursor.background': p.black,
    'terminalCursor.foreground': p.yellow,

    // textLink
    'textLink.activeForeground': p.fg,
    'textLink.foreground': p.accent,

    // textPreformat
    'textPreformat.background': a(p.surfaceAlt, '99'),
    'textPreformat.foreground': a(p.fg, 'b3'),

    // titleBar
    'titleBar.activeBackground': p.chrome,
    'titleBar.activeForeground': p.fg,
    'titleBar.border': a(p.border, '99'),
    'titleBar.inactiveBackground': p.chrome,
    'titleBar.inactiveForeground': p.fgMuted,

    // toolbar
    'toolbar.activeBackground': a(p.accent, '26'),
    'toolbar.hoverBackground': a(p.fg, '1a'),

    // tree
    'tree.indentGuidesStroke': p.guide,

    // widget
    'widget.border': a(p.white, '0f'),
    'widget.shadow': a(p.black, '4d'),
  }
}
