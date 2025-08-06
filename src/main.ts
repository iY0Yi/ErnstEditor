import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { blenderService } from './services/blenderService';

let mainWindow: BrowserWindow | null = null;

// コマンドライン引数からファイルパスを取得
function getFilePathFromArgs(argv: string[]): string | null {
  // 引数の例: ['electron', 'main.js', 'path/to/file.glsl']
  // または: ['ErnstEditor.exe', 'path/to/file.glsl']

  const args = argv.slice(process.env.NODE_ENV === 'development' ? 2 : 1);

  for (const arg of args) {
    // ファイルパスかどうかをチェック（--で始まるオプションは除外）
    if (!arg.startsWith('-') && fs.existsSync(arg)) {
      return path.resolve(arg);
    }
  }

  return null;
}

// ファイルをレンダラープロセスで開くためのイベント送信
function openFileInRenderer(filePath: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);

      mainWindow.webContents.send('file:open-from-cli', {
        filePath,
        content,
        fileName
      });

      console.log(`📂 Opening file from command line: ${filePath}`);
    } catch (error) {
      console.error(`❌ Failed to open file from command line: ${error}`);
    }
  }
}

const createWindow = (): void => {
  // メニューバーを無効化
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // ネイティブヘッダー（タイトルバー）を隠す
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../dist/preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');
  mainWindow.webContents.openDevTools();
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
      const filePath = getFilePathFromArgs(commandLine);
      if (filePath) {
        openFileInRenderer(filePath);
      }
    }
  });
}

app.whenReady().then(async () => {
  createWindow();

  // 起動時のコマンドライン引数をチェック
  const filePath = getFilePathFromArgs(process.argv);
  if (filePath) {
    // ウィンドウが完全に読み込まれるまで少し待つ
    setTimeout(() => {
      openFileInRenderer(filePath);
    }, 1000);
  }

  // Blender WebSocket サービスを開始（一時的に無効化）
  console.log('⚠️ WebSocket Server temporarily disabled for testing');
  /*
  try {
    await blenderService.start();
    console.log('✅ Ernst Editor WebSocket Server started on port 8765');
  } catch (error) {
    console.error('❌ Failed to start WebSocket Server:', error);
  }
  */

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  // Blender WebSocket サービスを停止（一時的に無効化）
  /*
  try {
    await blenderService.stop();
    console.log('🛑 Ernst Editor WebSocket Server stopped');
  } catch (error) {
    console.error('❌ Failed to stop WebSocket Server:', error);
  }
  */

  if (process.platform !== 'darwin') {
    app.quit();
  }
});