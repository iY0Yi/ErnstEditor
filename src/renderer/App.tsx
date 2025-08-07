import React from 'react';
import { useMonaco } from '@monaco-editor/react';
import SidebarPanel from '../components/SidebarPanel';
import Header from '../components/Header';
import TabManager from '../components/TabManager';
import EditorContainer from '../components/EditorContainer';
import WelcomeScreen from '../components/WelcomeScreen';
import { useTabManager } from '../hooks/useTabManager';
import { useFileOperations } from '../hooks/useFileOperations';
import { useTheme } from '../hooks/useTheme';
import { useBlenderConnection } from '../hooks/useBlenderConnection';
import { useCLIFileHandler } from '../hooks/useCLIFileHandler';
import { useSearchNavigation } from '../hooks/useSearchNavigation';
import { useProjectManager } from '../hooks/useProjectManager';

// CSSをWebpack経由でインポート（ホットリロード対応）
import '../styles/base/fonts.css';
import '../styles/components/inline-float-slider.css';
import '../styles/components/inline-nudgebox.css';
import '../styles/components/header.css';
import '../styles/components/welcome.css';
import '../styles/components/app-layout.css';
import '../styles/components/tab-manager.css';
import '../styles/components/sidebar-panel.css';
import '../styles/components/search-panel.css';
import '../styles/components/file-explorer.css';

