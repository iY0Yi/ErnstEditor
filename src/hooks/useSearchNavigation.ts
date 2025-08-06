import { useCallback } from 'react';
import { FileTab } from '../types';
import { getLanguageFromFileName } from '../components/language';
import { generateId } from '../utils/idUtils';

interface UseSearchNavigationProps {
  tabs: FileTab[];
  setActiveTabId: (id: string) => void;
  addTab: (tab: FileTab) => void;
  editorAPI?: {
    navigateToPosition: (line: number, column: number) => void;
  } | null;
}

export const useSearchNavigation = ({ tabs, setActiveTabId, addTab, editorAPI }: UseSearchNavigationProps) => {
  const handleSearchResult = useCallback(async (filePath: string, line: number, column: number) => {
    try {
      // ファイルが既にタブで開かれているかチェック
      const existingTab = tabs.find(tab => tab.filePath === filePath);

      if (existingTab) {
        // 既存のタブをアクティブにする
        setActiveTabId(existingTab.id);

        // EditorContainer API を使用して指定位置に移動
        if (editorAPI?.navigateToPosition) {
          // タブ切り替え後に少し待ってからナビゲーション実行
          setTimeout(() => {
            editorAPI.navigateToPosition(line, column);
          }, 100);
        } else {
          console.log('⚠️ Search navigation: EditorAPI not available');
        }
      } else {
        // ファイルを読み込んで新しいタブで開く
        if (window.electronAPI) {
          const content = await window.electronAPI.readFile(filePath);
          if (content !== null) {
            // パスからファイル名を抽出（Windows/Unixパス対応）
            const fileName = filePath.replace(/\\/g, '/').split('/').pop() || 'Unknown';
            const language = getLanguageFromFileName(fileName);

            const newTab: FileTab = {
              id: generateId(),
              fileName: fileName,
              filePath: filePath,
              content: content,
              language: language,
              isModified: false
            };

            addTab(newTab);
            setActiveTabId(newTab.id);

            // 新しいタブが開かれた後にナビゲーション実行
            if (editorAPI?.navigateToPosition) {
              // タブ作成・切り替え後に少し待ってからナビゲーション実行
              setTimeout(() => {
                editorAPI.navigateToPosition(line, column);
              }, 200);
            } else {
              console.log('⚠️ New file search navigation: EditorAPI not available');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error navigating to search result:', error);
    }
  }, [tabs, setActiveTabId, addTab, editorAPI]);

  return {
    handleSearchResult
  };
};