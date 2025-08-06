import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { blenderService } from './services/blenderService';

let mainWindow: BrowserWindow | null = null;
let startupTimers: NodeJS.Timeout[] = []; // 起動時のタイマーを管理

// 親階層を辿って 'track' ディレクトリを検索
function findTrackDirectory(startPath: string): string | null {
  let currentPath = path.dirname(startPath);

  // ルートディレクトリに到達するまで親階層を辿る
  while (currentPath !== path.dirname(currentPath)) {
    const trackPath = path.join(currentPath, 'track');
    if (fs.existsSync(trackPath) && fs.statSync(trackPath).isDirectory()) {
      console.log(`Found track directory: ${trackPath}`);
      return trackPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

// コマンドライン引数からファイルパスを取得
function getFilePathFromArgs(argv: string[]): { filePath: string; trackPath: string | null } | null {
  // 引数の例: ['electron', 'main.js', '"path/to/file.glsl"']
  // または: ['ErnstEditor.exe', '"path/to/file.glsl"']

  console.log('🔍 All command line arguments:', argv);
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

  const args = argv.slice(process.env.NODE_ENV === 'development' ? 2 : 1);
  console.log('🔍 Processed arguments:', args);

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    console.log(`🔍 Processing arg[${i}]: "${arg}"`);

    // ダブルクォーテーションを除去
    if (arg.startsWith('"') && arg.endsWith('"')) {
      arg = arg.slice(1, -1);
      console.log(`🔍 After quote removal: "${arg}"`);
    }

    // ファイルパスかどうかをチェック（--で始まるオプションは除外）
    if (!arg.startsWith('-')) {
      console.log(`🔍 Checking if file exists: "${arg}"`);
      const exists = fs.existsSync(arg);
      console.log(`🔍 File exists: ${exists}`);

      if (exists) {
        const resolvedPath = path.resolve(arg);
        const trackPath = findTrackDirectory(resolvedPath);

        console.log(`CLI file path: ${resolvedPath}`);
        if (trackPath) {
          console.log(`CLI track directory: ${trackPath}`);
        }

        return { filePath: resolvedPath, trackPath };
      }
    } else {
      console.log(`🔍 Skipping option: "${arg}"`);
    }
  }

  console.log('⚠️ No valid file path found in command line arguments');
  return null;
}

// ファイルをレンダラープロセスで開くためのイベント送信
function openFileInRenderer(filePath: string, trackPath?: string | null) {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);

      mainWindow.webContents.send('file:open-from-cli', {
        filePath,
        content,
        fileName,
        trackPath: trackPath || null
      });

      console.log(`Opening file from command line: ${filePath}`);
      if (trackPath) {
        console.log(`Setting project root to track directory: ${trackPath}`);
      }
    } catch (error) {
      console.error(`❌ Failed to open file from command line: ${error}`);
    }
  } else {
    console.log(`⚠️ Cannot open file: MainWindow is not available`);
  }
}

const createWindow = (): void => {
  // メニューバーを無効化
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // ネイティブヘッダー（タイトルバー）を隠す
    backgroundColor: '#101010', // 読み込み中の背景色
    show: false, // 準備完了まで非表示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../dist/preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');

  // 開発環境でのみ開発者ツールを開く
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // ページ読み込み完了後にウィンドウを表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
};

// ファイル操作のIPC処理
ipcMain.handle('file:open', async (): Promise<{ filePath: string; content: string; fileName: string } | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'GLSL Files', extensions: ['glsl', 'glslinc', 'vert', 'frag', 'vs', 'fs', 'vertex', 'fragment', 'shader'] },
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js', 'jsx'] },
      { name: 'TypeScript', extensions: ['ts', 'tsx'] },
      { name: 'Text Files', extensions: ['txt', 'md'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
      filePath,
      content,
      fileName: path.basename(filePath)
    };
  }
  return null;
});

ipcMain.handle('file:save', async (event: any, filePath: string, content: string): Promise<{ success: boolean; error?: string }> => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('file:saveAs', async (event: any, content: string): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> => {
  if (!mainWindow) return { success: false, error: 'No main window available' };

  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'GLSL Files', extensions: ['glsl', 'glslinc', 'vert', 'frag', 'vs', 'fs'] },
      { name: 'All Files', extensions: ['*'] },
      { name: 'JavaScript', extensions: ['js'] },
      { name: 'TypeScript', extensions: ['ts'] },
      { name: 'Text Files', extensions: ['txt'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return {
        success: true,
        filePath: result.filePath,
        fileName: path.basename(result.filePath)
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
  return { success: false };
});

// ファイルエクスプローラー用のIPC処理
ipcMain.handle('folder:open', async (): Promise<{ files: any[]; rootPath: string } | null> => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0];
    const files = await buildFileTree(folderPath);
    return { files, rootPath: folderPath };
  }
  return null;
});

