import { VSCodeTheme, ResolvedTheme } from '../types/theme';
import { isHexColor, luminance, parseHex, withAlpha } from './colorUtils';
import { createMonacoTheme } from './monacoThemeUtils';

type VarResolver = (colors: Record<string, string>, resolved: Record<string, string>) => string;

// CSS 変数 → VS Code の色キー候補（先勝ち）。いずれも未定義なら fallback を使う
// fallback では先に解決済みの CSS 変数を参照できるため、並び順に意味がある
const pick = (keys: string[], fallback: VarResolver): VarResolver => (colors, resolved) => {
  const key = keys.find(k => colors[k] !== undefined);
  return key ? colors[key] : fallback(colors, resolved);
};
const ref = (cssVar: string): VarResolver => (_colors, resolved) => resolved[cssVar];
const literal = (value: string): VarResolver => () => value;
const alphaOf = (cssVar: string, alpha: number): VarResolver => (_colors, resolved) => withAlpha(resolved[cssVar], alpha);

const CSS_VAR_MAP: Array<[string, VarResolver]> = [
  ['--theme-ui-background', pick(['editor.background'], literal('#1e1e1e'))],
  ['--theme-ui-foreground', pick(['foreground', 'editor.foreground'], literal('#cccccc'))],
  ['--theme-ui-foreground-bright', pick(['list.activeSelectionForeground', 'editor.foreground'], ref('--theme-ui-foreground'))],
  ['--theme-ui-foreground-dark', pick(['descriptionForeground', 'tab.inactiveForeground'], alphaOf('--theme-ui-foreground', 0.6))],
  ['--theme-ui-border', pick(['panel.border', 'sideBar.border', 'editorGroup.border'], alphaOf('--theme-ui-foreground', 0.2))],
  ['--theme-ui-background-dark', pick(['editorGroup.border', 'sideBar.border', 'panel.border'], ref('--theme-ui-border'))],
  ['--theme-ui-background-bright', pick(['list.hoverBackground', 'input.background'], alphaOf('--theme-ui-foreground', 0.1))],
  ['--theme-ui-background-light', pick(['list.hoverBackground', 'input.background'], ref('--theme-ui-background-bright'))],
  ['--theme-ui-background-lighter', pick(['list.activeSelectionBackground'], ref('--theme-ui-background-light'))],
  ['--theme-ui-success', pick(['gitDecoration.addedResourceForeground', 'terminal.ansiGreen'], literal('#3aab5f'))],
  ['--theme-ui-warning', pick(['editorWarning.foreground', 'list.warningForeground'], literal('#ff6044'))],
  ['--theme-ui-error', pick(['errorForeground', 'editorError.foreground'], literal('#cf222e'))],
  ['--theme-ui-info', pick(['editorInfo.foreground'], literal('#609cdf'))],
  ['--theme-editor-background', ref('--theme-ui-background')],

  ['--theme-accent-color', pick(['button.background', 'textLink.foreground'], ref('--theme-ui-foreground'))],
  ['--theme-accent-hover', pick(['button.hoverBackground'], ref('--theme-accent-color'))],
  ['--theme-accent-color-alpha', alphaOf('--theme-accent-color', 0.2)],
  ['--theme-on-accent', pick(['button.foreground'], ref('--theme-ui-background'))],

  ['--theme-sidebar-background', pick(['sideBar.background'], ref('--theme-ui-background'))],
  ['--theme-sidebar-foreground', pick(['sideBar.foreground'], ref('--theme-ui-foreground'))],
  ['--theme-sidebar-foreground-alpha50', alphaOf('--theme-sidebar-foreground', 0.5)],
  ['--theme-sidebar-border', pick(['sideBar.border'], ref('--theme-ui-border'))],
  // CSS 側で表記ゆれが3種あるため全て設定する
  ['--theme-sidebar-hover', pick(['list.hoverBackground'], ref('--theme-ui-background-bright'))],
  ['--theme-sidebar-hoverBackground', ref('--theme-sidebar-hover')],
  ['--theme-sidebar-hover-background', ref('--theme-sidebar-hover')],
  ['--theme-sidebar-active-background', pick(['list.activeSelectionBackground'], ref('--theme-ui-background-lighter'))],

  ['--theme-input-background', pick(['input.background'], ref('--theme-ui-background-light'))],
  ['--theme-input-border', pick(['input.border', 'dropdown.border'], ref('--theme-ui-border'))],
  ['--theme-input-foreground', pick(['input.foreground'], ref('--theme-ui-foreground'))],
  ['--theme-input-placeholder', pick(['input.placeholderForeground'], ref('--theme-ui-foreground-dark'))],

  ['--theme-header-background', pick(['titleBar.activeBackground'], ref('--theme-ui-background'))],
  ['--theme-header-foreground', pick(['titleBar.activeForeground'], ref('--theme-ui-foreground'))],

  ['--theme-tabs-background', pick(['editorGroupHeader.tabsBackground'], ref('--theme-ui-background'))],
  ['--theme-tabs-foreground', pick(['tab.inactiveForeground'], ref('--theme-ui-foreground-dark'))],
  ['--theme-tabs-active-background', pick(['tab.activeBackground'], ref('--theme-ui-background'))],
  ['--theme-tabs-active-foreground', pick(['tab.activeForeground'], ref('--theme-ui-foreground'))],
  ['--theme-tabs-modified-foreground', ref('--theme-ui-foreground-bright')],
  ['--theme-tabs-active-modified-foreground', ref('--theme-ui-foreground-bright')],
  ['--theme-tabs-modified-dot', ref('--theme-ui-foreground-bright')],

  ['--theme-button-background', pick(['button.secondaryBackground', 'input.background'], ref('--theme-ui-background-light'))],
  ['--theme-button-border', pick(['button.border', 'input.border'], ref('--theme-ui-border'))],
  ['--theme-button-hover', pick(['button.secondaryHoverBackground', 'list.hoverBackground'], ref('--theme-ui-background-lighter'))],

  ['--theme-menu-background', pick(['menu.background', 'editorWidget.background', 'dropdown.background'], ref('--theme-ui-background'))],
  ['--theme-menu-foreground', pick(['menu.foreground'], ref('--theme-ui-foreground'))],
  ['--theme-menu-border', pick(['menu.border', 'editorWidget.border', 'widget.border'], ref('--theme-ui-border'))],
  ['--theme-menu-hover', pick(['menu.selectionBackground', 'list.hoverBackground'], ref('--theme-ui-background-bright'))],

  ['--theme-search-highlight', ref('--theme-accent-color')],
  ['--theme-search-highlightText', ref('--theme-on-accent')],
];

