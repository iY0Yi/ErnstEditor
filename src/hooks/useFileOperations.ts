import React from 'react';
import { getLanguageFromFileName } from '../components/language';
import { FileTab } from '../types';
import { createFileTabFromAPIResult, createFileTab } from '../utils/tabFactory';

export function useFileOperations(
  activeTab: FileTab,
  editorRef: React.RefObject<any>,
  addTab: (tab: FileTab) => void,
  updateTab: (tabId: string, updates: Partial<FileTab>) => void,
  setActiveTabId: (tabId: string) => void,
  createNewFile: () => void,
  refreshFileTree?: () => void
) {
  const handleOpenFile = async (): Promise<void> => {
    if (window.electronAPI) {
      const result = await window.electronAPI.openFile();
      if (result) {
        const newTab = createFileTabFromAPIResult(result);
        addTab(newTab);
      }
    }
  };

    const handleSaveFile = async (): Promise<void> => {
    if (activeTab.filePath && editorRef.current) {
      const content = editorRef.current.getValue();
      const result = await window.electronAPI.saveFile(activeTab.filePath, content);
      if (result.success) {
        updateTab(activeTab.id, { isModified: false, content });
        // ファイルツリーを更新
        if (refreshFileTree) {
          refreshFileTree();
        }
      }
    } else {
      handleSaveFileAs();
    }
  };

  const handleSaveFileAs = async (): Promise<void> => {
    if (editorRef.current) {
      const content = editorRef.current.getValue();
      const result = await window.electronAPI.saveFileAs(content);
      if (result.success && result.fileName && result.filePath) {
        const language = getLanguageFromFileName(result.fileName);
        updateTab(activeTab.id, {
          fileName: result.fileName,
          filePath: result.filePath,
          content: content,
          language: language,
          isModified: false
        });
        // ファイルツリーを更新
        if (refreshFileTree) {
          refreshFileTree();
        }
      }
    }
  };

  const handleNewFile = (): void => {
    createNewFile();
  };

  const handleFileSelect = (filePath: string, fileName: string, content: string) => {
    const newTab = createFileTab(filePath, content, fileName);
    addTab(newTab);
  };

  return {
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleNewFile,
    handleFileSelect
  };
}