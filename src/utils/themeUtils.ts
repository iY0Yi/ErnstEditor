import { Theme } from '../types/theme';

// テーマをCSS変数として適用する
export function applyThemeToDOM(theme: Theme): void {
  const root = document.documentElement;

  // UI色
  root.style.setProperty('--theme-ui-background', theme.ui.background);
  root.style.setProperty('--theme-ui-background-bright', theme.ui.backgroundBright);
  root.style.setProperty('--theme-ui-background-dark', theme.ui.backgroundDark);
  root.style.setProperty('--theme-ui-foreground', theme.ui.foreground);
  root.style.setProperty('--theme-ui-foreground-bright', theme.ui.foregroundBright);
  root.style.setProperty('--theme-ui-foreground-dark', theme.ui.foregroundDark);
  root.style.setProperty('--theme-ui-success', theme.ui.success);
  root.style.setProperty('--theme-ui-warning', theme.ui.warning);
  root.style.setProperty('--theme-ui-error', theme.ui.error);
  root.style.setProperty('--theme-ui-info', theme.ui.info);
  root.style.setProperty('--theme-ui-accent', theme.ui.accent);
  root.style.setProperty('--theme-ui-border', theme.ui.border);

  // 透明度付き色
  root.style.setProperty('--theme-opacity-foreground-alpha10', theme.opacity.foregroundAlpha10);
  root.style.setProperty('--theme-opacity-foreground-alpha15', theme.opacity.foregroundAlpha15);
  root.style.setProperty('--theme-opacity-foreground-alpha20', theme.opacity.foregroundAlpha20);
  root.style.setProperty('--theme-opacity-foreground-dark-alpha20', theme.opacity.foregroundDarkAlpha20);
  root.style.setProperty('--theme-opacity-foreground-dark-alpha30', theme.opacity.foregroundDarkAlpha30);
  root.style.setProperty('--theme-opacity-success-alpha20', theme.opacity.successAlpha20);
  root.style.setProperty('--theme-opacity-warning-alpha20', theme.opacity.warningAlpha20);
  root.style.setProperty('--theme-opacity-error-alpha20', theme.opacity.errorAlpha20);

  // コンポーネント色
  root.style.setProperty('--theme-sidebar-background', theme.components.sidebar.background);
  root.style.setProperty('--theme-sidebar-foreground', theme.components.sidebar.foreground);
  root.style.setProperty('--theme-sidebar-border', theme.components.sidebar.border);
  root.style.setProperty('--theme-sidebar-hover', theme.components.sidebar.hover);
  root.style.setProperty('--theme-sidebar-active-background', theme.components.sidebar.activeBackground);
  root.style.setProperty('--theme-sidebar-active-foreground', theme.components.sidebar.activeForeground);

  // サイドバータブとホバー効果
  root.style.setProperty('--theme-sidebar-activeTab', theme.components.sidebar.border);
  root.style.setProperty('--theme-sidebar-hoverBackground', theme.ui.backgroundBright);
  root.style.setProperty('--theme-sidebar-activeForeground', theme.ui.foregroundBright);

  // 検索関連
  root.style.setProperty('--theme-search-highlight', theme.ui.accent);
  root.style.setProperty('--theme-search-highlightText', theme.ui.background);

  // 入力フィールド
  root.style.setProperty('--theme-input-background', theme.ui.backgroundBright);
  root.style.setProperty('--theme-input-border', theme.components.sidebar.border);
  root.style.setProperty('--theme-input-foreground', theme.ui.foreground);
  root.style.setProperty('--theme-input-placeholder', theme.ui.foregroundDark);

  // スクロールバー
  root.style.setProperty('--theme-scrollbar-thumb', theme.components.sidebar.border);

  root.style.setProperty('--theme-header-background', theme.components.header.background);
  root.style.setProperty('--theme-header-foreground', theme.components.header.foreground);
  root.style.setProperty('--theme-header-border', theme.components.header.border);

  root.style.setProperty('--theme-tabs-background', theme.components.tabs.background);
  root.style.setProperty('--theme-tabs-foreground', theme.components.tabs.foreground);
  root.style.setProperty('--theme-tabs-active-background', theme.components.tabs.activeBackground);
  root.style.setProperty('--theme-tabs-active-foreground', theme.components.tabs.activeForeground);
  root.style.setProperty('--theme-tabs-border', theme.components.tabs.border);



  // エディター色
  root.style.setProperty('--theme-editor-background', theme.editor.background);
  root.style.setProperty('--theme-editor-foreground', theme.editor.foreground);
  root.style.setProperty('--theme-editor-selection-background', theme.editor.selectionBackground);
  root.style.setProperty('--theme-editor-line-highlight-background', theme.editor.lineHighlightBackground);
  root.style.setProperty('--theme-editor-cursor-foreground', theme.editor.cursorForeground);
  root.style.setProperty('--theme-editor-line-number-foreground', theme.editor.lineNumberForeground);
  root.style.setProperty('--theme-editor-line-number-active-foreground', theme.editor.lineNumberActiveForeground);
  root.style.setProperty('--theme-editor-whitespace-foreground', theme.editor.whitespaceForeground);
  root.style.setProperty('--theme-editor-find-match-background', theme.editor.findMatchBackground);
  root.style.setProperty('--theme-editor-find-match-highlight-background', theme.editor.findMatchHighlightBackground);
  root.style.setProperty('--theme-editor-selection-highlight-background', theme.editor.selectionHighlightBackground);
}