// 完全透明の色（Vitesse の focusBorder 等）は「未指定」として扱う
function usableColors(theme: VSCodeTheme): Record<string, string> {
  return Object.fromEntries(
    Object.entries(theme.colors ?? {}).filter(([, value]) => isHexColor(value) && parseHex(value)!.a > 0)
  );
}

function detectType(theme: VSCodeTheme, colors: Record<string, string>): ResolvedTheme['type'] {
  if (theme.type === 'light' || theme.type === 'hcLight') return 'light';
  if (theme.type === 'dark' || theme.type === 'hc') return 'dark';
  if (theme.base === 'vs') return 'light';
  if (theme.base === 'vs-dark' || theme.base === 'hc-black') return 'dark';
  const background = colors['editor.background'];
  return background && luminance(background) > 0.5 ? 'light' : 'dark';
}

export function resolveTheme(theme: VSCodeTheme): ResolvedTheme {
  const colors = usableColors(theme);
  const type = detectType(theme, colors);
  const cssVars: Record<string, string> = {};
  for (const [cssVar, resolve] of CSS_VAR_MAP) {
    cssVars[cssVar] = resolve(colors, cssVars);
  }
  return { name: theme.name, type, cssVars, monaco: createMonacoTheme(theme, type) };
}

export function applyThemeToDOM(theme: ResolvedTheme): void {
  const root = document.documentElement;
  for (const [cssVar, value] of Object.entries(theme.cssVars)) {
    root.style.setProperty(cssVar, value);
  }
  root.style.colorScheme = theme.type;
}

// settings.json で指定されたテーマを読み込む。失敗時は同梱の Vitesse Light Soft にフォールバック
export async function loadTheme(): Promise<VSCodeTheme> {
  const { electronClient } = require('../services/electronClient');
  const themeData: VSCodeTheme | null = await electronClient.loadTheme();
  if (themeData) return themeData;
  console.warn('Failed to load theme via IPC, using fallback');
  return getDefaultTheme();
}

export function getDefaultTheme(): VSCodeTheme {
  return require('../config/presets/themes/vitesse-light-soft.json');
}
