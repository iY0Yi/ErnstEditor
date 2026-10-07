import type * as monaco from 'monaco-editor';

// VS Code カラーテーマ JSON の形式（本アプリで参照するフィールドのみ）
export interface VSCodeTokenColor {
  scope?: string | string[];
  settings: {
    foreground?: string;
    fontStyle?: string;
  };
}

export interface VSCodeTheme {
  name: string;
  type?: 'dark' | 'light' | 'hc' | 'hcLight';
  base?: string;
  colors?: Record<string, string>;
  tokenColors?: VSCodeTokenColor[];
}

export interface ResolvedTheme {
  name: string;
  type: 'dark' | 'light';
  cssVars: Record<string, string>;
  monaco: monaco.editor.IStandaloneThemeData;
}
