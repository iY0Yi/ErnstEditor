/**
 * 中央集中型バッファマネージャ
 * アクティブタブの状態を完全に内部管理し、保存機能も内蔵
 */
import React from 'react';
import { FileTab } from '../types';
import { generateId } from '../utils/idUtils';
import { getLanguageFromFileName } from '../components/language';
import { electronClient } from '../services/electronClient';

interface UseBufferManagerProps {
  initialTabs?: FileTab[];
  onTabsChange?: (tabs: FileTab[]) => void;
  saveSession?: () => Promise<void>;
  monaco?: any; // Monaco Editor インスタンス
}

export function useBufferManager({
  initialTabs = [],
  onTabsChange,
  saveSession,
  monaco
}: UseBufferManagerProps) {

  // 内部状態管理（プライベート）
  const [_tabs, _setTabs] = React.useState<FileTab[]>(initialTabs);
  const [_activeTabId, _setActiveTabId] = React.useState<string | null>(null);

  // 最新のタブ配列へ即時アクセスするための参照（非同期更新に強い）
  const _tabsRef = React.useRef<FileTab[]>(_tabs);
  React.useEffect(() => {
    _tabsRef.current = _tabs;
  }, [_tabs]);

  // ドラッグ&ドロップ状態管理
  const [draggedTabId, setDraggedTabId] = React.useState<string | null>(null);

  // タブ変更時のコールバック
  React.useEffect(() => {
    onTabsChange?.(_tabs);
  }, [_tabs, onTabsChange]);

  // Monaco モデル作成関数
  const createModel = React.useCallback((content: string, language: string, uri?: string): any => {
    if (!monaco) {
      console.error('📚BufferManager: Monaco not available, returning null model');
      return null;
    }

    try {
      // 各タブに一意のURIを生成（ファイルパス＋タブIDで確実に一意）
      const uniqueUri = uri ? monaco.Uri.parse(`${uri}-${generateId()}`) : monaco.Uri.parse(`file:///model-${generateId()}.${language}`);
      const model = monaco.editor.createModel(content, language, uniqueUri);
      console.log('📚BufferManager: Monaco model created successfully');
      return model;
    } catch (error) {
      console.error('📚BufferManager: Error creating Monaco model:', error);
      return null;
    }
  }, [monaco]);

  // Monaco がロードされた時に既存タブのモデルを作成
  React.useEffect(() => {
    if (monaco) {
      console.log('📚BufferManager: Monaco loaded, creating models');
      _setTabs(prevTabs =>
        prevTabs.map(tab => {
          if (!tab.model) {
            const model = createModel(tab.content, tab.language, tab.filePath || undefined);
            return { ...tab, model };
          }
          return tab;
        })
      );

      // フォントサイズ適用は EditorContainer で一元管理
    }
  }, [monaco, createModel]);

  /**
   * タブの更新（先に定義）
   */
  const updateTab = React.useCallback((tabId: string, updates: Partial<FileTab>) => {
    _setTabs(prevTabs =>
      prevTabs.map(tab => {
        if (tab.id !== tabId) return tab;
        const next = { ...tab, ...updates } as FileTab;
        // モデルが欠落/破棄されている場合は再生成
        try {
          const disposed = next.model && typeof next.model.isDisposed === 'function' ? next.model.isDisposed() : false;
          if ((!next.model || disposed) && (updates.content !== undefined || updates.language !== undefined)) {
            const model = createModel(next.content, next.language, next.filePath || undefined);
            return { ...next, model };
          }
        } catch {}
        return next;
      })
    );
  }, [createModel]);

  /**
   * アクティブタブの取得
   */
  const getActiveTab = React.useCallback((): FileTab | null => {
    return _activeTabId ? _tabs.find(tab => tab.id === _activeTabId) || null : null;
  }, [_tabs, _activeTabId]);

  /**
   * setActiveBuffer - コア実装
   * タブをアクティブにし、プライベート変数を更新し、Monaco Editorの内容を切り替える
   */
  const setActiveBuffer = React.useCallback(async (tabIdOrFilePath: string): Promise<boolean> => {
    console.log('📚BufferManager: setActiveBuffer:', tabIdOrFilePath);
    console.log('📚BufferManager: Total tabs:', _tabs.length, 'Tab files:', _tabs.map(t => t.fileName));

    // tabId または filePath で検索
    let targetTab: FileTab | null = null;

    if (tabIdOrFilePath.includes('/') || tabIdOrFilePath.includes('\\')) {
      // ファイルパスの場合
      targetTab = _tabs.find(tab => tab.filePath === tabIdOrFilePath) || null;
    } else {
      // tabIdの場合
      targetTab = _tabs.find(tab => tab.id === tabIdOrFilePath) || null;
    }

    if (!targetTab) {
      console.warn('⚠️ BufferManager: Target tab not found:', tabIdOrFilePath);
      return false;
    }

    if (targetTab.id === _activeTabId) {
      return true;
    }

        try {
      // Monaco Editor instance取得（複数の方法を試行）
      let editorInstance = (window as any).monacoEditorInstance;

      if (!editorInstance) {
        // フォールバック: Monaco Editorの標準的な取得方法
        const editors = (window as any).monaco?.editor?.getEditors?.();
        if (editors && editors.length > 0) {
          editorInstance = editors[0];
          console.log('📚BufferManager: Monaco Editor instance found via fallback method');
        }
      }

      if (!editorInstance) {
        console.error('📚BufferManager: Monaco Editor instance not found');
        return false;
      }

      // Step 1: 現在のアクティブタブのビューステートを保存
      const currentTab = getActiveTab();
      if (currentTab && currentTab.model && currentTab.id !== targetTab.id) {
        try {
          const viewState = editorInstance.saveViewState();
          if (viewState) {
            updateTab(currentTab.id, { viewState });
          }
        } catch (error) {
          console.log('📚BufferManager: View state save cancelled (normal)');
        }
      }

      // Step 2: プライベート変数を更新（アクティブタブ設定）
      _setActiveTabId(targetTab.id);

      // Step 3: Monaco Editorの内容を切り替え
      // disposed モデルなら再生成
      try {
        if (targetTab.model && typeof targetTab.model.isDisposed === 'function' && targetTab.model.isDisposed()) {
          const recreated = createModel(targetTab.content, targetTab.language, targetTab.filePath || undefined);
          targetTab = { ...targetTab, model: recreated } as FileTab;
          // タブ配列にも反映
          _setTabs(prev => prev.map(t => t.id === targetTab!.id ? (targetTab as FileTab) : t));
        }
      } catch {}

      if (targetTab.model) {
        editorInstance.setModel(targetTab.model);

        // フォントサイズを毎回適用（エディタ側で初期化により戻るケース対策）
        try {
          const last = (window as any).__ERNST_LAST_SESSION__;
          if (last && typeof last.editorFontSize === 'number') {
            editorInstance.updateOptions({ fontSize: last.editorFontSize });
          }
        } catch {}

        // シンタックスハイライトを明示的に有効化
        if (monaco && monaco.editor) {
          try {
            // 言語の再設定でハイライトを強制更新
            monaco.editor.setModelLanguage(targetTab.model, targetTab.language);
          } catch (error) {
            console.log('📚BufferManager: Syntax highlighting setup failed:', error);
          }
        }

        // ビューステートを復元
        if (targetTab.viewState) {
          try {
            editorInstance.restoreViewState(targetTab.viewState);
          } catch (error) {
            console.log('📚BufferManager: View state restore failed (normal)');
          }
        }

        editorInstance.focus();
      } else {
        console.error('📚BufferManager: FAILED - model not found for:', targetTab.fileName);
      }

      // Step 4: ウィンドウタイトル更新
      const title = `${targetTab.fileName}${targetTab.isModified ? ' *' : ''} - Ernst Editor`;
      document.title = title;

      // Step 5: セッション自動保存（BufferManagerでは呼ばない。useSessionManagerに一本化）

      return true;

    } catch (error) {
      console.error('📚BufferManager: Error in setActiveBuffer:', error);
      return false;
    }
  }, [_tabs, _activeTabId, getActiveTab, updateTab, saveSession]);





  /**
   * タブの追加（基本機能）
   */
  const addTab = React.useCallback((newTab: FileTab) => {
    // 既に同じファイルが開かれているかチェック
    if (newTab.filePath) {
      const existingTab = _tabsRef.current.find(tab => tab.filePath === newTab.filePath);
      if (existingTab) {
        return existingTab.id;
      }
    }

    // Monaco Modelを作成
    if (monaco && !newTab.model) {
      const model = createModel(newTab.content, newTab.language, newTab.filePath || undefined);
      newTab = { ...newTab, model };
    }

    _setTabs(prevTabs => [...prevTabs, newTab]);
    return newTab.id;
  }, [_tabs, monaco, createModel]);

      // アクティブ化待ちのタブID
  const [_pendingActivationTabId, _setPendingActivationTabId] = React.useState<string | null>(null);

  // タブが追加されたときにアクティブ化を実行
  React.useEffect(() => {
    if (_pendingActivationTabId) {
      const targetTab = _tabs.find(tab => tab.id === _pendingActivationTabId);
      if (targetTab) {
        (async () => {
          const ok = await setActiveBuffer(_pendingActivationTabId);
          if (ok) {
            _setPendingActivationTabId(null);
          }
        })();
      }
    }
  }, [_tabs, _pendingActivationTabId, setActiveBuffer, _activeTabId]);

  // Monaco エディタが準備できていなかった場合のリトライ
  React.useEffect(() => {
    const editorReady = !!(window as any).monacoEditorInstance || !!(window as any).monaco?.editor?.getEditors?.()?.[0];
    if (editorReady && !_activeTabId && _tabs.length > 0) {
      const targetId = _pendingActivationTabId || _tabs[0].id;
      (async () => {
        const ok = await setActiveBuffer(targetId);
        if (ok && _pendingActivationTabId === targetId) {
          _setPendingActivationTabId(null);
        }
      })();
    }
  }, [_activeTabId, _pendingActivationTabId, _tabs, setActiveBuffer]);

  /**
   * タブ追加 + アクティブ化
   */
  const addTabAndActivate = React.useCallback(async (newTab: FileTab): Promise<string> => {
    // 既に同じファイルが開かれているかチェック
    if (newTab.filePath) {
      const existingTab = _tabsRef.current.find(tab => tab.filePath === newTab.filePath);
      if (existingTab) {
        await setActiveBuffer(existingTab.id);
        return existingTab.id;
      }
    }

    // Monaco Modelを作成
    if (monaco && !newTab.model) {
      const model = createModel(newTab.content, newTab.language, newTab.filePath || undefined);
      newTab = { ...newTab, model };
    }

    // タブ追加
    _setTabs(prevTabs => [...prevTabs, newTab]);

    // アクティブ化を予約（useEffectで実行される）
    _setPendingActivationTabId(newTab.id);
    return newTab.id;
  }, [_tabs, setActiveBuffer, monaco, createModel]);

  /**
   * 複数タブをまとめて閉じる（確認なし）
   * 呼び出し元のクロージャが古くても取りこぼさないよう、最新のタブ配列を参照する
   */
  const closeTabs = React.useCallback((tabIds: string[]) => {
    const currentTabs = _tabsRef.current;
    const closing = currentTabs.filter(t => tabIds.includes(t.id));
    if (closing.length === 0) return;

    const remaining = currentTabs.filter(t => !tabIds.includes(t.id));
    _setTabs(prev => prev.filter(t => !tabIds.includes(t.id)));

    const disposeClosingModels = () => {
      closing.forEach(t => {
        try { t.model?.dispose?.(); } catch (error) { console.warn('📚BufferManager: Model dispose failed:', error); }
      });
    };

    const isClosingActive = !!_activeTabId && tabIds.includes(_activeTabId);
    if (!isClosingActive) {
      disposeClosingModels();
      return;
    }

    // アクティブタブが削除された場合は、まず次のタブへ切替えてからモデルを破棄
    if (remaining.length > 0) {
      const activeIndex = currentTabs.findIndex(t => t.id === _activeTabId);
      const remainingBefore = currentTabs.slice(0, activeIndex).filter(t => !tabIds.includes(t.id)).length;
      const nextActiveTabId = remaining[Math.min(remainingBefore, remaining.length - 1)].id;
      (async () => {
        await setActiveBuffer(nextActiveTabId);
        window.dispatchEvent(new Event('ERNST_FOCUS_EDITOR'));
        disposeClosingModels();
      })();
      return;
    }

    _setActiveTabId(null);
    document.title = 'Ernst Editor';
    // 破棄前に外しておく（アタッチ中のモデルを破棄するとエディタ側の後始末が走るため）
    const editor = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
    editor?.setModel?.(null);
    disposeClosingModels();
  }, [_activeTabId, setActiveBuffer]);

  /**
   * タブを閉じる（未保存なら確認する）
   */
  const closeTab = React.useCallback((tabId: string) => {
    const tab = _tabsRef.current.find(t => t.id === tabId);
    if (!tab) return;

    const currentContent = tab.model && !tab.model.isDisposed?.() ? tab.model.getValue() : tab.content;
    const isEmptyUntitled = !tab.filePath && !currentContent;
    if (tab.isModified && !isEmptyUntitled) {
      const ok = window.confirm(`"${tab.fileName}" has unsaved changes. Close without saving?`);
      if (!ok) return;
    }
    closeTabs([tabId]);
  }, [closeTabs]);

  /**
   * アクティブタブの保存（内蔵機能）
   */
  const saveActiveTab = React.useCallback(async (options?: { format?: boolean }): Promise<boolean> => {
    console.log('📚BufferManager: Saving active tab');

    let activeTab = getActiveTab();

    try {
      // Monaco Editorから直接内容を取得（フォールバック付き）
      let editorInstance = (window as any).monacoEditorInstance;

      if (!editorInstance) {
        // フォールバック: 標準的な取得方法
        const editors = (window as any).monaco?.editor?.getEditors?.();
        if (editors && editors.length > 0) {
          editorInstance = editors[0];
        }
      }

      if (!editorInstance) {
        // ここで即 return せず、Save As にフォールバックできるよう継続
      }

      // 追加フォールバック: 現在のエディタモデルからタブを逆引き
      if (!activeTab || !activeTab.filePath) {
        try {
          const currentModel = editorInstance.getModel?.();
          if (currentModel) {
            const found = _tabsRef.current.find(t => t.model === currentModel);
            if (found) {
              activeTab = found;
              if (_activeTabId !== found.id) {
                _setActiveTabId(found.id);
              }
            }
          }
        } catch {}
      }

      if (!activeTab) {
        console.log('📚BufferManager: No active file to save');
        return false;
      }
      if (!activeTab.filePath) {
        // 未保存ファイルは Save As にフォールバックさせる
        return false;
      }

      const model = activeTab.model && !activeTab.model.isDisposed?.() ? activeTab.model : null;
      const content = model?.getValue?.() ?? editorInstance?.getValue?.() ?? activeTab.content ?? '';
      const versionAtSave = model?.getAlternativeVersionId?.();

      // ファイルに保存（GLSLはメイン側でclang-formatが走る）
      if (electronClient) {
        const result = await electronClient.saveFile(activeTab.filePath, content, options);
        if (result.success) {
          // 整形待ちの間に編集されていたら、整形結果で上書きすると入力が消えるので反映しない
          const editedDuringSave = !!model && (model.isDisposed() || model.getAlternativeVersionId() !== versionAtSave);
          if (editedDuringSave) {
            console.warn('📚BufferManager: Buffer changed during save; keeping unsaved edits');
            return true;
          }

          const updatedContent = typeof result.formattedContent === 'string' && result.formattedContent.length > 0
            ? result.formattedContent
            : content;

          if (model && updatedContent !== content) {
            const { applyModelEdits } = require('../utils/monacoUtils');
            applyModelEdits(model, [{ range: model.getFullModelRange(), text: updatedContent }]);
          }

          updateTab(activeTab.id, { isModified: false, content: updatedContent });
          console.log('📚BufferManager: File saved successfully');
          return true;
        } else {
          console.error('📚BufferManager: Failed to save file:', result.error);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('📚BufferManager: Error saving file:', error);
      return false;
    }
  }, [getActiveTab, updateTab]);

  /**
   * エディタ内容変更ハンドラ
   */
  const handleEditorChange = React.useCallback((value: string | undefined) => {
    if (value !== undefined && _activeTabId) {
      const activeTab = getActiveTab();
      if (activeTab) {
        console.log('📚BufferManager: Content changed for:', activeTab.fileName);
        updateTab(_activeTabId, { content: value, isModified: true });
      }
    }
  }, [_activeTabId, getActiveTab, updateTab]);

    /**
   * saveSession を後から設定（初期化順序対応）
   */
  const _saveSessionRef = React.useRef<null | (() => Promise<void>)>(null);

  const setSaveSession = React.useCallback((newSaveSession: () => Promise<void>) => {
    _saveSessionRef.current = newSaveSession;
    console.log('📚BufferManager: setSaveSession set');
  }, []);

  // ドラッグ&ドロップハンドラー
  const handleDragStart = React.useCallback((e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();

    if (draggedTabId && draggedTabId !== targetTabId) {
      _setTabs(prevTabs => {
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
  }, [draggedTabId]);

  const handleDragEnd = React.useCallback(() => {
    setDraggedTabId(null);
  }, []);

  // 新規ファイル作成
  const createNewFile = React.useCallback(async () => {
    let newTab: FileTab = {
      id: generateId(),
      filePath: '',
      fileName: 'untitled.glsl',
      content: '',
      language: 'glsl',
      isModified: true
    };
    // Monaco モデルを事前に作成
    if (monaco && !newTab.model) {
      const model = createModel(newTab.content, newTab.language);
      newTab = { ...newTab, model };
    }
    await addTabAndActivate(newTab);
  }, [addTabAndActivate, monaco, createModel]);

    // Save As機能（統合）
  const saveActiveTabAs = React.useCallback(async (): Promise<boolean> => {
    let activeTab = getActiveTab();
    if (!activeTab) {
      // フォールバック: 現在のエディタモデルから推測
      try {
        const editorInstance = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
        const currentModel = editorInstance?.getModel?.();
        if (currentModel) {
          const found = _tabsRef.current.find(t => t.model === currentModel) || null;
          if (found) {
            activeTab = found;
            if (_activeTabId !== found.id) {
              _setActiveTabId(found.id);
            }
          }
        }
      } catch {}
    }
    if (!activeTab) {
      // さらにフォールバック: タブが一つだけならそれを対象にする
      if (_tabsRef.current.length === 1) {
        activeTab = _tabsRef.current[0];
        if (_activeTabId !== activeTab.id) {
          _setActiveTabId(activeTab.id);
        }
      }
    }
    if (!activeTab) {
      console.log('📚BufferManager: No active tab to save');
      return false;
    }

    try {
      // 現在の内容を取得（エディタ未準備時のフォールバック付き）
      let content: string | undefined;
      try {
        const editorInstance = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
        content = editorInstance?.getValue?.();
      } catch {}
      if (typeof content !== 'string') {
        try { content = activeTab.model?.getValue?.(); } catch {}
      }
      if (typeof content !== 'string') {
        content = activeTab.content ?? '';
      }

      // Save Asダイアログ
      if (electronClient) {
        const result = await electronClient.saveFileAs(content);
        if ((result as any).success && (result as any).filePath && (result as any).fileName) {
          // タブ情報を更新
          updateTab(activeTab.id, {
            filePath: (result as any).filePath,
            fileName: (result as any).fileName,
            isModified: false,
            content: content
          });

          // タイトル更新
          document.title = `${(result as any).fileName} - Ernst Editor`;
          return true;
        } else {
          console.log('📚BufferManager: Save As cancelled or failed');
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('📚BufferManager: Error in saveActiveTabAs:', error);
      return false;
    }
  }, [getActiveTab, updateTab]);

  // ファイル読み込み+タブ作成（統合）
  const openFileAsTab = React.useCallback(async (filePath: string, makeActive: boolean = true): Promise<string | null> => {
    try {
      // 既存タブをチェック
    const existingTab = _tabsRef.current.find(tab => tab.filePath === filePath);
      if (existingTab) {
        if (makeActive) {
          await setActiveBuffer(existingTab.id);
        }
        return existingTab.id;
      }

      // ファイル内容を読み込み
      if (!electronClient) {
        console.error('📚BufferManager: Electron API not available');
        return null;
      }

      const content = await electronClient.readFile(filePath);
      if (content === null) {
        console.error('📚BufferManager: Failed to read file:', filePath);
        return null;
      }

      // ファイル名と言語を抽出
      const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
      const language = getLanguageFromFileName(fileName);

      // 新しいタブを作成
      const newTab: FileTab = {
        id: `file-${Date.now()}-${Math.random()}`,
        fileName,
        filePath,
        content,
        language,
        isModified: false
      };

      addTab(newTab);

      if (makeActive) {
        _setPendingActivationTabId(newTab.id);
      }

      console.log('📚BufferManager: File opened as tab:', fileName);
      return newTab.id;
    } catch (error) {
      console.error('📚BufferManager: Error opening file as tab:', error);
      return null;
    }
  }, [_tabs, setActiveBuffer, addTab]);

  // ファイル選択ダイアログ+タブ作成（統合）
  const openFileDialog = React.useCallback(async (): Promise<string | null> => {
    try {
      const result = await electronClient.openFile();
      if (!result) {
        console.log('📚BufferManager: File selection cancelled');
        return null;
      }

      // 既存タブをチェック
      const existingTab = _tabsRef.current.find(tab => tab.filePath === result.filePath);
      if (existingTab) {
        await setActiveBuffer(existingTab.id);
        return existingTab.id;
      }

      // 新しいタブを作成
      const newTab: FileTab = {
        id: `dialog-${Date.now()}-${Math.random()}`,
        fileName: result.fileName,
        filePath: result.filePath,
        content: result.content,
        language: getLanguageFromFileName(result.fileName),
        isModified: false
      };

      addTab(newTab);
      _setPendingActivationTabId(newTab.id);

      console.log('📚BufferManager: File dialog opened as tab:', result.fileName);
      return newTab.id;
    } catch (error) {
      console.error('📚BufferManager: Error in file dialog:', error);
      return null;
    }
  }, [_tabs, setActiveBuffer, addTab]);

  // セッション復元用タブ作成（統合）
  const createSessionTabs = React.useCallback(async (tabInfoList: Array<{
    filePath: string;
    fileName: string;
    language: string;
    isActive: boolean;
  }>, hasPendingFile: boolean = false): Promise<string[]> => {
    const createdTabIds: string[] = [];

    for (const tabInfo of tabInfoList) {
      try {
        // 既存タブをチェック
        const existingTab = _tabsRef.current.find(tab => tab.filePath === tabInfo.filePath);
        if (existingTab) {
          createdTabIds.push(existingTab.id);
          if (!hasPendingFile && tabInfo.isActive) {
            _setPendingActivationTabId(existingTab.id);
          }
          continue;
        }

        // ファイル内容を読み込み
        if (!electronClient) {
          console.error('📚BufferManager: Electron API not available');
          continue;
        }

        const fileContent = await electronClient.readFile(tabInfo.filePath);
        if (fileContent === null) {
          console.error('📚BufferManager: Failed to read file:', tabInfo.filePath);
          continue;
        }

        // 新しいタブを作成
        const newTab: FileTab = {
          id: `session-${Date.now()}-${Math.random()}`,
          fileName: tabInfo.fileName,
          filePath: tabInfo.filePath,
          content: fileContent,
          language: tabInfo.language,
          isModified: false
        };

        addTab(newTab);
        createdTabIds.push(newTab.id);

        // CLIファイルがない場合のみ、アクティブタブを設定
        if (!hasPendingFile && tabInfo.isActive) {
          _setPendingActivationTabId(newTab.id);
          console.log('📚BufferManager: Setting active tab from session:', newTab.fileName);
        } else if (hasPendingFile) {
          console.log('📚BufferManager: Skipping session active tab (CLI file pending):', newTab.fileName);
        }
      } catch (error) {
        console.error(`📚BufferManager: Failed to create session tab: ${tabInfo.filePath}`, error);
      }
    }

    console.log(`📚BufferManager: Created ${createdTabIds.length} session tabs`);
    return createdTabIds;
  }, [_tabs, setActiveBuffer, addTab]);

  // CLI用タブ作成（統合）
  const createCLITab = React.useCallback(async (fileData: {
    filePath: string;
    content: string;
    fileName: string;
  }): Promise<string | null> => {
    try {
      console.log('📚BufferManager: Creating CLI tab with BufferManager:', fileData.fileName);

      // 既存タブをチェック
      const existingTab = _tabsRef.current.find(tab => tab.filePath === fileData.filePath);
      if (existingTab) {
        await setActiveBuffer(existingTab.id);
        return existingTab.id;
      }

      // 新しいタブを作成
      const newTab: FileTab = {
        id: `cli-${Date.now()}-${Math.random()}`,
        fileName: fileData.fileName,
        filePath: fileData.filePath,
        content: fileData.content,
        language: getLanguageFromFileName(fileData.fileName),
        isModified: false
      };

      addTab(newTab);

      // アクティブにする
      _setPendingActivationTabId(newTab.id);

      console.log('📚BufferManager: CLI tab created:', fileData.fileName);
      return newTab.id;
    } catch (error) {
      console.error('📚BufferManager: Error creating CLI tab:', error);
      return null;
    }
  }, [_tabs, setActiveBuffer, addTab]);

  // パス管理機能（統合）
  // フォルダのリネーム/移動/削除にも追従するため、配下のファイルも対象にする
  const isSameOrInside = (filePath: string, basePath: string): boolean =>
    filePath === basePath || filePath.startsWith(basePath + '\\') || filePath.startsWith(basePath + '/');

  const updateTabPath = React.useCallback((oldPath: string, newPath: string): boolean => {
    const targets = _tabsRef.current.filter(
      (tab): tab is FileTab & { filePath: string } => !!tab.filePath && isSameOrInside(tab.filePath, oldPath)
    );
    if (targets.length === 0) return false;

    for (const tab of targets) {
      const updatedPath = newPath + tab.filePath.slice(oldPath.length);
      const updatedFileName = updatedPath.split(/[/\\]/).pop() || tab.fileName;
      updateTab(tab.id, { filePath: updatedPath, fileName: updatedFileName });
    }
    console.log('📚BufferManager: Tab path updated:', oldPath, '->', newPath, `(${targets.length} tabs)`);
    return true;
  }, [updateTab]);

  const closeTabByPath = React.useCallback((filePath: string): boolean => {
    const targetIds = _tabsRef.current
      .filter(tab => tab.filePath && isSameOrInside(tab.filePath, filePath))
      .map(tab => tab.id);
    if (targetIds.length === 0) return false;

    // ファイル自体が削除済みなので確認は出さない
    closeTabs(targetIds);
    console.log('📚BufferManager: Tabs closed by path:', filePath, `(${targetIds.length} tabs)`);
    return true;
  }, [closeTabs]);

    return {
    // 外部インターフェース
    tabs: _tabs,
    activeTabId: _activeTabId,
    getActiveTab,
    setActiveBuffer,
    addTab,
    closeTab,
    updateTab,
    saveActiveTab,
    handleEditorChange,
    setSaveSession,

    // ドラッグ&ドロップ
    draggedTabId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,

        // タブ管理
    addTabAndActivate,

    // 新規ファイル作成
    createNewFile,

    // ファイル保存
    saveActiveTabAs,

    // パス管理統合機能
    updateTabPath,
    closeTabByPath,

    // デバッグ情報
    debugInfo: {
      totalTabs: _tabs.length,
      activeTabId: _activeTabId,
      activeTabName: getActiveTab()?.fileName || 'none'
    }
  };
}