ipcMain.handle('folder:refresh', async (event: any, folderPath: string): Promise<{ files: any[] } | null> => {
  try {
    const files = await buildFileTree(folderPath);
    return { files };
  } catch (error) {
    console.error('Failed to refresh folder:', error);
    return null;
  }
});

ipcMain.handle('file:read', async (event: any, filePath: string): Promise<string | null> => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
});

ipcMain.handle('file:rename', async (event: any, oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle('file:delete', async (event: any, filePath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

// ファイル移動
ipcMain.handle('file:move', async (event: any, sourcePath: string, targetDir: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const fileName = path.basename(sourcePath);
    const newPath = path.join(targetDir, fileName);

    // 同名ファイルが存在するかチェック
    if (fs.existsSync(newPath)) {
      return { success: false, error: `File already exists: ${fileName}` };
    }

    // ファイル/ディレクトリを移動
    fs.renameSync(sourcePath, newPath);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

// ファイルツリーを構築する関数
async function buildFileTree(dirPath: string): Promise<any[]> {
  try {
    const items = fs.readdirSync(dirPath);
    const fileTree: any[] = [];

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);

      const fileItem: any = {
        id: itemPath,
        name: item,
        path: itemPath,
        type: stats.isDirectory() ? 'directory' : 'file',
        isExpanded: false
      };

      if (stats.isDirectory()) {
        // ディレクトリの場合は子要素も取得
        fileItem.children = await buildFileTree(itemPath);
      }

      fileTree.push(fileItem);
    }

    // ディレクトリを先に、ファイルを後にソート
    return fileTree.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error('Failed to build file tree:', error);
    return [];
  }
}

// ウィンドウコントロール用のIPC処理
ipcMain.handle('window:minimize', async (): Promise<void> => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window:maximize', async (): Promise<void> => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', async (): Promise<void> => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// テーマ読み込み用のIPC処理
ipcMain.handle('theme:load', async (event: any, themeName: string = 'ernst-dark'): Promise<any> => {
  try {
    // 開発環境とビルド環境の両方に対応
    let themePath: string;

    // まず開発環境のパスを試す
    const devPath = path.join(__dirname, '../src/config/presets/themes', `${themeName}.json`);
    if (fs.existsSync(devPath)) {
      themePath = devPath;
    } else {
      // ビルド環境のパスを試す（dist内）
      themePath = path.join(__dirname, 'config/presets/themes', `${themeName}.json`);
    }

    console.log('Loading theme from:', themePath);
    const themeContent = fs.readFileSync(themePath, 'utf-8');
    return JSON.parse(themeContent);
  } catch (error) {
    console.error('Failed to load theme:', error);
    console.error('Attempted paths checked');
    return null;
  }
});

// 全文検索のIPC処理
ipcMain.handle('search:files', async (_, searchTerm: string, projectRoot?: string): Promise<any[]> => {
  if (!searchTerm || !searchTerm.trim()) {
    return [];
  }

  if (!projectRoot) {
    console.warn('No project root specified for search');
    return [];
  }

  const searchResults: any[] = [];

  try {
    await searchInDirectory(projectRoot, searchTerm, searchResults);

    // 結果をソート（ファイル名順、行番号順）
    searchResults.sort((a, b) => {
      if (a.filePath !== b.filePath) {
        return a.filePath.localeCompare(b.filePath);
      }
      return a.line - b.line;
    });

    return searchResults;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
});

// Blender接続状態のIPC処理
ipcMain.handle('blender:get-connection-status', async (): Promise<{
  isServerRunning: boolean;
  isBlenderConnected: boolean;
  clientCount: number;
}> => {
  try {
    const status = blenderService.getConnectionStatus();
    return status;
  } catch (error) {
    console.error('Error getting Blender connection status:', error);
    return {
      isServerRunning: false,
      isBlenderConnected: false,
      clientCount: 0
    };
  }
});

// Blender直接通信テスト用のIPC処理
ipcMain.handle('blender:send-test-value', async (event: any, value: number): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    console.log(`🧪 IPC: Testing direct value send: ${value}`);

    // 詳細な状態ログを出力
    const status = blenderService.getConnectionStatus();
    console.log('🔍 IPC: Current Blender status:', status);
    console.log('🔍 IPC: isConnected():', blenderService.isConnected());

    // 直接送信を試行
    blenderService.sendUniformValue(value);

    return { success: true };
  } catch (error) {
    console.error('❌ IPC: Error sending test value to Blender:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// ディレクトリ内を再帰的に検索する関数
async function searchInDirectory(dirPath: string, searchTerm: string, results: any[]): Promise<void> {
  const ignorePatterns = [
    'node_modules',
    '.git',
    'dist',
    'dist-electron',
    '.next',
    'build',
    'coverage',
    '.nyc_output'
  ];

  const supportedExtensions = [
    '.glsl', '.vert', '.frag', '.geom', '.tesc', '.tese', '.comp', '.glslinc'
  ];

  try {
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 無視するディレクトリをスキップ
        if (!ignorePatterns.includes(entry)) {
          await searchInDirectory(fullPath, searchTerm, results);
        }
      } else if (stat.isFile()) {
        // サポートされている拡張子のファイルのみ検索
        const ext = path.extname(entry).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          await searchInFile(fullPath, searchTerm, results);
            }
          }
        }
      } catch (error) {
    // アクセス権限エラーなどは無視
    console.warn('Cannot access directory:', dirPath, error);
      }
    }

// ファイル内を検索する関数
async function searchInFile(filePath: string, searchTerm: string, results: any[]): Promise<void> {
      try {
    const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
    const fileName = path.basename(filePath);

        lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim();
      let searchIndex = 0;

      // 行内で複数マッチを探す
      while (true) {
        const matchIndex = line.toLowerCase().indexOf(searchTerm.toLowerCase(), searchIndex);
        if (matchIndex === -1) break;

        // 前後のテキストを取得
        const beforeText = line.substring(0, matchIndex);
        const afterText = line.substring(matchIndex + searchTerm.length);

        results.push({
          filePath,
          fileName,
          line: lineIndex + 1,
          column: matchIndex + 1,
          lineText: line,
          beforeText,
          afterText,
          matchStart: matchIndex,
          matchEnd: matchIndex + searchTerm.length
        });

        searchIndex = matchIndex + 1;
      }
    });
  } catch (error) {
    // バイナリファイルや読み取りエラーは無視
    console.warn('Cannot read file:', filePath, error);
  }
}

// シングルインスタンス設定（既に起動している場合は既存のウィンドウにフォーカス）
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // セカンドインスタンスが起動された時の処理
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 既存のウィンドウがある場合はフォーカス
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // コマンドライン引数からファイルパスを取得して開く
      console.log('🔍 Second instance command line:', commandLine);
      const result = getFilePathFromArgs(commandLine);
      if (result) {
        openFileInRenderer(result.filePath, result.trackPath);
      } else {
        console.log('⚠️ No file found in second instance command line');
      }
    }
  });
}

