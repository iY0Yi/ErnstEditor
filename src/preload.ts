const { contextBridge, ipcRenderer } = require('electron');

interface ElectronAPI {
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
  searchInFiles: (searchTerm: string, projectRoot?: string) => Promise<any[]>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // 既存のファイル操作API
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('file:save', filePath, content),
  saveFileAs: (content: string) => ipcRenderer.invoke('file:saveAs', content),

  // ファイルエクスプローラー用API
  openFolder: () => ipcRenderer.invoke('folder:open'),
  refreshFolder: (folderPath: string) => ipcRenderer.invoke('folder:refresh', folderPath),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('file:rename', oldPath, newPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
  moveFile: (sourcePath: string, targetDir: string) => ipcRenderer.invoke('file:move', sourcePath, targetDir),

  // ウィンドウコントロール用API
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // テーマ読み込み用API
  loadTheme: (themeName?: string) => ipcRenderer.invoke('theme:load', themeName),

  // 検索用API
  searchInFiles: (searchTerm: string, projectRoot?: string) => ipcRenderer.invoke('search:files', searchTerm, projectRoot)
} as ElectronAPI);