const App: React.FC = () => {
  const monaco = useMonaco();

  // Monaco Editor関連のPromise例外を処理
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Monaco Editorの「Cancelled」エラーを無視
      if (event.reason &&
          (event.reason.message === 'Cancelled' ||
           event.reason.toString().includes('Cancelled'))) {
        console.log('⚠️ Monaco Editor operation cancelled (normal behavior)');
        event.preventDefault(); // エラー表示を抑制
        return;
      }
      // その他のエラーは通常通り処理
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

    // レンダラープロセスからBlenderサーバー起動状況を確認&強制起動
  React.useEffect(() => {
    // console.log('🔍 Renderer: Checking Blender server status...');

    // メインプロセスのサーバー起動を確実にするため、少し遅延させて強制実行
    setTimeout(async () => {
            try {
        // サーバー状態を確認（デバッグ時のみ）
        if (window.electronAPI && window.electronAPI.getBlenderConnectionStatus) {
          const status = await window.electronAPI.getBlenderConnectionStatus();
          // console.log('📊 Renderer: Current server status:', status);

          if (!status.isServerRunning) {
            // console.log('⚠️ Renderer: Server not running, forcing startup...');
          }
        }
      } catch (error) {
        console.error('❌ Renderer: Error checking server status:', error);
      }
    }, 3000);
  }, []);

    // 直接通信テスト用の関数（デバッグ用）
  const testBlenderCommunication = () => {
    // console.log('🧪 Testing direct Blender communication...');

    // 複数の値を連続送信してテスト
    const testValues = [0.1, 0.5, 1.0, 2.0, 0.0];
    testValues.forEach((value, index) => {
      setTimeout(() => {
        // console.log(`📤 Test ${index + 1}: Sending value ${value} to Blender`);
        if (window.electronAPI && (window.electronAPI as any).sendTestValueToBlender) {
          (window.electronAPI as any).sendTestValueToBlender(value);
        }
      }, index * 1000);
    });
  };

  // デバッグ用: ウィンドウオブジェクトに関数を追加
  React.useEffect(() => {
    (window as any).testBlenderCommunication = testBlenderCommunication;
    // console.log('🔧 Added testBlenderCommunication to window object');
    // console.log('💡 Use: window.testBlenderCommunication() in console to test');
  }, []);

  // テーマ管理フック
  const { theme, isLoading: themeLoading } = useTheme(monaco);

  // Blender接続状態管理フック
  const { connectionStatus } = useBlenderConnection();

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

  // エディタコンテナー用のコールバック関数
  const getActiveTab = React.useCallback(() => activeTab, [activeTab]);

  // プロジェクト管理フック
  const {
    projectName,
    refreshFileTreeCallback,
    setRefreshFileTreeCallback,
    handleProjectRootChange,
    handleFileRenamed,
    handleFileDeleted
  } = useProjectManager();

  // trackディレクトリのパスを管理
  const [trackDirectoryPath, setTrackDirectoryPath] = React.useState<string | null>(null);

  // EditorContainer API の状態管理
  const [editorAPI, setEditorAPI] = React.useState<{
    getEditorValue: () => string;
    navigateToPosition: (line: number, column: number) => void;
    focusEditor: () => void;
  } | null>(null);

  // setEditorAPIの実際の動作をデバッグ
  const handleEditorReady = React.useCallback((api: {
    getEditorValue: () => string;
    navigateToPosition: (line: number, column: number) => void;
    focusEditor: () => void;
  }) => {
    console.log('🔧 DEBUG: App.handleEditorReady called with API:', !!api);
    setEditorAPI(api);
    console.log('🔧 DEBUG: setEditorAPI called');
  }, []);

  // editorAPIの変化を監視
  React.useEffect(() => {
    console.log('🔍 DEBUG: editorAPI state changed:', !!editorAPI);
  }, [editorAPI]);

    // trackディレクトリ設定のためのハンドラー
  const handleTrackDirectoryChange = React.useCallback((trackPath: string | null) => {
            // console.log('📁 App: Setting track directory path:', trackPath);
    setTrackDirectoryPath(trackPath);
    if (trackPath) {
      handleProjectRootChange(trackPath);
    }
  }, [handleProjectRootChange]);

  // コマンドライン引数からのファイル開き処理フック（trackディレクトリ対応）
  useCLIFileHandler({
    addTab,
    setActiveTabId,
    onProjectRootChange: handleTrackDirectoryChange
  });

  // 検索ナビゲーション処理フック（EditorAPI を渡す）
  const { handleSearchResult } = useSearchNavigation({
    tabs,
    setActiveTabId,
    addTab,
    editorAPI
  });

  // ファイル操作フック（一時的に簡略化、後でEditorContainerとの連携を追加）
  const {
    handleOpenFile,
    handleSaveFile: originalHandleSaveFile,
    handleSaveFileAs,
    handleNewFile,
    handleFileSelect
  } = useFileOperations(
    activeTab,
    null, // editorRefを一時的にnullに
    addTab,
    updateTab,
    setActiveTabId,
    createNewFile,
    refreshFileTreeCallback || undefined
  );



  // シンプルな保存機能（Nudgeboxと同じ方式）
  const handleSaveFile = React.useCallback(async () => {
    console.log('🔍 DEBUG: handleSaveFile called (simple version)');
    
    const currentTab = getActiveTab();
    console.log('🔍 DEBUG: currentTab:', currentTab?.fileName, 'filePath:', currentTab?.filePath);
    
    if (!currentTab || !currentTab.filePath) {
      console.log('⚠️ handleSaveFile: No active file, fallback to Save As');
      handleSaveFileAs();
      return;
    }

    try {
      // Monaco Editorから直接内容を取得（Nudgeboxと同じ方式）
      const monacoEditor = document.querySelector('.monaco-editor');
      if (!monacoEditor) {
        console.error('❌ Monaco Editor DOM not found');
        handleSaveFileAs();
        return;
      }

      // Monaco Editor インスタンスを取得
      const editorInstance = (window as any).monaco?.editor?.getEditors?.()?.[0];
      if (!editorInstance) {
        console.error('❌ Monaco Editor instance not found');
        handleSaveFileAs();
        return;
      }

      const content = editorInstance.getValue();
      console.log('🔍 DEBUG: content length:', content.length, 'content preview:', content.substring(0, 100));

      // ファイルに保存
      if (window.electronAPI) {
        const result = await window.electronAPI.saveFile(currentTab.filePath, content);
        if (result.success) {
          // タブの修正状態を更新
          updateTab(currentTab.id, { isModified: false, content });
          console.log('✅ File saved successfully:', currentTab.fileName);
        } else {
          console.error('❌ Failed to save file:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error saving file:', error);
      handleSaveFileAs();
    }
  }, [getActiveTab, handleSaveFileAs, updateTab]);

  // テーマローディング中の表示（シンプルに背景色のみ）
  if (themeLoading) {
    return <div className="app-loading" />;
  }

  return (
    <div className="app-container">
      {/* ヘッダー（メニューバー + プロジェクト情報 + 接続ステータス + ウィンドウコントロール） */}
      <Header
        activeTab={activeTab || { id: '', fileName: '', filePath: null, content: '', language: 'glsl', isModified: false }}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveFileAs={handleSaveFileAs}
        connectionStatus={connectionStatus}
        projectName={projectName}
      />

      {/* メインコンテンツ（サイドバー + エディタ） */}
      <div className="app-main-content">
                {/* サイドバー（ファイルエクスプローラー + 検索パネル） */}
        <div className="app-sidebar">
        <SidebarPanel
            onFileSelect={handleFileSelect}
            activeFilePath={activeTab?.filePath || null}
            onSearchResult={handleSearchResult}
            onProjectRootChange={handleProjectRootChange}
            onRefreshFileTreeCallback={setRefreshFileTreeCallback}
            onFileRenamed={(oldPath: string, newPath: string) => handleFileRenamed(oldPath, newPath, updateTabPath)}
            onFileDeleted={(filePath: string) => handleFileDeleted(filePath, closeTabByPath)}
            externalProjectRoot={trackDirectoryPath}
          />
        </div>

        {/* エディタエリア または ウェルカムスクリーン */}
        <div className="app-editor-area">
          {tabs.length > 0 ? (
            <>
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

              {/* エディタコンテナ */}
              <EditorContainer
                theme={theme}
                activeTab={activeTab}
                getActiveTab={getActiveTab}
                updateTab={updateTab}
                onOpenFile={handleOpenFile}
                onSaveFile={handleSaveFile}
                onNewFile={handleNewFile}
                onEditorReady={handleEditorReady}
              />
            </>
          ) : (
            /* ウェルカムスクリーン */
            <WelcomeScreen />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;