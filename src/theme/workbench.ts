import type { Palette } from '@/core/palette'
import { withAlpha } from '@/core/color'

// Maps every workbench colour key VS Code exposes onto a palette role, grouped by
// namespace. Adding a variant never touches this file.
export function workbench(palette: Palette): Record<string, string> {
  return {
    // activityBar
    'activityBar.activeBorder': palette.accent,
    'activityBar.background': palette.chrome,
    'activityBar.border': withAlpha(palette.border, '99'),
    'activityBar.foreground': palette.fg,
    'activityBar.inactiveForeground': withAlpha(palette.fgMuted, 'b3'),

    // activityBarBadge
    'activityBarBadge.background': palette.accent,
    'activityBarBadge.foreground': palette.onAccent,

    // activityBarTop
    'activityBarTop.activeBorder': palette.accent,
    'activityBarTop.background': palette.chrome,
    'activityBarTop.foreground': palette.fg,
    'activityBarTop.inactiveForeground': withAlpha(palette.fgMuted, 'b3'),

    // activityErrorBadge
    'activityErrorBadge.background': palette.red,
    'activityErrorBadge.foreground': palette.black,

    // activityWarningBadge
    'activityWarningBadge.background': palette.yellow,
    'activityWarningBadge.foreground': palette.black,

    // agentsPanel
    'agentsPanel.border': withAlpha(palette.border, '99'),

    // badge
    'badge.background': withAlpha(palette.surfaceAlt, '99'),
    'badge.foreground': palette.fg,

    // breadcrumb
    'breadcrumb.activeSelectionForeground': palette.accent,
    'breadcrumb.background': palette.bg,
    'breadcrumb.focusForeground': palette.fg,
    'breadcrumb.foreground': palette.fgMuted,

    // breadcrumbPicker
    'breadcrumbPicker.background': palette.chrome,

    // button
    'button.background': palette.accent,
    'button.foreground': palette.onAccent,
    'button.hoverBackground': withAlpha(palette.accent, 'cc'),
    'button.secondaryBackground': palette.chrome,
    'button.secondaryForeground': palette.fg,
    'button.separator': withAlpha(palette.onAccent, '33'),

    // chat
    'chat.avatarForeground': palette.accent,
    'chat.checkpointSeparator': palette.guide,
    'chat.requestBorder': withAlpha(palette.hairline, '0f'),
    'chat.requestBubbleBackground': palette.surface,
    'chat.requestBubbleHoverBackground': palette.surface,
    'chat.requestCodeBorder': palette.lineNumber,
    'chat.slashCommandBackground': withAlpha(palette.hairline, '00'),
    'chat.slashCommandForeground': palette.accent,

    // commandCenter
    'commandCenter.activeBorder': withAlpha(palette.bgAlt, '00'),
    'commandCenter.activeForeground': palette.fg,
    'commandCenter.border': palette.bgAlt,
    'commandCenter.foreground': withAlpha(palette.fg, '99'),

    // _root
    contrastActiveBorder: withAlpha(palette.bg, '00'),
    contrastBorder: withAlpha(palette.bg, '00'),
    descriptionForeground: withAlpha(palette.fg, 'cc'),
    disabledForeground: withAlpha(palette.fgSubtle, 'ff'),
    focusBorder: withAlpha(palette.hairline, '00'),
    foreground: palette.fg,

    // debugConsole
    'debugConsole.errorForeground': palette.red,
    'debugConsole.infoForeground': palette.cyan,
    'debugConsole.warningForeground': palette.yellow,

    // debugToolBar
    'debugToolBar.background': palette.chrome,

    // diffEditor
    'diffEditor.insertedLineBackground': withAlpha(palette.green, '14'),
    'diffEditor.insertedTextBackground': withAlpha(palette.green, '14'),
    'diffEditor.removedLineBackground': withAlpha(palette.red, '14'),
    'diffEditor.removedTextBackground': withAlpha(palette.red, '14'),

    // dropdown
    'dropdown.background': palette.chrome,
    'dropdown.border': withAlpha(palette.hairline, '0f'),

    // editor
    'editor.background': palette.bg,
    'editor.findMatchBackground': withAlpha(palette.hairline, '26'),
    'editor.findMatchBorder': palette.accent,
    'editor.findMatchHighlightBackground': withAlpha(palette.hairline, '1a'),
    'editor.findMatchHighlightBorder': withAlpha(palette.hairline, '4d'),
    'editor.findMatchHighlightForeground': palette.fg,
    'editor.findRangeHighlightBackground': withAlpha(palette.yellow, '4d'),
    'editor.foreground': palette.fg,
    'editor.lineHighlightBackground': withAlpha(palette.surfaceAlt, '00'),
    'editor.lineHighlightBorder': withAlpha(palette.surfaceAlt, '99'),
    'editor.selectionBackground': withAlpha(palette.accentDim, '80'),
    'editor.selectionForeground': palette.fg,
    'editor.selectionHighlightBackground': withAlpha(palette.cursor, '33'),
    'editor.wordHighlightBackground': withAlpha(palette.pink, '4d'),
    'editor.wordHighlightStrongBackground': withAlpha(palette.green, '4d'),

    // editorBracketMatch
    'editorBracketMatch.background': palette.bg,
    'editorBracketMatch.border': withAlpha(palette.cursor, '80'),

    // editorCodeLens
    'editorCodeLens.foreground': palette.fgSubtle,

    // editorCursor
    'editorCursor.background': palette.cursor,
    'editorCursor.foreground': palette.cursor,

    // editorError
    'editorError.foreground': withAlpha(palette.red, 'b3'),

    // editorGroup
    'editorGroup.border': withAlpha(palette.fg, '0f'),

    // editorGroupHeader
    'editorGroupHeader.tabsBackground': palette.bg,

    // editorGutter
    'editorGutter.addedBackground': withAlpha(palette.green, '99'),
    'editorGutter.addedSecondaryBackground': withAlpha(palette.green, '99'),
    'editorGutter.deletedBackground': withAlpha(palette.red, '99'),
    'editorGutter.deletedSecondaryBackground': withAlpha(palette.red, '99'),
    'editorGutter.modifiedBackground': withAlpha(palette.blue, '99'),
    'editorGutter.modifiedSecondaryBackground': withAlpha(palette.blue, '99'),

    // editorHoverWidget
    'editorHoverWidget.background': palette.chrome,
    'editorHoverWidget.border': withAlpha(palette.hairline, '0f'),

    // editorIndentGuide
    'editorIndentGuide.activeBackground': palette.guide,
    'editorIndentGuide.background': withAlpha(palette.guide, 'b3'),

    // editorInfo
    'editorInfo.foreground': withAlpha(palette.blue, 'b3'),

    // editorLineNumber
    'editorLineNumber.activeForeground': palette.fgMuted,
    'editorLineNumber.foreground': withAlpha(palette.lineNumber, 'ff'),

    // editorLink
    'editorLink.activeForeground': palette.fg,

    // editorMarkerNavigation
    'editorMarkerNavigation.background': withAlpha(palette.fg, '0d'),

    // editorOverviewRuler
    'editorOverviewRuler.border': palette.bg,
    'editorOverviewRuler.errorForeground': withAlpha(palette.red, '99'),
    'editorOverviewRuler.findMatchForeground': palette.accent,
    'editorOverviewRuler.infoForeground': withAlpha(palette.blue, '99'),
    'editorOverviewRuler.warningForeground': withAlpha(palette.yellow, '99'),

    // editorRuler
    'editorRuler.foreground': palette.guide,

    // editorStickyScrollHover
    'editorStickyScrollHover.background': withAlpha(palette.accentDim, '4d'),

    // editorSuggestWidget
    'editorSuggestWidget.background': palette.chrome,
    'editorSuggestWidget.border': withAlpha(palette.hairline, '0f'),
    'editorSuggestWidget.foreground': palette.fg,
    'editorSuggestWidget.highlightForeground': palette.accent,
    'editorSuggestWidget.selectedBackground': withAlpha(palette.surfaceAlt, '99'),

    // editorWarning
    'editorWarning.foreground': withAlpha(palette.yellow, 'b3'),

    // editorWhitespace
    'editorWhitespace.foreground': withAlpha(palette.whitespace, 'ff'),

    // editorWidget
    'editorWidget.background': palette.chrome,
    'editorWidget.border': palette.accent,
    'editorWidget.resizeBorder': palette.accent,

    // extensionBadge
    'extensionBadge.remoteForeground': palette.fg,

    // extensionButton
    'extensionButton.background': withAlpha(palette.accent, '14'),
    'extensionButton.border': withAlpha(palette.accent, '14'),
    'extensionButton.foreground': palette.accent,
    'extensionButton.hoverBackground': withAlpha(palette.accent, '33'),
    'extensionButton.prominentBackground': withAlpha(palette.accent, '14'),
    'extensionButton.prominentForeground': palette.accent,
    'extensionButton.prominentHoverBackground': withAlpha(palette.accent, '33'),
    'extensionButton.separator': withAlpha(palette.accent, '33'),

    // extensionIcon
    'extensionIcon.preReleaseForeground': withAlpha(palette.hairline, '1a'),
    'extensionIcon.verifiedForeground': palette.green,

    // gitDecoration
    'gitDecoration.conflictingResourceForeground': withAlpha(palette.yellow, 'e6'),
    'gitDecoration.deletedResourceForeground': withAlpha(palette.red, 'e6'),
    'gitDecoration.ignoredResourceForeground': withAlpha(palette.fgMuted, '80'),
    'gitDecoration.modifiedResourceForeground': withAlpha(palette.blue, 'e6'),
    'gitDecoration.untrackedResourceForeground': withAlpha(palette.green, 'e6'),

    // icon
    'icon.foreground': withAlpha(palette.fg, 'b3'),

    // inlineChatInput
    'inlineChatInput.border': withAlpha(palette.hairline, '0f'),

    // input
    'input.background': palette.surface,
    'input.border': withAlpha(palette.hairline, '0f'),
    'input.foreground': palette.fg,
    'input.placeholderForeground': withAlpha(palette.fg, '66'),

    // inputOption
    'inputOption.activeBackground': withAlpha(palette.fg, '4d'),
    'inputOption.activeBorder': withAlpha(palette.fg, '4d'),

    // inputValidation
    'inputValidation.errorBorder': palette.red,
    'inputValidation.infoBorder': palette.blue,
    'inputValidation.warningBorder': palette.yellow,

    // keybindingLabel
    'keybindingLabel.border': palette.border,
    'keybindingLabel.bottomBorder': palette.border,

    // list
    'list.activeSelectionBackground': withAlpha(palette.chrome, 'ff'),
    'list.activeSelectionForeground': palette.accent,
    'list.activeSelectionIconForeground': palette.accent,
    'list.dropBackground': withAlpha(palette.fg, '1a'),
    'list.dropBetweenBackground': withAlpha(palette.fg, '1a'),
    'list.focusBackground': withAlpha(palette.fg, '26'),
    'list.focusForeground': palette.fg,
    'list.highlightForeground': palette.accent,
    'list.hoverBackground': palette.chrome,
    'list.hoverForeground': palette.fgBright,
    'list.inactiveSelectionBackground': withAlpha(palette.fg, '1a'),
    'list.inactiveSelectionForeground': palette.accent,
    'list.inactiveSelectionIconForeground': palette.accent,

    // listFilterWidget
    'listFilterWidget.background': withAlpha(palette.fg, '1a'),
    'listFilterWidget.noMatchesOutline': withAlpha(palette.fg, '1a'),
    'listFilterWidget.outline': withAlpha(palette.fg, '1a'),

    // menu
    'menu.background': palette.chrome,
    'menu.border': palette.bgAlt,
    'menu.foreground': palette.fg,
    'menu.selectionBackground': withAlpha(palette.surfaceAlt, '99'),
    'menu.selectionBorder': withAlpha(palette.fg, '1a'),
    'menu.selectionForeground': palette.accent,
    'menu.separatorBackground': palette.fg,

    // menubar
    'menubar.selectionBackground': withAlpha(palette.fg, '1a'),
    'menubar.selectionBorder': withAlpha(palette.fg, '1a'),
    'menubar.selectionForeground': palette.accent,

    // merge
    'merge.border': withAlpha(palette.bg, '00'),
    'merge.currentHeaderBackground': withAlpha(palette.green, '4d'),
    'merge.incomingHeaderBackground': withAlpha(palette.blue, '4d'),

    // notebook
    'notebook.focusedCellBorder': palette.accent,
    'notebook.inactiveFocusedCellBorder': withAlpha(palette.accent, '80'),

    // notificationLink
    'notificationLink.foreground': palette.accent,

    // notificationToast
    'notificationToast.border': withAlpha(palette.hairline, '0f'),

    // notifications
    'notifications.background': palette.chrome,
    'notifications.foreground': palette.fg,

    // notificationsWarningIcon
    'notificationsWarningIcon.foreground': palette.yellow,

    // panel
    'panel.background': withAlpha(palette.chrome, 'ff'),
    'panel.border': withAlpha(palette.border, '99'),

    // panelSection
    'panelSection.dropBackground': withAlpha(palette.fg, '1a'),

    // panelTitle
    'panelTitle.activeBorder': palette.accent,
    'panelTitle.activeForeground': palette.fg,
    'panelTitle.inactiveForeground': withAlpha(palette.fg, '66'),

    // peekView
    'peekView.border': withAlpha(palette.black, '4d'),

    // peekViewEditor
    'peekViewEditor.background': palette.surface,
    'peekViewEditor.matchHighlightBackground': palette.accentDim,

    // peekViewEditorGutter
    'peekViewEditorGutter.background': palette.surface,

    // peekViewResult
    'peekViewResult.background': palette.surface,
    'peekViewResult.matchHighlightBackground': palette.accentDim,
    'peekViewResult.selectionBackground': withAlpha(palette.fgMuted, 'b3'),

    // peekViewTitle
    'peekViewTitle.background': palette.surface,

    // peekViewTitleDescription
    'peekViewTitleDescription.foreground': withAlpha(palette.fg, '99'),

    // pickerGroup
    'pickerGroup.border': palette.border,
    'pickerGroup.foreground': palette.accent,

    // progressBar
    'progressBar.background': palette.accent,

    // quickInput
    'quickInput.background': withAlpha(palette.chrome, 'ff'),
    'quickInput.foreground': palette.fgMuted,

    // quickInputList
    'quickInputList.focusBackground': withAlpha(palette.fg, '26'),
    'quickInputList.focusIconForeground': palette.fg,

    // quickInputTitle
    'quickInputTitle.background': palette.chrome,

    // sash
    'sash.hoverBorder': withAlpha(palette.accent, '80'),

    // scrollbar
    'scrollbar.shadow': withAlpha(palette.black, '4d'),

    // scrollbarSlider
    'scrollbarSlider.activeBackground': palette.accent,
    'scrollbarSlider.background': withAlpha(palette.fgSlider, '21'),
    'scrollbarSlider.hoverBackground': withAlpha(palette.fgSlider, '2e'),

    // selection
    'selection.background': palette.accent,

    // settings
    'settings.checkboxBackground': palette.chrome,
    'settings.checkboxForeground': palette.fg,
    'settings.dropdownBackground': palette.chrome,
    'settings.dropdownForeground': palette.fg,
    'settings.headerForeground': palette.fg,
    'settings.modifiedItemIndicator': palette.accent,
    'settings.numberInputBackground': palette.chrome,
    'settings.numberInputForeground': palette.fg,
    'settings.textInputBackground': palette.chrome,
    'settings.textInputForeground': palette.fg,

    // sideBar
    'sideBar.background': palette.chrome,
    'sideBar.border': withAlpha(palette.border, '99'),
    'sideBar.foreground': palette.fgMuted,

    // sideBarActivityBarTop
    'sideBarActivityBarTop.border': withAlpha(palette.border, '99'),

    // sideBarSectionHeader
    'sideBarSectionHeader.background': palette.chrome,
    'sideBarSectionHeader.border': withAlpha(palette.border, '99'),

    // sideBarStickyScroll
    'sideBarStickyScroll.border': withAlpha(palette.border, '99'),

    // sideBarTitle
    'sideBarTitle.foreground': palette.fg,

    // statusBar
    'statusBar.background': palette.chrome,
    'statusBar.border': withAlpha(palette.border, '99'),
    'statusBar.debuggingBackground': withAlpha(palette.accent, '1a'),
    'statusBar.debuggingForeground': palette.accent,
    // fgUi, not fgMuted: status bar text conveys live information and must
    // clear WCAG AA. The muted ramp is tuned for mood and can fall below it.
    'statusBar.foreground': palette.fgUi,
    'statusBar.noFolderBackground': palette.chrome,

    // statusBarItem
    'statusBarItem.hoverBackground': withAlpha(palette.fgSubtle, '33'),
    'statusBarItem.remoteBackground': withAlpha(palette.accent, '14'),
    'statusBarItem.remoteForeground': palette.accent,
    'statusBarItem.remoteHoverBackground': palette.accent,
    'statusBarItem.remoteHoverForeground': palette.onAccent,

    // tab
    'tab.activeBackground': palette.bg,
    'tab.activeBorder': palette.accent,
    'tab.activeBorderTop': withAlpha(palette.accent, '00'),
    'tab.activeForeground': palette.fgBright,
    'tab.activeModifiedBorder': withAlpha(palette.accent, '00'),
    'tab.border': palette.bg,
    'tab.inactiveBackground': palette.bg,
    'tab.inactiveForeground': palette.fgMuted,
    'tab.unfocusedActiveBorder': palette.accent,
    'tab.unfocusedActiveBorderTop': withAlpha(palette.fgSubtle, '00'),
    'tab.unfocusedActiveForeground': palette.fg,

    // terminal
    'terminal.ansiBlack': palette.black,
    'terminal.ansiBlue': palette.blue,
    'terminal.ansiBrightBlack': palette.fgSubtle,
    'terminal.ansiBrightBlue': palette.blue,
    'terminal.ansiBrightCyan': palette.cyan,
    'terminal.ansiBrightGreen': palette.green,
    'terminal.ansiBrightMagenta': palette.purple,
    'terminal.ansiBrightRed': palette.red,
    'terminal.ansiBrightWhite': palette.white,
    'terminal.ansiBrightYellow': palette.yellow,
    'terminal.ansiCyan': palette.cyan,
    'terminal.ansiGreen': palette.green,
    'terminal.ansiMagenta': palette.purple,
    'terminal.ansiRed': palette.red,
    'terminal.ansiWhite': palette.white,
    'terminal.ansiYellow': palette.yellow,

    // terminalCommandGuide
    'terminalCommandGuide.foreground': palette.guide,

    // terminalCursor
    'terminalCursor.background': palette.black,
    'terminalCursor.foreground': palette.yellow,

    // textLink
    'textLink.activeForeground': palette.fg,
    'textLink.foreground': palette.accent,

    // textPreformat
    'textPreformat.background': withAlpha(palette.surfaceAlt, '99'),
    'textPreformat.foreground': withAlpha(palette.fg, 'b3'),

    // titleBar
    'titleBar.activeBackground': palette.chrome,
    'titleBar.activeForeground': palette.fg,
    'titleBar.border': withAlpha(palette.border, '99'),
    'titleBar.inactiveBackground': palette.chrome,
    'titleBar.inactiveForeground': palette.fgMuted,

    // toolbar
    'toolbar.activeBackground': withAlpha(palette.accent, '26'),
    'toolbar.hoverBackground': withAlpha(palette.fg, '1a'),

    // tree
    'tree.indentGuidesStroke': palette.guide,

    // widget
    'widget.border': withAlpha(palette.hairline, '0f'),
    'widget.shadow': withAlpha(palette.black, '4d'),
  }
}
