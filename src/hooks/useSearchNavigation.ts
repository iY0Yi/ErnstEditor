import { useCallback } from 'react';
import { FileTab } from '../types';

interface UseSearchNavigationProps {
  tabs: FileTab[];
  setActiveBuffer: (id: string) => Promise<boolean>;
  addTabAndActivate: (tab: FileTab) => Promise<string>;
  editorAPI?: {
    navigateToPosition: (line: number, column: number) => void;
  } | null;
}

export const useSearchNavigation = ({ tabs, setActiveBuffer, addTabAndActivate, editorAPI }: UseSearchNavigationProps) => {
  const handleSearchResult = useCallback(async (filePath: string, line: number, column: number) => {
    try {
      // ファイルが既にタブで開かれているかチェック
      const existingTab = tabs.find(tab => tab.filePath === filePath);

      if (existingTab) {
        // 既存のタブをアクティブにする（setActiveBufferを使用）
        await setActiveBuffer(existingTab.id);

        // EditorContainer API を使用して指定位置に移動
        if (editorAPI?.navigateToPosition) {
          // 次フレームで実行（固定遅延を避ける）
          requestAnimationFrame(() => editorAPI.navigateToPosition(line, column));
        } else {
          console.log('⚠️ Search navigation: EditorAPI not available');
        }
            } else {
        // ファイル内容を読み込んで新しいタブで開く
        const { electronClient } = require('../services/electronClient');
        const content = await electronClient.readFile(filePath);
        if (content === null) return;

        const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
        const newTab: FileTab = {
          id: `search-${Date.now()}-${Math.random()}`,
          fileName,
          filePath,
          content,
          language: 'glsl', // デフォルト
          isModified: false
        };

        const tabId = await addTabAndActivate(newTab);

        if (tabId && editorAPI?.navigateToPosition) {
          requestAnimationFrame(() => editorAPI.navigateToPosition(line, column));
        } else if (!editorAPI?.navigateToPosition) {
          console.log('⚠️ New file search navigation: EditorAPI not available');
        }
      }
    } catch (error) {
      console.error('Error navigating to search result:', error);
    }
  }, [tabs, setActiveBuffer, addTabAndActivate, editorAPI]);

  return {
    handleSearchResult
  };
};