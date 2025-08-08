/**
 * セッション管理フック
 * アプリケーションのタブ状態とセッションファイルの同期を管理
 */

import React from 'react';
import { FileTab } from '../types';
import { SessionData } from '../types/session';
import { createSessionFromTabs, extractTabsFromSession, shouldSaveSession } from '../utils/sessionUtils';
import { electronClient } from '../services/electronClient';

interface UseSessionManagerProps {
  tabs: FileTab[];
  activeTabId: string | null;
  trackPath: string | null;
  projectName: string;
  addTabAndActivate: (tab: FileTab) => Promise<string>;
  addTab?: (tab: FileTab) => string; // セッション復元の非アクティブタブ追加用
  hasPendingFile?: boolean; // CLIファイルがあるかどうか
}

export function useSessionManager({
  tabs,
  activeTabId,
  trackPath,
  projectName,
  addTabAndActivate,
  addTab,
  hasPendingFile = false
}: UseSessionManagerProps) {
  // セッション操作状態
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState<number | null>(null);

  /**
   * 現在のタブ状態をセッションファイルに保存
   */
  const saveSession = React.useCallback(async (): Promise<boolean> => {
    if (!trackPath || !shouldSaveSession(tabs)) {
      return false;
    }

    setIsLoading(true);
    try {
      const sessionData = createSessionFromTabs(tabs, activeTabId, trackPath, projectName);
      const result = await electronClient.saveSession(sessionData, trackPath);

      if (result.success) {
        setLastSaved(Date.now());
        return true;
      } else {
        console.error('❌ Failed to save session:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Session save error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tabs, activeTabId, trackPath, projectName]);

  /**
   * セッションファイルからタブ状態を復元
   */
  const loadSession = React.useCallback(async (): Promise<boolean> => {
    if (!trackPath) {
      console.log('📄 Session load skipped: no track path');
      return false;
    }

    setIsLoading(true);
    try {
      const result = await electronClient.loadSession(trackPath);

      if ((result as any).success && (result as any).data) {
        const sessionData: SessionData = (result as any).data;
        // 次のフレームで参照できるようにグローバルに保持（フォントサイズ適用用）
        (window as any).__ERNST_LAST_SESSION__ = sessionData;
        const { tabsToOpen, activeTabPath } = extractTabsFromSession(sessionData);

        // 各タブを順番に作成
        for (const tabInfo of tabsToOpen) {
          try {
            const fileContent = await electronClient.readFile(tabInfo.filePath);
            if (fileContent !== null) {
              const newTab: FileTab = {
                id: `session-${Date.now()}-${Math.random()}`,
                fileName: tabInfo.fileName,
                filePath: tabInfo.filePath,
                content: fileContent,
                language: tabInfo.language,
                isModified: false,
                // ビューステートが保存されていれば復元できるよう保持
                viewState: tabInfo.viewState
              };

              // CLIファイルが来る想定なら、アクティブ化はCLIに譲る
              if (!hasPendingFile && tabInfo.isActive) {
                await addTabAndActivate(newTab);
              } else {
                if (addTab) {
                  addTab(newTab); // 追加のみでアクティブ化しない
                } else {
                  await addTabAndActivate(newTab); // フォールバック
                }
              }
            }
          } catch (error) {
            console.error(`❌ Failed to load tab: ${tabInfo.filePath}`, error);
          }
        }

        // UI状態を window へ保持（App から参照）
        try {
          const width = (sessionData as any).sidebarWidth;
          (window as any).__ERNST_UI_STATE__ = {
            ...(window as any).__ERNST_UI_STATE__,
            sidebarWidth: width
          };
          if (typeof width === 'number') {
            const evt = new CustomEvent('ERNST_APPLY_SIDEBAR_WIDTH', { detail: width });
            window.dispatchEvent(evt);
          }
        } catch {}

        // ウィンドウ位置/サイズはメイン側で適用済み。renderer 側にもキャッシュ
        try {
          const wb = (sessionData as any).windowBounds;
          if (wb) {
            (window as any).__ERNST_UI_STATE__ = {
              ...(window as any).__ERNST_UI_STATE__,
              windowBounds: wb
            };
          }
        } catch {}

        // エディタのフォントサイズ（ズーム相当）を遅延適用（EditorContainer側で受け取って適用）
        if (typeof (sessionData as any).editorFontSize === 'number') {
          const targetFontSize = (sessionData as any).editorFontSize as number;
          const evt = new CustomEvent('ERNST_APPLY_FONT_SIZE', { detail: targetFontSize });
          window.dispatchEvent(evt);
        }

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('❌ Session load error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [trackPath, addTabAndActivate, hasPendingFile]);

  /**
   * セッションファイルの存在確認
   */
  const sessionExists = React.useCallback(async (): Promise<boolean> => {
    if (!trackPath) return false;

    try {
      return await electronClient.sessionExists(trackPath);
    } catch (error) {
      console.error('❌ Session exists check error:', error);
      return false;
    }
  }, [trackPath]);

  /**
   * 自動保存（タブ変更時）
   */
  React.useEffect(() => {
    if (trackPath && tabs.length > 0) {
      // デバウンス: タブ変更から2秒後に自動保存
      const timeoutId = setTimeout(() => {
        saveSession();
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [tabs, activeTabId, trackPath, saveSession]);

  return {
    // 状態
    isLoading,
    lastSaved,

    // 操作
    saveSession,
    loadSession,
    sessionExists
  };
}
