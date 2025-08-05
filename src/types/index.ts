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
  saveFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
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