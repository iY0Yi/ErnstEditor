/**
 * セッション変換ユーティリティ
 * アプリケーションの状態とセッションデータの相互変換を担当
 */

import { FileTab } from '../types';
import { SessionData, TabInfo } from '../types/session';

/**
 * アプリケーションのタブ状態をセッションデータに変換
 * @param tabs - 現在開いているタブ配列
 * @param activeTabId - アクティブなタブのID
 * @param projectPath - プロジェクトのtrackディレクトリパス
 * @param projectName - プロジェクト名
 * @returns セッションデータ
 */
export function createSessionFromTabs(
  tabs: FileTab[],
  activeTabId: string | null,
  projectPath: string,
  projectName: string
): SessionData {
  const openTabs: TabInfo[] = tabs
    .filter(tab => tab.filePath) // ファイルパスがあるタブのみ（新規ファイルは除外）
    .map(tab => ({
      filePath: tab.filePath,
      isActive: tab.id === activeTabId,
      fileName: tab.fileName,
      language: tab.language,
      // Monaco ビューステートを保存（存在する場合のみ）
      viewState: tab.viewState ?? undefined
    }));

  // エディタのフォントサイズ（ズーム相当）を取得
  let editorFontSize: number | undefined = undefined;
  try {
    const editor = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
    if (editor) {
      // エディターの現在のフォントサイズを堅牢に取得
      let fontSize: any = undefined;
      try {
        if (editor.getOption) {
          fontSize = editor.getOption((window as any).monaco.editor.EditorOption.fontSize);
        }
      } catch {}
      if (fontSize == null) {
        try {
          const opts = editor.getOptions?.();
          fontSize = opts?.get?.((window as any).monaco.editor.EditorOption.fontSize) ?? opts?.fontSize;
        } catch {}
      }
      if (typeof fontSize === 'number') editorFontSize = fontSize;
    }
  } catch {}

  // サイドバー幅（App 側が window に保持している場合を考慮）
  let sidebarWidth: number | undefined = undefined;
  try {
    const w = (window as any).__ERNST_UI_STATE__?.sidebarWidth;
    if (typeof w === 'number') sidebarWidth = w;
  } catch {}

  return {
    projectPath,
    projectName,
    lastModified: Date.now(),
    openTabs,
    editorFontSize,
    sidebarWidth
  };
}

/**
 * セッションデータからタブ情報を抽出
 * @param sessionData - セッションデータ
 * @returns タブ復元用の情報配列
 */
export function extractTabsFromSession(sessionData: SessionData): {
  tabsToOpen: TabInfo[],
  activeTabPath: string | null
} {
  const activeTab = sessionData.openTabs.find(tab => tab.isActive);

  return {
    tabsToOpen: sessionData.openTabs,
    activeTabPath: activeTab ? activeTab.filePath : null
  };
}

/**
 * プロジェクトパスからプロジェクト名を抽出
 * @param trackPath - trackディレクトリのパス
 * @returns プロジェクト名
 */
export function extractProjectName(trackPath: string): string {
  // trackの親ディレクトリ名を取得
  const path = require('path');
  const projectRoot = path.dirname(trackPath);
  return path.basename(projectRoot);
}

/**
 * セッション保存が必要かどうかを判定
 * @param tabs - 現在のタブ配列
 * @returns 保存が必要な場合true
 */
export function shouldSaveSession(tabs: FileTab[]): boolean {
  // ファイルパスがあるタブが1つ以上ある場合のみ保存
  return tabs.some(tab => tab.filePath);
}
