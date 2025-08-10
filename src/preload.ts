const { contextBridge, ipcRenderer } = require('electron');
import { IPC } from './constants/ipc';

interface ElectronAPI {
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

  // レンダラー準備完了通知API
  notifyRendererReady: () => Promise<void>;

  // セッション保存・読み込み用API
  saveSession: (sessionData: any, trackPath: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  loadSession: (trackPath: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  sessionExists: (trackPath: string) => Promise<boolean>;
}

contextBridge.exposeInMainWorld('electronAPI', {
  // 既存のファイル操作API
  openFile: () => ipcRenderer.invoke(IPC.FILE_OPEN),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke(IPC.FILE_SAVE, filePath, content),
  saveFileAs: (content: string) => ipcRenderer.invoke(IPC.FILE_SAVE_AS, content),

  // ファイルエクスプローラー用API
  openFolder: () => ipcRenderer.invoke(IPC.FOLDER_OPEN),
  refreshFolder: (folderPath: string) => ipcRenderer.invoke(IPC.FOLDER_REFRESH, folderPath),
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.FILE_READ, filePath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke(IPC.FILE_RENAME, oldPath, newPath),
  deleteFile: (filePath: string) => ipcRenderer.invoke(IPC.FILE_DELETE, filePath),
  moveFile: (sourcePath: string, targetDir: string) => ipcRenderer.invoke(IPC.FILE_MOVE, sourcePath, targetDir),

  // ウィンドウコントロール用API
  minimizeWindow: () => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.invoke(IPC.WINDOW_CLOSE),

  // テーマ読み込み用API
  loadTheme: (themeName?: string) => ipcRenderer.invoke(IPC.THEME_LOAD, themeName),

  // 検索用API
  searchInFiles: (searchTerm: string, projectRoot?: string) => ipcRenderer.invoke(IPC.SEARCH_FILES, searchTerm, projectRoot),

  // コマンドライン引数からのファイル開き用API
  onFileOpenFromCLI: (callback: (data: { filePath: string; content: string; fileName: string }) => void) => {
    ipcRenderer.on(IPC.FILE_OPEN_FROM_CLI, (event, data) => callback(data));
  },
  removeFileOpenFromCLIListener: () => {
    ipcRenderer.removeAllListeners(IPC.FILE_OPEN_FROM_CLI);
  },

  // Blenderサーバー制御用API
  forceStartBlenderServer: () => ipcRenderer.invoke(IPC.BLENDER_FORCE_START_SERVER),
  sendTestValueToBlender: (value: number) => ipcRenderer.invoke(IPC.BLENDER_SEND_TEST_VALUE, value),

  // Blender接続状態API
  getBlenderConnectionStatus: () => ipcRenderer.invoke(IPC.BLENDER_GET_CONNECTION_STATUS),
  onBlenderConnectionChange: (callback: (connected: boolean) => void) => {
    ipcRenderer.on(IPC.BLENDER_CONNECTION_CHANGED, (event, connected) => callback(connected));
  },
  removeBlenderConnectionListener: () => {
    ipcRenderer.removeAllListeners(IPC.BLENDER_CONNECTION_CHANGED);
  },

  // レンダラー準備完了通知API
  notifyRendererReady: () => ipcRenderer.invoke(IPC.RENDERER_READY),

  // セッション保存・読み込み用API
  saveSession: (sessionData: any, trackPath: string) => ipcRenderer.invoke(IPC.SESSION_SAVE, sessionData, trackPath),
  loadSession: (trackPath: string) => ipcRenderer.invoke(IPC.SESSION_LOAD, trackPath),
  sessionExists: (trackPath: string) => ipcRenderer.invoke(IPC.SESSION_EXISTS, trackPath)
} as ElectronAPI);