import type { Layout } from '@/webview/protocol'

// Settings a workbench renders inert, and why. Only entries proven against its stylesheet.
export const INERT_IN: Record<string, { layout: Layout; why: string }> = {
  tabIndicator: {
    layout: 'modern',
    why: 'The modern workbench hides both indicator bars and fills the selected tab instead, so this has nothing to change. It still applies if you switch back.',
  },
}

// The manifest orders settings but never groups them, and fifteen in one column is a wall.
export const SECTIONS: { title: string; blurb: string; keys: string[] }[] = [
  {
    title: 'Accent',
    blurb: 'One colour, used everywhere something is active or selected.',
    keys: ['accent', 'customAccent', 'accentedStatusBar'],
  },
  {
    title: 'Editor',
    blurb: 'What the text and the space around it look like.',
    keys: ['selectionStyle', 'cursorStyle', 'italics', 'currentLine'],
  },
  {
    title: 'Workbench',
    blurb: 'The chrome around the editor: tabs, borders and depth.',
    keys: ['tabIndicator', 'tabBar', 'borders', 'shadows'],
  },
  {
    title: 'Icons',
    blurb: 'The file and folder set that ships alongside the themes.',
    keys: ['accentFolders', 'hideExplorerArrows', 'syncIconTheme'],
  },
  {
    title: 'Customizer',
    blurb: 'This panel.',
    keys: ['customizerLocation'],
  },
]
