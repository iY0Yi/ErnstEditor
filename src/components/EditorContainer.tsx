/**
 * EditorContainer - Monaco Editor統合コンテナ
 *
 * 責任:
 * - Monaco Editorの表示とオプション設定
 * - タブ切り替えの管理
 * - エディタ統合フックとの連携
 */

import React, { useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorIntegration } from '../hooks/useEditorIntegration';
import { FileTab } from '../types';

interface EditorContainerProps {
  theme: any;
  activeTab: FileTab | null;
  getActiveTab: () => FileTab | null;
  updateTab: (tabId: string, updates: Partial<FileTab>) => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onNewFile: () => void;
  // エディタ機能を外部に公開するためのコールバック
  onEditorReady?: (editorAPI: {
    getEditorValue: () => string;
    navigateToPosition: (line: number, column: number) => void;
    focusEditor: () => void;
  }) => void;
}

const EditorContainer: React.FC<EditorContainerProps> = ({
  theme,
  activeTab,
  getActiveTab,
  updateTab,
  onOpenFile,
  onSaveFile,
  onNewFile,
  onEditorReady
}) => {
  const {
    handleBeforeMount,
    handleEditorMount,
    switchToTab,
    getEditorValue,
    navigateToPosition,
    focusEditor,
    dispose
  } = useEditorIntegration({
    getActiveTab,
    updateTab,
    onOpenFile,
    onSaveFile,
    onNewFile,
    onEditorReady
  });

  // アクティブタブ変更時にエディタを切り替え
  useEffect(() => {
    switchToTab(activeTab);
  }, [activeTab, switchToTab]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);



  return (
    <div className="editor-container">
      <Editor
        height="100%"
        theme={theme ? `ernst-${theme.name.toLowerCase().replace(/\s+/g, '-')}` : "vs-dark"}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          automaticLayout: true, // 自動レイアウト（公式推奨）
          mouseWheelZoom: true, // Ctrl+スクロールでフォントサイズ変更を有効化
          minimap: {
            enabled: true,
            side: 'right',
            showSlider: 'always',
            scale: 1,
            maxColumn: 120
          },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fixedOverflowWidgets: true, // ウィジェットの位置を固定
          overviewRulerLanes: 3, // 概要ルーラーの設定
          hideCursorInOverviewRuler: false,
          scrollbar: {
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            vertical: 'visible',
            horizontal: 'visible',
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          }
        }}
      />
    </div>
  );
};

export default EditorContainer;