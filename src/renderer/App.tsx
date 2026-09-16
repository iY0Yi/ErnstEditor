import React from 'react';
import { useMonaco } from '@monaco-editor/react';
import SidebarPanel from '../components/SidebarPanel';
import Header from '../components/Header';
import TabManager from '../components/TabManager';
import EditorContainer from '../components/EditorContainer';
import WelcomeScreen from '../components/WelcomeScreen';


import { useTheme } from '../hooks/useTheme';
import { getLanguageFromFileName } from '../components/language';
import { useBlenderConnection } from '../hooks/useBlenderConnection';
import { useCLIFileHandler } from '../hooks/useCLIFileHandler';
import { useSearchNavigation } from '../hooks/useSearchNavigation';
import { useProjectManager } from '../hooks/useProjectManager';
import { useSessionManager } from '../hooks/useSessionManager';
import { useBufferManager } from '../hooks';
import { AppContext } from '../context/AppContext';
import { FileTab } from '../types';

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
  // サイドバー幅（ドラッグで可変）
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(() => {
    const restored = (window as any).__ERNST_UI_STATE__?.sidebarWidth;
    if (typeof restored === 'number' && Number.isFinite(restored)) {
      return Math.min(Math.max(restored, 180), 600);
    }
    return 250;
  });
  const resizingRef = React.useRef<boolean>(false);
  const startXRef = React.useRef<number>(0);
  const startWidthRef = React.useRef<number>(sidebarWidth);
  const [isSidebarVisible, setIsSidebarVisible] = React.useState<boolean>(true);

  const handleResizerMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    resizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - startXRef.current;
      const next = Math.min(Math.max(startWidthRef.current + delta, 180), Math.floor(window.innerWidth * 0.7));
      setSidebarWidth(next);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      // ドラッグ終了後にエディタを確実にレイアウト
      try {
        (window as any).monacoEditorInstance?.layout?.();
      } catch {}
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  // 幅の永続化（セッション情報へ反映）
  React.useEffect(() => {
    try {
      (window as any).__ERNST_UI_STATE__ = {
        ...(window as any).__ERNST_UI_STATE__,
        sidebarWidth,
        isSidebarVisible
      };
    } catch {}
  }, [sidebarWidth, isSidebarVisible]);

  // セッション復元時のサイドバー幅適用
  React.useEffect(() => {
    const handler = (e: any) => {
      const width = e?.detail;
      if (typeof width === 'number' && Number.isFinite(width)) {
        setSidebarWidth(Math.min(Math.max(width, 180), Math.floor(window.innerWidth * 0.7)));
        try { (window as any).monacoEditorInstance?.layout?.(); } catch {}
      }
    };
    window.addEventListener('ERNST_APPLY_SIDEBAR_WIDTH', handler as EventListener);
    return () => window.removeEventListener('ERNST_APPLY_SIDEBAR_WIDTH', handler as EventListener);
  }, []);

  // メインからのアクション受信（依存変数が定義された後に配置）

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
    // 必要時のみ手動で呼ぶ（タイマーは使わない）
  }, []);

    // 直接通信テスト用の関数（デバッグ用）
  const testBlenderCommunication = () => {
    // console.log('🧪 Testing direct Blender communication...');

    // 複数の値を連続送信してテスト
    const testValues = [0.1, 0.5, 1.0, 2.0, 0.0];
    // デバッグ時のみ呼び出して使う
  };

  // デバッグ用: ウィンドウオブジェクトに関数を追加
  React.useEffect(() => {
    (window as any).testBlenderCommunication = testBlenderCommunication;
    // console.log('🔧 Added testBlenderCommunication to window object');
    // console.log('💡 Use: window.testBlenderCommunication() in console to test');
  }, []);

  // レンダラー準備完了を通知
  React.useEffect(() => {
    if (monaco) {
      const { electronClient } = require('../services/electronClient');
      electronClient.notifyRendererReady?.();
    }
  }, [monaco]);

  // テーマ管理フック
  const { theme, isLoading: themeLoading } = useTheme(monaco);

  // Blender接続状態管理フック
  const { connectionStatus } = useBlenderConnection();

  // タブ管理フック（Monaco インスタンスを渡す）
  // 中央集中型バッファマネージャ（saveSessionは後で設定）
  const bufferManager = useBufferManager({
    initialTabs: [],
    onTabsChange: (tabs: FileTab[]) => {
      // タブ変更時の処理（必要に応じて）
    },
    monaco: monaco // Monaco インスタンスを直接渡す
    // saveSessionは useSessionManager 後に設定
  });

  // レガシー互換性のための分解
  const {
    tabs,
    activeTabId,
    getActiveTab,
    setActiveBuffer,
    addTab,
    addTabAndActivate,
    closeTab,
    updateTab,
    saveActiveTab,
    handleEditorChange,
    // 統合された機能
    draggedTabId,
    createNewFile,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    // ファイル操作
    saveActiveTabAs,
    // パス管理統合機能
    updateTabPath,
    closeTabByPath
  } = bufferManager;

  const activeTab = getActiveTab();

  // （後方へ移動）

  // デバッグ/外部操作用に一部関数を公開
  React.useEffect(() => {
    (window as any).__ERNST_SET_ACTIVE_BUFFER__ = setActiveBuffer;
    (window as any).__ERNST_BUFFER_TABS__ = tabs;
    (window as any).__ERNST_BUFFER_ACTIVE_ID__ = activeTabId;
  }, [setActiveBuffer, tabs, activeTabId]);

  // デバッグログ削減: activeTabのログは停止



  // getActiveTabは bufferManager から取得済み

  // NudgeboxManagerが最新のアクティブタブにアクセスできるようにグローバル参照を設定
  React.useEffect(() => {
    // Deprecated: __ERNST_APP_INSTANCE__ は互換のため一時残し
    (window as any).__ERNST_APP_INSTANCE__ = {
      getActiveTab: () => activeTab,
      saveActiveTab: saveActiveTab
    };
    (window as any).__ERNST_APP_CONTEXT__ = {
      getActiveTab,
      saveActiveTab
    };
  }, [activeTab, saveActiveTab]);

  // プロジェクト管理フック（パス管理機能はBufferManagerに統合済み）
  const {
    projectName,
    handleProjectRootChange,
    setProjectNameDirect
  } = useProjectManager();

  // trackディレクトリのパスを管理
  const [trackDirectoryPath, setTrackDirectoryPath] = React.useState<string | null>(null);

  // 統一された起動処理の状態管理
  const [sessionRestoreCompleted, setSessionRestoreCompleted] = React.useState(false);
  const [pendingFileToOpen, setPendingFileToOpen] = React.useState<{filePath: string, content: string, fileName: string} | null>(null);

  // セッション管理フック（統合BufferManager使用）
  const { saveSession, loadSession, sessionExists, isLoading: sessionLoading, lastSaved } = useSessionManager({
    tabs,
    activeTabId,
    trackPath: trackDirectoryPath,
    projectName,
    addTabAndActivate,
    addTab,
    hasPendingFile: !!pendingFileToOpen
  });

  // saveSession を BufferManager に設定
  React.useEffect(() => {
    if (saveSession) {
      // BufferManagerの期待型は Promise<void> なのでラップ
      bufferManager.setSaveSession(async () => { await saveSession(); });
    }
  }, [saveSession, bufferManager.setSaveSession]);

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
    setEditorAPI(api);
  }, []);

  // editorAPIの変化を監視
  React.useEffect(() => {}, [editorAPI]);

  // trackディレクトリ設定のハンドラー
  const handleTrackDirectoryChange = React.useCallback((trackPath: string | null) => {
    setTrackDirectoryPath(trackPath);
    if (trackPath) {
      handleProjectRootChange(trackPath);
      try { (window as any).__ERNST_PROJECT_ROOT__ = trackPath; } catch {}
    }
  }, [handleProjectRootChange]);

  // CLIファイル処理（統一版）
  useCLIFileHandler({
    onProjectRootChange: handleTrackDirectoryChange,
    onProjectNameChange: setProjectNameDirect,
    onPendingFile: setPendingFileToOpen
  });

  // Step 5: セッション復元（trackディレクトリが設定された時）
  React.useEffect(() => {
    if (trackDirectoryPath && !sessionRestoreCompleted) {
      (async () => {
        try {
          const exists = await sessionExists();
          if (exists) {
            const success = await loadSession();
            // ログは簡素化
          }
        } catch (error) {
          console.error('❌ Session restoration error:', error);
        } finally {
          setSessionRestoreCompleted(true);
        }
      })();
    }
  }, [trackDirectoryPath, sessionRestoreCompleted, sessionExists, loadSession]);

  // CLIファイル処理（統合BufferManager使用）
  const handleCLIFileActivation = React.useCallback(async (fileToOpen: {filePath: string, content: string, fileName: string}) => {
    const newTab: FileTab = {
      id: `cli-${Date.now()}-${Math.random()}`,
      fileName: fileToOpen.fileName,
      filePath: fileToOpen.filePath,
      content: fileToOpen.content,
      language: getLanguageFromFileName(fileToOpen.fileName),
      isModified: false
    };

    await addTabAndActivate(newTab);
  }, [addTabAndActivate]);

    // Step 6: ファイルパスがある場合の追加ファイル開き
  React.useEffect(() => {
    if (sessionRestoreCompleted && pendingFileToOpen && monaco) {
      (async () => {
        await handleCLIFileActivation(pendingFileToOpen);
        setPendingFileToOpen(null);
      })();
    }
  }, [sessionRestoreCompleted, pendingFileToOpen, handleCLIFileActivation, monaco]);

  // 検索ナビゲーション処理フック（統合されたBufferManager使用）
  const { handleSearchResult } = useSearchNavigation({
    tabs,
    setActiveBuffer,
    addTabAndActivate,
    editorAPI
  });

  // ファイル操作（統合されたBufferManager使用）
  const handleOpenFile = React.useCallback(async (): Promise<void> => {
    const { electronClient } = require('../services/electronClient');
    const result = await electronClient.openFile();
    if (!result) return;

    const newTab: FileTab = {
      id: `dialog-${Date.now()}-${Math.random()}`,
      fileName: result.fileName,
      filePath: result.filePath,
      content: result.content,
      language: getLanguageFromFileName(result.fileName),
      isModified: false
    };

    await addTabAndActivate(newTab);
  }, [addTabAndActivate]);

  const handleFileSelect = React.useCallback(async (filePath: string, fileName: string, content: string) => {
    const newTab: FileTab = {
      id: `fileexplorer-${Date.now()}-${Math.random()}`,
      fileName,
      filePath,
      content,
      language: getLanguageFromFileName(fileName),
      isModified: false
    };

    await addTabAndActivate(newTab);
    console.log('✅ File opened from FileExplorer:', fileName);
  }, [addTabAndActivate]);

  // ヘッダー下の全域クリックでフォルダを開く（初回起動時）
  const handleOpenFolderOverlayClick = React.useCallback(async () => {
    try {
      const { electronClient } = require('../services/electronClient');
      const result = await electronClient.openFolder();
      if (result && result.rootPath) {
        handleTrackDirectoryChange(result.rootPath);
      }
    } catch (e) {
      console.error('Open folder overlay error:', e);
    }
  }, [handleTrackDirectoryChange]);



  // 保存機能（BufferManager内蔵を使用）
  // ツリーの更新はメインプロセスが保存後に送る explorer:refresh に任せる
  const handleSaveFile = React.useCallback(async () => {
    const success = await saveActiveTab();
    if (!success) {
      await saveActiveTabAs();
    }
  }, [saveActiveTab, saveActiveTabAs]);

  // 未保存の変更があるときはウィンドウを閉じる/リロードする前に止める（確認ダイアログはメイン側で表示）
  React.useEffect(() => {
    const hasUnsavedChanges = tabs.some(t => t.isModified && (t.filePath || t.content));
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = false;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [tabs]);

  const handleNewFile = React.useCallback(() => {
    createNewFile();
  }, [createNewFile]);

  // メインからのアクション受信（全依存が定義済みの最後に配置）
  React.useEffect(() => {
    const { electronClient } = require('../services/electronClient');
    const unsubscribe = electronClient.onAppAction?.(async (action: { type: string; payload?: any }) => {
      switch (action?.type) {
        case 'file:new':
          handleNewFile();
          break;
        case 'file:open':
          await handleOpenFile();
          break;
        case 'file:save-as':
          await saveActiveTabAs();
          break;
        case 'tab:close': {
          const current = getActiveTab();
          if (current) {
            closeTab(current.id);
          }
          break;
        }
        case 'tab:next': {
          if (tabs.length > 0 && activeTabId) {
            const idx = tabs.findIndex(t => t.id === activeTabId);
            const next = tabs[(idx + 1) % tabs.length];
            setActiveBuffer(next.id);
          }
          break;
        }
        case 'tab:prev': {
          if (tabs.length > 0 && activeTabId) {
            const idx = tabs.findIndex(t => t.id === activeTabId);
            const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
            setActiveBuffer(prev.id);
          }
          break;
        }
        case 'view:toggle-sidebar': {
          setIsSidebarVisible(v => {
            const next = !v;
            try { (window as any).monacoEditorInstance?.layout?.(); } catch {}
            return next;
          });
          break;
        }
        case 'explorer:refresh': {
          window.dispatchEvent(new Event('ERNST_REFRESH_FILE_TREE'));
          break;
        }
        default:
          break;
      }
    });
    return () => {
      try { electronClient.removeAppActionListener?.(); } catch {}
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [tabs, activeTabId, setActiveBuffer, getActiveTab, closeTab, handleNewFile, handleOpenFile, saveActiveTabAs]);

  // テーマローディング中の表示（シンプルに背景色のみ）
  if (themeLoading) {
    return <div className="app-loading" />;
  }

  return (
    <AppContext.Provider value={{ getActiveTab, saveActiveTab }}>
    <div className="app-container">
      {/* ヘッダー（メニューバー + プロジェクト情報 + 接続ステータス + ウィンドウコントロール） */}
      <Header
        activeTab={activeTab || { id: '', fileName: '', filePath: null, content: '', language: 'glsl', isModified: false }}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onSaveFile={handleSaveFile}
        onSaveFileAs={saveActiveTabAs}
        connectionStatus={connectionStatus}
        projectName={projectName}
      />

      {/* メインコンテンツ（サイドバー + エディタ） */}
      <div className="app-main-content">
        {/* サイドバー（初回は非表示） */}
        {trackDirectoryPath && isSidebarVisible ? (
          <div className="app-sidebar" style={{ width: `${sidebarWidth}px` }}>
            <SidebarPanel
              onFileSelect={handleFileSelect}
              activeFilePath={activeTab?.filePath || null}
              onSearchResult={handleSearchResult}
              onProjectRootChange={handleTrackDirectoryChange}
              onFileRenamed={(oldPath: string, newPath: string) => updateTabPath(oldPath, newPath)}
              onFileDeleted={(filePath: string) => closeTabByPath(filePath)}
              externalProjectRoot={trackDirectoryPath}
            />
          </div>
        ) : null}
        {/* 垂直リサイザ */}
        {trackDirectoryPath && isSidebarVisible ? (
          <div className="app-resizer" onMouseDown={handleResizerMouseDown} title="Drag to resize sidebar" />
        ) : null}

        {/* エディタエリア または ウェルカムスクリーン */}
        <div className="app-editor-area">
          {tabs.length > 0 ? (
            <>
              {/* タブバー（エディタに付随） */}
              <TabManager
                tabs={tabs}
                activeTabId={activeTabId}
                draggedTabId={draggedTabId}
                onTabSelect={setActiveBuffer}
                onTabClose={closeTab}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
              />

              {/* エディタコンテナ */}
              <EditorContainer
                theme={theme}
                activeTab={activeTab || null}
                getActiveTab={getActiveTab}
                updateTab={updateTab}
                onOpenFile={handleOpenFile}
                onSaveFile={handleSaveFile}
                onNewFile={handleNewFile}
                onEditorChange={handleEditorChange}
                onEditorReady={handleEditorReady}
              />
            </>
          ) : (
            /* ウェルカムスクリーン */
            <WelcomeScreen />
          )}
        </div>

        {/* 初回起動: ヘッダー以外の全面クリックでフォルダ選択 */}
        {!trackDirectoryPath ? (
          <div className="app-open-overlay" onClick={handleOpenFolderOverlayClick} title="Open Folder" />
        ) : null}
      </div>
    </div>
    </AppContext.Provider>
  );
};

export default App;