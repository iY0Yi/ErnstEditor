import type * as monaco from 'monaco-editor';
import { VSCodeTheme, VSCodeTokenColor, ResolvedTheme } from '../types/theme';
import { blend, isHexColor, parseHex } from './colorUtils';

export const MONACO_THEME_ID = 'ernst-active';

// Monarch トークン → TextMate スコープ候補（先頭から順に照合し、最初に一致したものを採用）
// どの候補にも一致しない場合はルールを出さず、Monaco のトークン前方一致で親ルールに委ねる
const TOKEN_SCOPE_MAP: Array<[string, string[]]> = [
  ['comment', ['comment']],
  ['preprocessor', ['meta.preprocessor', 'keyword.control.directive', 'keyword.control']],
  ['string', ['string']],
  ['string.escape', ['constant.character.escape', 'string']],
  ['string.invalid', ['invalid', 'string']],
  ['number', ['constant.numeric']],
  ['delimiter', ['punctuation']],
  ['keyword', ['keyword']],
  ['keyword.control', ['keyword.control']],
  ['keyword.type', ['storage.type', 'support.type']],
  ['keyword.struct', ['storage.type.struct', 'storage.type']],
  ['keyword.storage', ['storage.modifier', 'storage']],
  ['keyword.function', ['support.function', 'entity.name.function']],
  ['user.function', ['entity.name.function']],
  ['struct.name', ['entity.name.type', 'entity.name.class']],
  ['variable.predefined', ['variable.language', 'support.variable']],
  ['constant.language.boolean', ['constant.language.boolean', 'constant.language']],
  ['operator', ['keyword.operator']],
  ['identifier', ['variable']],
  // Monaco 組み込み言語（JS/JSON/HTML 等）用
  ['type', ['entity.name.type', 'support.type']],
  ['tag', ['entity.name.tag']],
  ['attribute.name', ['entity.other.attribute-name']],
  ['attribute.value', ['string']],
  ['regexp', ['string.regexp']],
  ['string.key.json', ['support.type.property-name', 'string']],
];

type StyleKey = 'foreground' | 'fontStyle';

function selectorScore(selector: string, scope: string): number {
  if (selector === scope || scope.startsWith(`${selector}.`)) {
    return selector.split('.').length;
  }
  return -1;
}

// VS Code と同様にセグメント数の多いセレクタを優先し、同点なら後勝ち。子孫セレクタ（空白区切り）は対象外
function findStyle(tokenColors: VSCodeTokenColor[], scope: string, key: StyleKey): string | undefined {
  let best: string | undefined;
  let bestScore = -1;
  for (const entry of tokenColors) {
    const value = entry.settings[key];
    if (value === undefined || !entry.scope) continue;
    const selectors = Array.isArray(entry.scope) ? entry.scope : entry.scope.split(',');
    for (const raw of selectors) {
      const selector = raw.trim();
      if (!selector || selector.includes(' ')) continue;
      const score = selectorScore(selector, scope);
      if (score >= bestScore && score > 0) {
        best = value;
        bestScore = score;
      }
    }
  }
  return best;
}

// Monaco のトークン色は # なしの不透明 6 桁のみ扱えるため、アルファ付きは背景に合成する
function toMonacoColor(color: string, background: string): string | undefined {
  if (!parseHex(color)) return undefined;
  return blend(color, background).slice(1, 7);
}

export function createMonacoTheme(theme: VSCodeTheme, type: ResolvedTheme['type']): monaco.editor.IStandaloneThemeData {
  const colors = Object.fromEntries(
    Object.entries(theme.colors ?? {}).filter(([, value]) => isHexColor(value))
  );
  const background = colors['editor.background'] ?? (type === 'light' ? '#ffffff' : '#1e1e1e');
  const tokenColors = theme.tokenColors ?? [];

  const rules: monaco.editor.ITokenThemeRule[] = [];
  const defaultForeground = colors['editor.foreground'] ?? colors['foreground'];
  if (defaultForeground) {
    rules.push({ token: '', foreground: toMonacoColor(defaultForeground, background) });
  }

  for (const [token, scopes] of TOKEN_SCOPE_MAP) {
    const scope = scopes.find(s => findStyle(tokenColors, s, 'foreground') !== undefined);
    if (!scope) continue;
    const foreground = toMonacoColor(findStyle(tokenColors, scope, 'foreground')!, background);
    const fontStyle = findStyle(tokenColors, scope, 'fontStyle');
    rules.push({ token, foreground, ...(fontStyle !== undefined ? { fontStyle } : {}) });
  }

  return {
    base: type === 'light' ? 'vs' : 'vs-dark',
    inherit: true,
    rules,
    colors,
  };
}

export function applyMonacoTheme(monacoInstance: typeof monaco, theme: ResolvedTheme): void {
  monacoInstance.editor.defineTheme(MONACO_THEME_ID, theme.monaco);
  monacoInstance.editor.setTheme(MONACO_THEME_ID);
}
