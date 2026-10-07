import React from 'react';
import type * as monacoEditor from 'monaco-editor';
import { ResolvedTheme } from '../types/theme';
import { loadTheme, applyThemeToDOM, getDefaultTheme, resolveTheme } from '../utils/themeUtils';
import { applyMonacoTheme } from '../utils/monacoThemeUtils';

export function useTheme(monaco?: typeof monacoEditor | null) {
  const [theme, setTheme] = React.useState<ResolvedTheme | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initializeTheme = async () => {
      let resolved: ResolvedTheme;
      try {
        resolved = resolveTheme(await loadTheme());
      } catch (error) {
        console.error('Failed to initialize theme:', error);
        resolved = resolveTheme(getDefaultTheme());
      }
      applyThemeToDOM(resolved);
      setTheme(resolved);
      setIsLoading(false);
    };

    initializeTheme();
  }, []);

  // monaco インスタンスが利用可能になった時点でテーマを適用
  React.useEffect(() => {
    if (monaco && theme) {
      applyMonacoTheme(monaco, theme);
    }
  }, [monaco, theme]);

  return { theme, isLoading };
}
