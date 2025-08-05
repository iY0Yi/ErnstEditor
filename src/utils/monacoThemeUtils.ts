import { Theme } from '../types/theme';

// Monaco Editorのテーマ形式に変換
export function createMonacoTheme(theme: Theme): any {
  return {
    base: 'vs-dark', // ベースとなるテーマ
    inherit: true,
    rules: [
      // コメント
      { token: 'comment', foreground: theme.syntax.comment },
      { token: 'comment.line', foreground: theme.syntax.comment },
      { token: 'comment.block', foreground: theme.syntax.comment },

      // キーワード
      { token: 'keyword', foreground: theme.syntax.keyword },
      { token: 'keyword.control', foreground: theme.syntax.keywordControl },
      { token: 'keyword.operator', foreground: theme.syntax.operator },
      { token: 'storage.type', foreground: theme.syntax.keywordType },
      { token: 'storage.modifier', foreground: theme.syntax.keywordStorage },

      // 文字列
      { token: 'string', foreground: theme.syntax.string },
      { token: 'string.quoted', foreground: theme.syntax.string },
      { token: 'string.escape', foreground: theme.syntax.stringEscape },

      // 数値・定数
      { token: 'number', foreground: theme.syntax.number },
      { token: 'constant', foreground: theme.syntax.constant },
      { token: 'constant.numeric', foreground: theme.syntax.number },
      { token: 'constant.language', foreground: theme.syntax.constant },

      // 変数・識別子
      { token: 'variable', foreground: theme.syntax.variable },
      { token: 'identifier', foreground: theme.syntax.variable },

      // 関数
      { token: 'entity.name.function', foreground: theme.syntax.function },
      { token: 'support.function', foreground: theme.syntax.keywordFunction },

      // 演算子・区切り文字
      { token: 'operator', foreground: theme.syntax.operator },
      { token: 'delimiter', foreground: theme.syntax.delimiter },
      { token: 'punctuation', foreground: theme.syntax.delimiter },

      // プリプロセッサ
      { token: 'meta.preprocessor', foreground: theme.syntax.preprocessor },

      // GLSL固有
      { token: 'glsl-keyword', foreground: theme.syntax.keyword },
      { token: 'glsl-type', foreground: theme.syntax.keywordType },
      { token: 'glsl-builtin', foreground: theme.syntax.keywordFunction },
    ],
    colors: {
      // エディタ背景色
      'editor.background': theme.editor.background,
      'editor.foreground': theme.editor.foreground,

      // 選択範囲
      'editor.selectionBackground': theme.editor.selectionBackground,
      'editor.selectionHighlightBackground': theme.editor.selectionHighlightBackground,

      // 行ハイライト
      'editor.lineHighlightBackground': theme.editor.lineHighlightBackground,

      // カーソル
      'editorCursor.foreground': theme.editor.cursorForeground,

      // 行番号
      'editorLineNumber.foreground': theme.editor.lineNumberForeground,
      'editorLineNumber.activeForeground': theme.editor.lineNumberActiveForeground,

      // 空白文字
      'editorWhitespace.foreground': theme.editor.whitespaceForeground,

      // 検索ハイライト
      'editor.findMatchBackground': theme.editor.findMatchBackground,
      'editor.findMatchHighlightBackground': theme.editor.findMatchHighlightBackground,

      // ガター（行番号エリア）
      'editorGutter.background': theme.editor.background,

      // スクロールバー（目立たない色に）
      'scrollbarSlider.background': theme.ui.backgroundBright,
      'scrollbarSlider.hoverBackground': theme.components.sidebar.border,
      'scrollbarSlider.activeBackground': theme.components.sidebar.border,
    }
  };
}

// Monaco Editorにテーマを適用
export function applyMonacoTheme(monaco: any, theme: Theme): void {
  if (!monaco) {
    console.warn('Monaco instance not available');
    return;
  }

  const themeName = `ernst-${theme.name.toLowerCase().replace(/\s+/g, '-')}`;

  try {
    // カスタムテーマを定義
    const monacoTheme = createMonacoTheme(theme);
    monaco.editor.defineTheme(themeName, monacoTheme);

    // テーマを適用
    monaco.editor.setTheme(themeName);

  } catch (error) {
    console.error('Failed to apply Monaco theme:', error);
  }
}