// テーマファイルを読み込む
export async function loadTheme(themeName: string = 'ernst-dark'): Promise<Theme> {
  try {
    // ElectronのIPCを使用してテーマを読み込む
    if (window.electronAPI) {
      const themeData = await window.electronAPI.loadTheme(themeName);
      if (themeData) {
        return themeData;
      }
    }

    // IPCが利用できない場合やテーマが見つからない場合はフォールバック
    console.warn('Failed to load theme via IPC, using fallback');
    return getDefaultTheme();
  } catch (error) {
    console.error('Failed to load theme, using fallback:', error);
    // フォールバック用のデフォルトテーマ
    return getDefaultTheme();
  }
}

// デフォルトテーマ（フォールバック）
export function getDefaultTheme(): Theme {
  return {
    name: "Ernst Dark",
    type: "dark",
    ui: {
      background: "#181818",
      backgroundBright: "#202020",
      backgroundDark: "#000000",
      foreground: "#BBBBBB",
      foregroundBright: "#EEEEEE",
      foregroundDark: "#555555",
      success: "#3aab5f",
      warning: "#ff6044",
      error: "#cf222e",
      info: "#609cdf",
      accent: "#555555",
      border: "#555555"
    },
    opacity: {
      foregroundAlpha10: "rgba(187, 187, 187, 0.1)",
      foregroundAlpha15: "rgba(187, 187, 187, 0.15)",
      foregroundAlpha20: "rgba(187, 187, 187, 0.2)",
      foregroundDarkAlpha20: "rgba(102, 102, 102, 0.2)",
      foregroundDarkAlpha30: "rgba(102, 102, 102, 0.3)",
      successAlpha20: "rgba(58, 171, 95, 0.2)",
      warningAlpha20: "rgba(255, 96, 68, 0.2)",
      errorAlpha20: "rgba(207, 34, 46, 0.2)"
    },
    syntax: {
      default: "BBBBBB",
      comment: "666666",
      keyword: "3aab5f",
      keywordControl: "3aab5f",
      keywordType: "3aab5f",
      keywordFunction: "609cdf",
      keywordStorage: "3aab5f",
      string: "032f62",
      stringEscape: "c739ff",
      number: "c739ff",
      constant: "c739ff",
      variable: "BBBBBB",
      function: "609cdf",
      operator: "ff6044",
      delimiter: "555555",
      preprocessor: "888888"
    },
    editor: {
      background: "#181818",
      foreground: "#BBBBBB",
      selectionBackground: "#BBBBBB44",
      lineHighlightBackground: "#202020",
      cursorForeground: "#BBBBBB",
      lineNumberForeground: "#666666",
      lineNumberActiveForeground: "#BBBBBB",
      whitespaceForeground: "#555555",
      findMatchBackground: "#BBBBBB66",
      findMatchHighlightBackground: "#BBBBBB44",
      selectionHighlightBackground: "#BBBBBB44"
    },
    components: {
      sidebar: {
        background: "#181818",
        foreground: "#BBBBBB",
        border: "#555555",
        hover: "#202020",
        activeBackground: "#262626",
        activeForeground: "#EEEEEE"
      },
      header: {
        background: "#181818",
        foreground: "#BBBBBB",
        border: "#555555"
      },
      tabs: {
        background: "#181818",
        foreground: "#666666",
        activeBackground: "#262626",
        activeForeground: "#BBBBBB",
        border: "#555555"
      }
    }
  };
}