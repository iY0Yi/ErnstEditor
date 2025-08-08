/**
 * セッション保存用の型定義
 * Phase 1: 最小実装（タブ保存のみ）
 */

/**
 * 個別タブの情報
 */
export interface TabInfo {
  filePath: string;        // ファイルの絶対パス
  isActive: boolean;       // アクティブタブかどうか
  fileName: string;        // ファイル名のみ（表示用）
  language: string;        // ファイルの言語（glsl, javascript, etc）
  // Monaco のビューステート（スクロール位置・カーソル位置など）
  // 型は環境に依存するため any として保存（JSON シリアライズ可能）
  viewState?: any;
}

/**
 * セッション全体のデータ
 */
export interface SessionData {
  projectPath: string;     // trackディレクトリの絶対パス
  projectName: string;     // プロジェクト名（例: BalloonFight）
  lastModified: number;    // 最終更新タイムスタンプ（Date.now()）

  openTabs: TabInfo[];     // 開いているタブの一覧

  // エディタ全体のフォントサイズ（ズーム相当）
  editorFontSize?: number;

  // レイアウト: サイドバーの現在幅（px）
  sidebarWidth?: number;
}

/**
 * セッション操作の結果
 */
export interface SessionResult {
  success: boolean;
  error?: string;
  data?: SessionData;
}