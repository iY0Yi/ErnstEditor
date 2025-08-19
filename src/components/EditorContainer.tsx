/**
 * EditorContainer - Monaco Editor統合コンテナ
 *
 * 責任:
 * - Monaco Editorの表示とオプション設定
 * - タブ切り替えの管理
 * - エディタ統合フックとの連携
 */

import React, { useEffect, useRef, useContext } from 'react';
import Editor from '@monaco-editor/react';
import { FileTab } from '../types';
import { AppContext } from '../context/AppContext';

interface EditorContainerProps {
  theme: any;
  activeTab: FileTab | null;
  getActiveTab: () => FileTab | null;
  updateTab: (tabId: string, updates: Partial<FileTab>) => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onNewFile: () => void;
  onEditorChange: (value: string | undefined) => void; // 追加
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
  onEditorChange,
  onEditorReady
}) => {

  const appContext = useContext(AppContext);

  // 簡単なマウント処理のみ
  const handleBeforeMount = React.useCallback((monaco: any) => {
    // GLSL言語設定（同期的に実行）
    const { setupGLSLLanguage } = require('../components/language/glsl');
    setupGLSLLanguage(monaco);
    console.log('✏EditorContainer: GLSL language support enabled');
  }, []);

    const editorRef = useRef<any>(null);

    const handleEditorMount = React.useCallback((
    editor: any,
    monaco: any
  ) => {
    // Monaco Editorインスタンスをグローバルに保存（setActiveBufferで使用）
    (window as any).monacoEditorInstance = editor;
    editorRef.current = editor;
    try {
      // AppContext をエディタインスタンスへブリッジ（ショートカットから利用）
      (editor as any)._appContext = appContext;
    } catch {}

    // セッション保存済みのフォントサイズがあれば適用（遅延なく即適用）
    const applyFontSize = (size?: number) => {
      if (typeof size === 'number') {
        editor.updateOptions({ fontSize: size });
      }
    };
    try {
      const lastSession = (window as any).__ERNST_LAST_SESSION__;
      applyFontSize(lastSession?.editorFontSize);
    } catch {}

    // 保存ショートカット（既存: Context 経由）。未保存ファイルは Save As へフォールバック
    editor.addAction({
      id: 'save-file-app-context',
      label: 'Save File (Context)',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        try {
          // App側の onSaveFile を呼ぶ。未保存は Save As へフォールバック
          onSaveFile();
        } catch {}
      }
    });

    // InlineNudgeboxManager統合（重要！）
    const { InlineNudgeboxManager } = require('./gui/InlineNudgebox/NudgeboxManager');
    const nudgeboxManager = new InlineNudgeboxManager(updateTab);
    nudgeboxManager.integrate(editor);

    // エディタAPI公開
    if (onEditorReady) {
      onEditorReady({
        getEditorValue: () => editor.getValue() || '',
        navigateToPosition: (line: number, column: number) => {
          editor.setPosition({ lineNumber: line, column });
          editor.revealLineInCenter(line);
        },
        focusEditor: () => editor.focus()
      });
    }

    // 初回マウント時、アクティブタブが未設定なら最前タブをフォーカス
    try {
      const bmActive = (window as any)?.__ERNST_BUFFER_ACTIVE_ID__;
      if (!bmActive) {
        const tabs = (window as any)?.__ERNST_BUFFER_TABS__;
        const firstId = Array.isArray(tabs) && tabs[0]?.id;
        if (firstId) {
          const setActive = (window as any)?.__ERNST_SET_ACTIVE_BUFFER__;
          setActive?.(firstId);
        }
      }
    } catch {}

  }, [onEditorReady, updateTab, onSaveFile]);

  const dispose = React.useCallback(() => {
    // 追加のクリーンアップは現状不要
  }, []);

  // セッション復元完了後にフォントサイズ適用イベントを受け取る
  React.useEffect(() => {
    const handler = (e: any) => {
      try {
        const size = e?.detail;
        if (typeof size !== 'number') return;
        // グローバル適用: 次回モデル切替時にも反映されるよう保持
        (window as any).__ERNST_LAST_SESSION__ = {
          ...(window as any).__ERNST_LAST_SESSION__,
          editorFontSize: size
        };
        const editor = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
        editor?.updateOptions?.({ fontSize: size });
      } catch {}
    };
    window.addEventListener('ERNST_APPLY_FONT_SIZE', handler as EventListener);
    return () => window.removeEventListener('ERNST_APPLY_FONT_SIZE', handler as EventListener);
  }, []);

  // 外部からのフォーカス要求
  React.useEffect(() => {
    const focusHandler = () => {
      try {
        const editor = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
        editor?.focus?.();
      } catch {}
    };
    window.addEventListener('ERNST_FOCUS_EDITOR', focusHandler as EventListener);
    return () => window.removeEventListener('ERNST_FOCUS_EDITOR', focusHandler as EventListener);
  }, []);

  // BufferManager.setActiveBufferが既にモデル切り替えを行っているため、
  // ここでの重複処理は不要

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  // ウィンドウリサイズで強制レイアウト（ミニマップ追従の安定化）
  useEffect(() => {
    const onResize = () => {
      try {
        const editor = (window as any).monacoEditorInstance || null;
        editor?.layout?.();
      } catch {}
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);



  return (
    <div className="editor-container">
      <Editor
        height="100%"
        theme={theme ? `ernst-${theme.name.toLowerCase().replace(/\s+/g, '-')}` : "vs-dark"}
        beforeMount={handleBeforeMount}
        onMount={handleEditorMount}
        onChange={onEditorChange}
        options={{
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