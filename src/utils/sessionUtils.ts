/**
 * セッション変換ユーティリティ
 * アプリケーションの状態とセッションデータの相互変換を担当
 */

import * as monaco from 'monaco-editor';
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
    .filter((tab): tab is FileTab & { filePath: string } => !!tab.filePath) // ファイルパスがあるタブのみ（新規ファイルは除外）
    .map(tab => ({
      filePath: tab.filePath,
      isActive: tab.id === activeTabId,
      fileName: tab.fileName,
      language: tab.language,
      // Monaco ビューステートを保存（存在する場合のみ）
      viewState: tab.viewState ?? undefined
    }));

  // エディタのフォントサイズ（ズーム相当）を取得
  const editor = (window as any).monacoEditorInstance || (window as any).monaco?.editor?.getEditors?.()?.[0];
  const fontSize = editor?.getOption?.(monaco.editor.EditorOption.fontSize);
  const editorFontSize: number | undefined = typeof fontSize === 'number' ? fontSize : undefined;

  // サイドバー幅（App 側が window に保持している場合を考慮）
  const w = (window as any).__ERNST_UI_STATE__?.sidebarWidth;
  const sidebarWidth: number | undefined = typeof w === 'number' ? w : undefined;

  // ウィンドウ位置とサイズ。保存時にメインプロセスが現在値で上書きするので、renderer 側は直近値を UI_STATE から渡すだけ
  const s = (window as any).__ERNST_UI_STATE__?.windowBounds;
  const windowBounds: any = s && typeof s.width === 'number' && typeof s.height === 'number' ? s : undefined;

  return {
    projectPath,
    projectName,
    lastModified: Date.now(),
    openTabs,
    editorFontSize,
    sidebarWidth,
    windowBounds
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
