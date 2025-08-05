import React from 'react';
import { Theme } from '../types/theme';
import { loadTheme, applyThemeToDOM, getDefaultTheme } from '../utils/themeUtils';
import { applyMonacoTheme } from '../utils/monacoThemeUtils';

export function useTheme(monaco?: any) {
  const [theme, setTheme] = React.useState<Theme | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // テーマを初期化
  React.useEffect(() => {
    const initializeTheme = async () => {
      setIsLoading(true);
      try {
        const loadedTheme = await loadTheme('ernst-dark');
        setTheme(loadedTheme);
        applyThemeToDOM(loadedTheme);

        // Monaco Editorのテーマも適用
        if (monaco && loadedTheme) {
          applyMonacoTheme(monaco, loadedTheme);
        }
      } catch (error) {
        console.error('Failed to initialize theme:', error);
        const fallbackTheme = getDefaultTheme();
        setTheme(fallbackTheme);
        applyThemeToDOM(fallbackTheme);

        // Monaco Editorのテーマも適用（フォールバック）
        if (monaco) {
          applyMonacoTheme(monaco, fallbackTheme);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, [monaco]); // monacoが変更されたときも再実行

  // monacoインスタンスが利用可能になったときにテーマを再適用
  React.useEffect(() => {
    if (monaco && theme) {
      applyMonacoTheme(monaco, theme);
    }
  }, [monaco, theme]);

  // テーマを変更する関数
  const changeTheme = React.useCallback(async (themeName: string) => {
    setIsLoading(true);
    try {
      const newTheme = await loadTheme(themeName);
      setTheme(newTheme);
      applyThemeToDOM(newTheme);

      // Monaco Editorのテーマも変更
      if (monaco && newTheme) {
        applyMonacoTheme(monaco, newTheme);
      }
    } catch (error) {
      console.error('Failed to change theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, [monaco]);

  // CSS変数の値を取得するヘルパー関数
  const getThemeVar = React.useCallback((varName: string): string => {
    return getComputedStyle(document.documentElement).getPropertyValue(varName);
  }, []);

  return {
    theme,
    isLoading,
    changeTheme,
    getThemeVar
  };
}