/**
 * Monaco Editor統合管理フック
 *
 * 責任:
 * - Monaco Editorのマウント処理
 * - GLSL言語サポート設定
 * - InlineNudgebox統合
 * - キーボードショートカット登録
 */

import { useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor';
import { setupGLSLLanguage } from '../components/language/glsl';
import InlineNudgeboxManager from '../components/gui/InlineNudgebox';
import { FileTab } from '../types';

interface UseEditorIntegrationOptions {
  getActiveTab: () => FileTab | null;
  updateTab: (tabId: string, updates: Partial<FileTab>) => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onNewFile: () => void;
  onEditorReady?: (editorAPI: {
    getEditorValue: () => string;
    navigateToPosition: (line: number, column: number) => void;
    focusEditor: () => void;
  }) => void;
}

export const useEditorIntegration = (options: UseEditorIntegrationOptions) => {
  const {
    getActiveTab,
    updateTab,
    onOpenFile,
    onSaveFile,
    onNewFile,
    onEditorReady
  } = options;

  // エディタとマネージャーの参照
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const inlineNudgeboxManagerRef = useRef<InlineNudgeboxManager | null>(null);

  // エディタの値を取得
  const getEditorValue = useCallback(() => {
    const editor = editorRef.current;
    console.log('🔍 DEBUG: getEditorValue - editor exists:', !!editor);
    if (editor) {
      const value = editor.getValue();
      console.log('🔍 DEBUG: getEditorValue - value length:', value.length, 'preview:', value.substring(0, 50));
      return value;
    }
    console.log('🔍 DEBUG: getEditorValue - no editor, returning empty');
    return '';
  }, []);

  // エディタにフォーカス
  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  // 指定した行・列に移動
  const navigateToPosition = useCallback((line: number, column: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    // エディタの位置に移動
    const position = { lineNumber: line, column: column };
    editor.setPosition(position);
    editor.revealLineInCenter(line);
    editor.focus();

    console.log(`📍 Navigated to line ${line}, column ${column}`);
  }, []);

  // Monaco Editor beforeMount時の設定
  const handleBeforeMount = useCallback((monacoInstance: typeof monaco) => {
    setupGLSLLanguage(monacoInstance);
  }, []);

  // エディタマウント時の処理
  const handleEditorMount = useCallback((
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    console.log('🔧 DEBUG: handleEditorMount - setting editorRef');
    editorRef.current = editor;

    // キーボードショートカットを登録
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyO,
      onOpenFile
    );
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      onSaveFile
    );
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyN,
      onNewFile
    );

    // Inline Nudgebox (Float) を統合
    if (!inlineNudgeboxManagerRef.current) {
      console.log('🔧 Creating new InlineNudgeboxManager...');
      inlineNudgeboxManagerRef.current = new InlineNudgeboxManager(
        getActiveTab,
        updateTab
      );
      console.log('🔧 Integrating Nudgebox with Monaco Editor...');
      inlineNudgeboxManagerRef.current.integrate(editor);
      console.log('✅ InlineNudgebox integrated with Monaco Editor');
    } else {
      console.log('⚠️ InlineNudgeboxManager already exists, skipping integration');
    }

    // 初期モデルの設定
    const activeTab = getActiveTab();
    if (activeTab?.model) {
      editor.setModel(activeTab.model);

      // 保存されたビューステートがあれば復元
      if (activeTab.viewState) {
        editor.restoreViewState(activeTab.viewState);
      }
    }

    // エディタAPI を親コンポーネントに公開
    if (onEditorReady) {
      console.log('🔧 useEditorIntegration: Calling onEditorReady');
      onEditorReady({
        getEditorValue,
        navigateToPosition,
        focusEditor
      });
    }
  }, [getActiveTab, updateTab, onOpenFile, onSaveFile, onNewFile, onEditorReady, getEditorValue, navigateToPosition, focusEditor]);

  // アクティブタブ変更時にモデルを切り替え
  const switchToTab = useCallback((tab: FileTab | null) => {
    const editor = editorRef.current;
    if (!editor || !tab) return;

    try {
      // 現在のビューステートを保存
      const currentTab = getActiveTab();
      if (currentTab && currentTab.model) {
        try {
          const viewState = editor.saveViewState();
          if (viewState && currentTab.id !== tab.id) {
            updateTab(currentTab.id, { viewState });
          }
        } catch (error) {
          // ビューステート保存エラーは無視（Cancelledエラーなど）
          console.log('⚠️ View state save cancelled (normal behavior)');
        }
      }

      // 新しいタブのモデルを設定
      if (tab.model) {
        try {
          editor.setModel(tab.model);

          // ビューステートを復元
          if (tab.viewState) {
            editor.restoreViewState(tab.viewState);
          }

          editor.focus();
        } catch (error) {
          // モデル切り替えエラーは無視（Cancelledエラーなど）
          console.log('⚠️ Model switch cancelled (normal behavior)');
        }
      }
    } catch (error) {
      console.log('⚠️ Tab switch operation cancelled (normal behavior)');
    }
  }, [getActiveTab, updateTab]);

  // クリーンアップ
  const dispose = useCallback(() => {
    if (inlineNudgeboxManagerRef.current) {
      inlineNudgeboxManagerRef.current.dispose();
      inlineNudgeboxManagerRef.current = null;
      console.log('🧹 InlineNudgebox manager disposed');
    }
  }, []);

  // NudgeboxManagerの接続状態を取得
  const isNudgeboxConnected = useCallback(() => {
    return !!inlineNudgeboxManagerRef.current;
  }, []);

  return {
    // エディタ参照
    editorRef,

    // イベントハンドラー
    handleBeforeMount,
    handleEditorMount,

    // エディタ操作
    switchToTab,
    getEditorValue,
    focusEditor,
    navigateToPosition,

    // 状態取得
    isNudgeboxConnected,

    // クリーンアップ
    dispose
  };
};