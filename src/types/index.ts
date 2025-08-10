// 検索結果型定義
export interface SearchResult {
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  lineText: string;
  beforeText: string;
  afterText: string;
  matchStart: number;
  matchEnd: number;
}

// ElectronAPI型定義
export interface ElectronAPI {
  // 既存のファイル操作API
  openFile: () => Promise<{ filePath: string; content: string; fileName: string } | null>;
  saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string; formattedContent?: string }>;
  saveFileAs: (content: string) => Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }>;

  // ファイルエクスプローラー用API
  openFolder: () => Promise<{ files: any[]; rootPath: string } | null>;
  refreshFolder: (folderPath: string) => Promise<{ files: any[] } | null>;
  readFile: (filePath: string) => Promise<string | null>;
  renameFile: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  moveFile: (sourcePath: string, targetDir: string) => Promise<{ success: boolean; error?: string }>;

  // ウィンドウコントロール用API
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;

  // テーマ読み込み用API
  loadTheme: (themeName?: string) => Promise<any>;

  // 検索用API
  searchInFiles: (searchTerm: string, projectRoot?: string) => Promise<SearchResult[]>;

  // コマンドライン引数からのファイル開き用API
  onFileOpenFromCLI: (callback: (data: { filePath: string; content: string; fileName: string; trackPath?: string | null; projectName?: string | null }) => void) => void;
  removeFileOpenFromCLIListener: () => void;

  // Blender接続状態API
  getBlenderConnectionStatus: () => Promise<{ isServerRunning: boolean; isBlenderConnected: boolean; clientCount: number }>;
  onBlenderConnectionChange: (callback: (connected: boolean) => void) => void;
  removeBlenderConnectionListener: () => void;

  // Blenderサーバー制御用API
  forceStartBlenderServer: () => Promise<{ success: boolean; error?: string }>;
  sendTestValueToBlender: (value: number) => Promise<{ success: boolean; error?: string }>;

  // レンダラー準備完了通知API
  notifyRendererReady: () => Promise<void>;

  // セッション保存・読み込み用API
  saveSession: (sessionData: any, trackPath: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  loadSession: (trackPath: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  sessionExists: (trackPath: string) => Promise<boolean>;
}

// グローバル型定義
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// ファイルタブ型定義
export interface FileTab {
  id: string;
  fileName: string;
  filePath: string | null;
  content: string;
  language: string;
  isModified: boolean;
  model?: any; // Monaco EditorのITextModel
  viewState?: any; // Monaco EditorのICodeEditorViewState
}

// メニュー状態型定義
export interface MenuState {
  fileMenuOpen: boolean;
}

// ファイルエクスプローラー型定義
export interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  isExpanded: boolean;
  children?: FileItem[];
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  targetItem: FileItem;
}