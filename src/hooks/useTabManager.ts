import React from 'react';
import { FileTab } from '../types';
import { generateId } from '../utils/idUtils';
import { getLanguageFromFileName } from '../components/language';

export function useTabManager(monaco?: any) {
  // タブ管理
  const [tabs, setTabs] = React.useState<FileTab[]>([
    {
      id: generateId(),
      fileName: 'Untitled.glsl',
      filePath: null,
      content: '',
      language: 'glsl',
      isModified: false
    }
  ]);

  const [activeTabId, setActiveTabId] = React.useState<string>(tabs[0].id);

  // ドラッグアンドドロップ状態管理
  const [draggedTabId, setDraggedTabId] = React.useState<string | null>(null);

  // アクティブなタブを取得
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  // ウィンドウタイトル更新
  React.useEffect(() => {
    const title = `${activeTab.fileName}${activeTab.isModified ? ' *' : ''} - Ernst Editor`;
    document.title = title;
  }, [activeTab.fileName, activeTab.isModified]);

  // タブ操作関数
  const updateTab = (tabId: string, updates: Partial<FileTab>) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      )
    );
  };

  // モデル管理関数
  const createModel = React.useCallback((content: string, language: string, uri?: string): any => {
    if (!monaco) return null;

    const uriObj = uri ? monaco.Uri.parse(uri) : monaco.Uri.parse(`file:///model-${generateId()}.${language}`);
    return monaco.editor.createModel(content, language, uriObj);
  }, [monaco]);

  const disposeModel = React.useCallback((model: any) => {
    if (model && typeof model.dispose === 'function') {
      model.dispose();
    }
  }, []);

  // ビューステートを保存（Monaco Editor標準API使用）
  const saveViewState = (tabId: string, viewState: any) => {
    updateTab(tabId, { viewState });
  };

  // Monaco がロードされた時に既存タブのモデルを作成
  React.useEffect(() => {
    if (monaco) {
      setTabs(prevTabs =>
        prevTabs.map(tab => {
          if (!tab.model) {
            const model = createModel(tab.content, tab.language, tab.filePath || undefined);
            return { ...tab, model };
          }
          return tab;
        })
      );
    }
  }, [monaco, createModel]);

  // 新規ファイル作成
  const createNewFile = () => {
    const newTab: FileTab = {
      id: generateId(),
      fileName: 'Untitled.glsl',
      filePath: null,
      content: '',
      language: 'glsl',
      isModified: false
    };
    addTab(newTab);
  };

  const addTab = (newTab: FileTab) => {
    // 既に同じファイルが開かれているかチェック
    if (newTab.filePath) {
      const existingTab = tabs.find(tab => tab.filePath === newTab.filePath);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return;
      }
    }

    // モデルを作成してタブに追加
    const model = createModel(newTab.content, newTab.language, newTab.filePath || undefined);
    const tabWithModel = { ...newTab, model };
    setTabs(prevTabs => [...prevTabs, tabWithModel]);
    // 新しいタブをアクティブに設定
    setActiveTabId(tabWithModel.id);
  };

  const closeTab = (tabId: string) => {
    try {
      const tabToClose = tabs.find(tab => tab.id === tabId);
      const tabIndex = tabs.findIndex(tab => tab.id === tabId);

      if (!tabToClose) return;

      // モデルを破棄
      if (tabToClose.model) {
        disposeModel(tabToClose.model);
      }

      if (tabs.length === 1) {
        // 最後のタブの場合は新しいタブを作成
        const newTab: FileTab = {
          id: generateId(),
          fileName: 'Untitled.glsl',
          filePath: null,
          content: '',
          language: 'glsl',
          isModified: false
        };
        const model = createModel(newTab.content, newTab.language);
        const newTabWithModel = { ...newTab, model };
        setTabs([newTabWithModel]);
        setActiveTabId(newTabWithModel.id);
      } else {
        const newTabs = tabs.filter(tab => tab.id !== tabId);
        setTabs(newTabs);

        // アクティブタブを閉じた場合は隣のタブをアクティブに
        if (activeTabId === tabId) {
          const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
          setActiveTabId(newTabs[newActiveIndex].id);
        }
      }
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  };

  // ドラッグアンドドロップハンドラー
  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();

    if (draggedTabId && draggedTabId !== targetTabId) {
      setTabs(prevTabs => {
        const draggedIndex = prevTabs.findIndex(tab => tab.id === draggedTabId);
        const targetIndex = prevTabs.findIndex(tab => tab.id === targetTabId);

        if (draggedIndex === -1 || targetIndex === -1) return prevTabs;

        const newTabs = [...prevTabs];
        const [draggedTab] = newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, draggedTab);

        return newTabs;
      });
    }

    setDraggedTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      // タブのコンテンツとモデルの両方を更新
      updateTab(activeTabId, { content: value, isModified: true });

      // 現在のアクティブタブのモデルも更新（整合性のため）
      const currentTab = tabs.find(tab => tab.id === activeTabId);
      if (currentTab?.model && currentTab.model.getValue() !== value) {
        currentTab.model.setValue(value);
      }
    }
  };

  // ファイルパス変更時にタブ情報を更新（リネーム対応）
  const updateTabPath = (oldPath: string, newPath: string) => {
    const pathParts = newPath.split(/[/\\]/);
    const newFileName = pathParts[pathParts.length - 1];

    setTabs(prevTabs =>
      prevTabs.map(tab => {
        if (tab.filePath === oldPath) {
          return {
            ...tab,
            filePath: newPath,
            fileName: newFileName
          };
        }
        return tab;
      })
    );
  };

  // 指定されたファイルパスのタブを閉じる（削除対応）
  const closeTabByPath = (filePath: string) => {
    const tabToClose = tabs.find(tab => tab.filePath === filePath);
    if (tabToClose) {
      closeTab(tabToClose.id);
    }
  };

  return {
    tabs,
    activeTab,
    activeTabId,
    draggedTabId,
    setActiveTabId,
    updateTab,
    addTab,
    closeTab,
    createNewFile,
    saveViewState,
    createModel,
    disposeModel,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleEditorChange,
    updateTabPath,
    closeTabByPath
  };
}