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

  // コマンドライン引数からのファイル開き用API
  onFileOpenFromCLI: (callback: (data: { filePath: string; content: string; fileName: string; trackPath?: string | null }) => void) => void;
  removeFileOpenFromCLIListener: () => void;

  // Blenderサーバー制御用API
  forceStartBlenderServer: () => Promise<{ success: boolean; error?: string }>;
  sendTestValueToBlender: (value: number) => Promise<{ success: boolean; error?: string }>;

  // Blender接続状態API
  getBlenderConnectionStatus: () => Promise<{ isServerRunning: boolean; isBlenderConnected: boolean; clientCount: number }>;
  onBlenderConnectionChange: (callback: (connected: boolean) => void) => void;
  removeBlenderConnectionListener: () => void;
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
  searchInFiles: (searchTerm: string, projectRoot?: string) => ipcRenderer.invoke('search:files', searchTerm, projectRoot),

  // コマンドライン引数からのファイル開き用API
  onFileOpenFromCLI: (callback: (data: { filePath: string; content: string; fileName: string }) => void) => {
    ipcRenderer.on('file:open-from-cli', (event, data) => callback(data));
  },
  removeFileOpenFromCLIListener: () => {
    ipcRenderer.removeAllListeners('file:open-from-cli');
  },

  // Blenderサーバー制御用API
  forceStartBlenderServer: () => ipcRenderer.invoke('blender:force-start-server'),
  sendTestValueToBlender: (value: number) => ipcRenderer.invoke('blender:send-test-value', value),

  // Blender接続状態API
  getBlenderConnectionStatus: () => ipcRenderer.invoke('blender:get-connection-status'),
  onBlenderConnectionChange: (callback: (connected: boolean) => void) => {
    ipcRenderer.on('blender:connection-changed', (event, connected) => callback(connected));
  },
  removeBlenderConnectionListener: () => {
    ipcRenderer.removeAllListeners('blender:connection-changed');
  }
} as ElectronAPI);