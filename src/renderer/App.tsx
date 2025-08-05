import React from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { setupGLSLLanguage } from '../components/language/glsl';
import SidebarPanel from '../components/SidebarPanel';
import Header from '../components/Header';
import TabManager from '../components/TabManager';
import { useTabManager } from '../hooks/useTabManager';
import { useFileOperations } from '../hooks/useFileOperations';
import { useTheme } from '../hooks/useTheme';
import { getLanguageFromFileName } from '../components/language';
import { generateId } from '../utils/idUtils';
import { FileTab } from '../types';

const App: React.FC = () => {
  const monaco = useMonaco();
  const editorRef = React.useRef<any>(null);

  // テーマ管理フック
  const { theme, isLoading: themeLoading } = useTheme(monaco);

  // タブ管理フック（Monaco インスタンスを渡す）
  const {
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
  } = useTabManager(monaco);

  // ファイルツリーリフレッシュ用
  const [refreshFileTreeCallback, setRefreshFileTreeCallback] = React.useState<(() => void) | null>(null);

  // ファイル操作とタブ同期のコールバック
  const handleFileRenamed = React.useCallback((oldPath: string, newPath: string) => {
    updateTabPath(oldPath, newPath);
  }, [updateTabPath]);

  const handleFileDeleted = React.useCallback((filePath: string) => {
    closeTabByPath(filePath);
  }, [closeTabByPath]);

  // ファイル操作フック
  const {
    handleOpenFile,
    handleSaveFile,
    handleSaveFileAs,
    handleNewFile,
    handleFileSelect
  } = useFileOperations(
    activeTab,
    editorRef,
    addTab,
    updateTab,
    setActiveTabId,
    createNewFile,
    refreshFileTreeCallback || undefined
  );

  // 検索結果ナビゲーション処理
  const handleSearchResult = React.useCallback(async (filePath: string, line: number, column: number) => {
    try {
      // ファイルが既にタブで開かれているかチェック
      const existingTab = tabs.find(tab => tab.filePath === filePath);

      if (existingTab) {
        // 既存のタブをアクティブにする
        setActiveTabId(existingTab.id);

        // エディタにフォーカスを移動（少し遅延）
        setTimeout(() => {
          if (editorRef.current) {
            const editor = editorRef.current;

            // 指定行・列に移動
            editor.setPosition({ lineNumber: line, column: column });

            // 行をハイライト表示するために選択
            editor.setSelection({
              startLineNumber: line,
              startColumn: 1,
              endLineNumber: line,
              endColumn: editor.getModel()?.getLineMaxColumn(line) || column
            });

            // ビューを中央に移動
            editor.revealLineInCenter(line);

            // エディタにフォーカス
            editor.focus();
          }
        }, 100);
      } else {
        // ファイルを読み込んで新しいタブで開く
        if (window.electronAPI) {
          const content = await window.electronAPI.readFile(filePath);
          if (content !== null) {
            const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown';
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

            // エディタの準備を待ってからジャンプ
            setTimeout(() => {
              if (editorRef.current && monaco) {
                const editor = editorRef.current;
                const model = editor.getModel();

                if (model) {
                  // 言語設定を明示的に適用（シンタックスハイライト対応）
                  monaco.editor.setModelLanguage(model, language);

                  // レイアウトを更新してハイライトを確実に適用
                  editor.layout();

                  // 指定行・列に移動
                  editor.setPosition({ lineNumber: line, column: column });

                  // 行をハイライト表示
                  editor.setSelection({
                    startLineNumber: line,
                    startColumn: 1,
                    endLineNumber: line,
                    endColumn: model.getLineMaxColumn(line)
                  });

                  // ビューを中央に移動
                  editor.revealLineInCenter(line);

                  // エディタにフォーカス
                  editor.focus();
                }
              }
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('Error navigating to search result:', error);
    }
  }, [tabs, setActiveTabId, addTab]);

  // Monaco Editor初期化時にGLSL言語を設定
  React.useEffect(() => {
    if (monaco) {
      setupGLSLLanguage(monaco);
    }
  }, [monaco]);

  // Monaco Editor beforeMount時の設定
  const handleBeforeMount = (monaco: any) => {
    setupGLSLLanguage(monaco);
  };

      // エディタマウント時の処理（Multi-model 対応）
  const handleEditorMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor;

    // キーボードショートカットを登録
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyO, handleOpenFile);
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, handleSaveFile);
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyN, handleNewFile);

    // 初期モデルの設定
    if (activeTab?.model) {
      editor.setModel(activeTab.model);

      // 保存されたビューステートがあれば復元
      if (activeTab.viewState) {
        editor.restoreViewState(activeTab.viewState);
      }
    }
  };

  // アクティブタブ変更時にモデルを切り替え、ビューステートを復元
  React.useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const editor = editorRef.current;
    const currentActiveTab = tabs.find(tab => tab.id === activeTabId);

    if (!currentActiveTab || !currentActiveTab.model) return;

    const currentModel = editor.getModel();

    // 前のモデルのビューステートを保存
    if (currentModel && currentModel !== currentActiveTab.model) {
      const oldTab = tabs.find(tab => tab.model === currentModel);
      if (oldTab) {
        const viewState = editor.saveViewState();
        saveViewState(oldTab.id, viewState);
      }
    }

    // 新しいモデルに切り替え
    if (currentModel !== currentActiveTab.model) {
      editor.setModel(currentActiveTab.model);

      // ビューステートの復元
      if (currentActiveTab.viewState) {
        editor.restoreViewState(currentActiveTab.viewState);
      }

      // シンタックスハイライトを強制的に更新
      const applyHighlighting = () => {
        if (monaco && currentActiveTab.model && editorRef.current) {
          // 言語を明示的に設定
          monaco.editor.setModelLanguage(currentActiveTab.model, currentActiveTab.language);
          // エディタのレイアウトを更新
          editorRef.current.layout();
        }
      };

      // 即座に実行
      applyHighlighting();

      // 少し遅延して再実行（確実性のため）
      setTimeout(applyHighlighting, 100);
    }
  }, [activeTabId, monaco]);

  // ウィンドウリサイズ時にエディタのレイアウトを再計算
  React.useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        const editor = editorRef.current;

        // Monaco Editor公式推奨：automaticLayoutオプションがtrueの場合でも
        // 手動でlayout()を呼ぶことでより確実にレイアウトが更新される
        editor.layout();

        // ミニマップの位置を確実に更新するため、少し遅延して再実行
        setTimeout(() => {
          editor.layout();
        }, 50);
      }
    };

    // ResizeObserverでエディタコンテナの変更を監視
    let resizeObserver: ResizeObserver | null = null;

    // エディタがマウントされてからResizeObserverを設定
    const setupResizeObserver = () => {
      // Monaco Editorのコンテナを探す
      const editorContainers = document.querySelectorAll('[class*="monaco-editor"]');
      const parentContainer = document.querySelector('[style*="flex: 1"]'); // エディタの親コンテナ

      if (editorContainers.length > 0 || parentContainer) {
        resizeObserver = new ResizeObserver((entries) => {
          handleResize();
        });

        // エディタコンテナとその親コンテナを監視
        if (parentContainer) resizeObserver.observe(parentContainer as HTMLElement);
        editorContainers.forEach(container => resizeObserver!.observe(container as HTMLElement));
      }
    };

    // 少し遅延してからResizeObserverを設定（エディタのマウント後）
    const timer = setTimeout(setupResizeObserver, 100);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(timer);
    };
  }, []);

  // テーマローディング中の表示
  if (themeLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#181818',
        color: '#BBBBBB',
        fontSize: '14px'
      }}>
        Loading Ernst Editor...
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* ヘッダー（メニューバー + ウィンドウコントロール） */}
      <Header
        activeTab={activeTab}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveFileAs={handleSaveFileAs}
      />

      {/* メインコンテンツ（サイドバー + エディタ） */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* サイドバー（ファイルエクスプローラー + 検索パネル） */}
        <div style={{ width: '250px', minWidth: '200px', height: '100%', overflow: 'hidden' }}>
          <SidebarPanel
            onFileSelect={handleFileSelect}
            activeFilePath={activeTab.filePath}
            onSearchResult={handleSearchResult}
            onProjectRootChange={(root) => {
              // プロジェクトルート変更時の処理
            }}
            onRefreshFileTreeCallback={setRefreshFileTreeCallback}
            onFileRenamed={handleFileRenamed}
            onFileDeleted={handleFileDeleted}
          />
        </div>

        {/* エディタエリア */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* タブバー（エディタに付随） */}
          <TabManager
            tabs={tabs}
            activeTabId={activeTabId}
            draggedTabId={draggedTabId}
            onTabSelect={setActiveTabId}
            onTabClose={closeTab}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />

          {/* エディタ（Multi-model 対応） */}
          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              theme={theme ? `ernst-${theme.name.toLowerCase().replace(/\s+/g, '-')}` : "vs-dark"}
              beforeMount={handleBeforeMount}
              onMount={handleEditorMount}
                            options={{
                fontSize: 14,
                automaticLayout: true, // 自動レイアウト（公式推奨）
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
        </div>
      </div>
    </div>
  );
};

export default App;