app.whenReady().then(async () => {
  createWindow();

  // 起動時のコマンドライン引数をチェック
  console.log('🔍 Startup command line check');
  const result = getFilePathFromArgs(process.argv);
  if (result) {
    console.log('✅ File found in startup arguments, setting timer');
    try {
      // ウィンドウが完全に読み込まれるまで少し待つ
      const timerId = setTimeout(() => {
        console.log('⏰ Timer executed, opening file');
        try {
          openFileInRenderer(result.filePath, result.trackPath);
        } catch (error) {
          console.error('❌ Error opening file in renderer:', error);
        }
        // タイマー配列から削除
        const index = startupTimers.indexOf(timerId);
        if (index > -1) {
          startupTimers.splice(index, 1);
        }
      }, 1000);
      startupTimers.push(timerId);
      console.log('📝 Timer set successfully');
    } catch (error) {
      console.error('❌ Error setting timer:', error);
    }
  } else {
    console.log('⚠️ No file found in startup arguments');
  }

  console.log('🔄 Proceeding to Blender Service startup...');

  // Blender WebSocket サービスを開始
  console.log('🚀 Starting Blender WebSocket Service...');
  try {
    await blenderService.start();
    console.log('✅ Ernst Editor WebSocket Server started on port 8765');

    // Blender接続状態変更を監視してrendererに通知
    blenderService.onConnectionChange((connected) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('blender:connection-changed', connected);
        console.log('📡 Sent Blender connection status to renderer:', connected);
      }
    });
  } catch (error) {
    console.error('❌ Failed to start WebSocket Server:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

let isQuitting = false; // 終了処理中フラグ

// アプリケーション終了前のクリーンアップ
app.on('before-quit', async (event) => {
  if (!isQuitting) {
    isQuitting = true;
    event.preventDefault(); // 一旦終了を止める

    console.log('🧹 Starting cleanup process...');

    // 実行中のタイマーをクリア
    startupTimers.forEach(timerId => {
      clearTimeout(timerId);
    });
    startupTimers = [];
    console.log('🧹 Startup timers cleared');

    // Blender WebSocket サービスを停止
    try {
      await blenderService.stop();
      console.log('🛑 Ernst Editor WebSocket Server stopped');
    } catch (error) {
      console.error('❌ Failed to stop WebSocket Server:', error);
    }

    // mainWindowを明示的にクローズ
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
      mainWindow = null;
    }

    console.log('✅ Cleanup completed, quitting app');

    // 少し待ってから最終的に終了
    setTimeout(() => {
      app.exit(0);
    }, 100);
  }
});

app.on('window-all-closed', () => {
  // macOS以外では即座に終了
  if (process.platform !== 'darwin') {
    if (!isQuitting) {
      app.quit();
    }
  }
});