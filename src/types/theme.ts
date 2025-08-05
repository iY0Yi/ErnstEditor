// テーマ関連の型定義
export interface Theme {
  name: string;
  type: 'dark' | 'light';
  ui: {
    background: string;
    backgroundBright: string;
    backgroundDark: string;
    foreground: string;
    foregroundBright: string;
    foregroundDark: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    accent: string;
    border: string;
  };
  opacity: {
    foregroundAlpha10: string;
    foregroundAlpha15: string;
    foregroundAlpha20: string;
    foregroundDarkAlpha20: string;
    foregroundDarkAlpha30: string;
    successAlpha20: string;
    warningAlpha20: string;
    errorAlpha20: string;
  };
  syntax: {
    default: string;
    comment: string;
    keyword: string;
    keywordControl: string;
    keywordType: string;
    keywordFunction: string;
    keywordStorage: string;
    string: string;
    stringEscape: string;
    number: string;
    constant: string;
    variable: string;
    function: string;
    operator: string;
    delimiter: string;
    preprocessor: string;
  };
  editor: {
    background: string;
    foreground: string;
    selectionBackground: string;
    lineHighlightBackground: string;
    cursorForeground: string;
    lineNumberForeground: string;
    lineNumberActiveForeground: string;
    whitespaceForeground: string;
    findMatchBackground: string;
    findMatchHighlightBackground: string;
    selectionHighlightBackground: string;
  };
  components: {
    sidebar: {
      background: string;
      foreground: string;
      border: string;
      hover: string;
      activeBackground: string;
      activeForeground: string;
    };
    header: {
      background: string;
      foreground: string;
      border: string;
    };
    tabs: {
      background: string;
      foreground: string;
      activeBackground: string;
      activeForeground: string;
      border: string;
    };
  };
}