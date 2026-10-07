import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { blenderService } from './services/blenderService';
import { IPC } from './constants/ipc';
import { execFile } from 'child_process';
import JSON5 from 'json5';

let mainWindow: BrowserWindow | null = null;
let pendingFileOpen: { filePath: string; trackPath: string | null } | null = null; // 起動時のファイル開く処理を保留

// 親階層を辿って 'track' ディレクトリを検索
function findTrackDirectory(startPath: string): string | null {
  let currentPath = path.dirname(startPath);

  // ルートディレクトリに到達するまで親階層を辿る
  while (currentPath !== path.dirname(currentPath)) {
    const trackPath = path.join(currentPath, 'track');
    if (fs.existsSync(trackPath) && fs.statSync(trackPath).isDirectory()) {
      return trackPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

// プロジェクト名を取得（trackディレクトリの親ディレクトリ名）
function getProjectNameFromTrackPath(trackPath: string): string {
  const projectPath = path.dirname(trackPath);
  return path.basename(projectPath);
}

// コマンドライン引数からファイルパスを取得
function getFilePathFromArgs(argv: string[]): { filePath: string; trackPath: string | null } | null {
  // 引数の例: ['electron', 'main.js', '"path/to/file.glsl"']
  // または: ['ErnstEditor.exe', '"path/to/file.glsl"']


  // デバッグ用：ログをファイルに出力
  try {
    const debugLog = `DEBUG CLI: ${new Date().toISOString()}
Arguments: ${JSON.stringify(argv)}
NODE_ENV: ${process.env.NODE_ENV}
First arg: ${argv[0]}
---
`;
    fs.appendFileSync('cli_debug.log', debugLog);
  } catch (e) {
    // ログ書き込みエラーは無視
  }

  // 開発環境かプロダクション環境かを判定
  // electron で実行している場合は開発環境、ErnstEditor.exe の場合はプロダクション環境
  const isDevelopment = argv[0].includes('electron') && !argv[0].includes('ErnstEditor.exe');
  const args = argv.slice(isDevelopment ? 2 : 1);

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];

    // ダブルクォーテーションを除去
    if (arg.startsWith('"') && arg.endsWith('"')) {
      arg = arg.slice(1, -1);
    }

    // ファイルパスかどうかをチェック（--で始まるオプションは除外）
    if (!arg.startsWith('-')) {
      const exists = fs.existsSync(arg);

      if (exists) {
        const resolvedPath = path.resolve(arg);
        const trackPath = findTrackDirectory(resolvedPath);

        return { filePath: resolvedPath, trackPath };
      }
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

      // プロジェクト名を取得
      const projectName = trackPath ? getProjectNameFromTrackPath(trackPath) : null;

      mainWindow.webContents.send(IPC.FILE_OPEN_FROM_CLI, {
        filePath,
        content,
        fileName,
        trackPath: trackPath || null,
        projectName: projectName || null
      });

    } catch (error) {
      console.error(`❌ Failed to open file from command line: ${error}`);
    }
  } else {
    console.log(`⚠️ Cannot open file: MainWindow is not available`);
  }
}

// src/config 配下のファイルパスを解決（開発環境 → ビルド環境の順）
function resolveConfigPath(relativePath: string): string {
  const devPath = path.join(__dirname, '../src/config', relativePath);
  return fs.existsSync(devPath) ? devPath : path.join(__dirname, 'config', relativePath);
}

function readSettings(): { theme: string } {
  return JSON5.parse(fs.readFileSync(resolveConfigPath('settings.json'), 'utf-8'));
}

// VS Code テーマはコメントや末尾カンマを含むことがあるため JSON5 でパースする
function loadThemeFile(themeName: string): any {
  const themePath = resolveConfigPath(path.join('presets/themes', `${themeName}.json`));
  return JSON5.parse(fs.readFileSync(themePath, 'utf-8'));
}

function getStartupBackgroundColor(): string {
  try {
    return loadThemeFile(readSettings().theme).colors?.['editor.background'] ?? '#F1F0E9';
  } catch (error) {
    console.error('Failed to resolve startup background color:', error);
    return '#F1F0E9';
  }
}

const createWindow = (): void => {
  // メニューバーを無効化
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // ネイティブヘッダー（タイトルバー）を隠す
    backgroundColor: getStartupBackgroundColor(), // 読み込み中の背景色
    show: false, // 準備完了まで非表示
    icon: path.join(__dirname, '../assets/icons/icons/icons/png/256x256.png'), // アプリアイコン
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../dist/preload.js')
    }
  });

  mainWindow.loadFile('src/index.html');

  // 開発環境でのみ開発者ツールを開く（パッケージ版では無効）
  const isDevelopment = process.env.NODE_ENV === 'development' && !app.isPackaged;
  if (isDevelopment) {
    mainWindow.webContents.openDevTools();
  }

  // ページ読み込み完了後にウィンドウを表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // フォーカス時限定のキーハンドリング
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // DevTools
    if (input.key === 'F12') {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools();
      }
      event.preventDefault();
      return;
    }

    const isAccel = process.platform === 'darwin' ? input.meta : input.control;
    if (!isAccel) return;

    // Quit
    if (!input.shift && !input.alt && input.key?.toUpperCase() === 'Q') {
      event.preventDefault();
      app.quit();
      return;
    }

    // Reload / Force Reload
    if (!input.shift && !input.alt && input.key?.toUpperCase() === 'R') {
      event.preventDefault();
      mainWindow?.webContents.reload();
      return;
    }
    if (input.shift && !input.alt && input.key?.toUpperCase() === 'R') {
      event.preventDefault();
      mainWindow?.webContents.reloadIgnoringCache();
      return;
    }

    // To renderer actions (focused windowのみ)
    const send = (type: string) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC.APP_ACTION, { type });
      }
    };

    // New / Open / Save As / Close Tab / Toggle Sidebar
    if (!input.shift && !input.alt && input.key?.toUpperCase() === 'N') {
      event.preventDefault();
      send('file:new');
      return;
    }
    if (!input.shift && !input.alt && input.key?.toUpperCase() === 'O') {
      event.preventDefault();
      send('file:open');
      return;
    }
    if (input.shift && !input.alt && input.key?.toUpperCase() === 'S') {
      event.preventDefault();
      send('file:save-as');
      return;
    }
    if (!input.shift && !input.alt && input.key?.toUpperCase() === 'W') {
      event.preventDefault();
      send('tab:close');
      return;
    }
    if (!input.shift && !input.alt && input.key?.toUpperCase() === 'B') {
      event.preventDefault();
      send('view:toggle-sidebar');
      return;
    }

    // Tab navigation
    if (!input.shift && !input.alt && input.key === 'Tab') {
      event.preventDefault();
      send('tab:next');
      return;
    }
    if (input.shift && !input.alt && input.key === 'Tab') {
      event.preventDefault();
      send('tab:prev');
      return;
    }
  });

  // renderer が未保存変更で unload を止めたときに確認ダイアログを出す
  mainWindow.webContents.on('will-prevent-unload', (event) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Discard Changes', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: 'You have unsaved changes.',
      detail: 'Your changes will be lost if you close without saving.'
    });
    if (choice === 0) {
      event.preventDefault();
    }
  });

  // ウィンドウが閉じたらアプリも終了する（macOS を含む全プラットフォーム共通）
  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
};

// ファイル操作のIPC処理
ipcMain.handle(IPC.FILE_OPEN, async (): Promise<{ filePath: string; content: string; fileName: string } | null> => {
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

ipcMain.handle(IPC.FILE_SAVE, async (event: any, filePath: string, content: string, options?: { format?: boolean; mustExist?: boolean }): Promise<{ success: boolean; error?: string; formattedContent?: string }> => {
  try {
    if (options?.mustExist && !fs.existsSync(filePath)) {
      return { success: false, error: `File not found: ${filePath}` };
    }
    const ext = path.extname(filePath).toLowerCase();
    const isGLSL = ['.glsl', '.glslinc', '.vert', '.frag', '.geom', '.comp', '.tesc', '.tese', '.vs', '.fs', '.vertex', '.fragment', '.shader'].includes(ext);
    const shouldFormat = options?.format !== false;

    // フォーマット適用（GLSL系のみ）
    if (isGLSL && shouldFormat) {
      const formatted = await new Promise<string | null>((resolve) => {
        const args = ['-style=file', `--assume-filename=${filePath}`];
        const attemptExec = (binPath: string, next: () => void) => {
          try {
            const child = execFile(binPath, args, { cwd: path.dirname(filePath) }, (err, stdout) => {
              if (err) {
                next();
                return;
              }
              resolve(stdout || null);
            });
            if (child.stdin) {
              child.stdin.write(content);
              child.stdin.end();
            }
          } catch {
            next();
          }
        };

        const candidates: string[] = [
          'clang-format',
          // Windows npm scripts経由（開発時）
          path.join(process.cwd(), 'node_modules', '.bin', 'clang-format.cmd'),
          path.join(process.cwd(), 'node_modules', '.bin', 'clang-format.exe'),
          path.join(process.cwd(), 'node_modules', 'clang-format', 'bin', 'win32', 'clang-format.exe'),
          // パッケージ環境の候補
          path.join(process.resourcesPath || '', 'app', 'node_modules', '.bin', 'clang-format.exe'),
          path.join(process.resourcesPath || '', 'app', 'node_modules', 'clang-format', 'bin', 'win32', 'clang-format.exe')
        ].filter(Boolean);

        let idx = 0;
        const next = () => {
          if (idx >= candidates.length) {
            resolve(null);
            return;
          }
          const bin = candidates[idx++];
          attemptExec(bin, next);
        };
        next();
      });

      const textToWrite = typeof formatted === 'string' && formatted.length > 0 ? formatted : content;
      fs.writeFileSync(filePath, textToWrite, 'utf-8');
      try { mainWindow?.webContents.send(IPC.APP_ACTION, { type: 'explorer:refresh', payload: { filePath } }); } catch {}
      return { success: true, formattedContent: formatted ?? undefined };
    }

    // 非GLSL・整形なし指定はそのまま保存
    fs.writeFileSync(filePath, content, 'utf-8');
    try { mainWindow?.webContents.send(IPC.APP_ACTION, { type: 'explorer:refresh', payload: { filePath } }); } catch {}
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle(IPC.FILE_SAVE_AS, async (event: any, content: string): Promise<{ success: boolean; filePath?: string; fileName?: string; error?: string }> => {
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
      try { mainWindow?.webContents.send(IPC.APP_ACTION, { type: 'explorer:refresh', payload: { filePath: result.filePath } }); } catch {}
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

// （不要になったFILE_SAVED受信は削除）

// ファイルエクスプローラー用のIPC処理
ipcMain.handle(IPC.FOLDER_OPEN, async (): Promise<{ files: any[]; rootPath: string } | null> => {
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

ipcMain.handle(IPC.FOLDER_REFRESH, async (event: any, folderPath: string): Promise<{ files: any[] } | null> => {
  try {
    const files = await buildFileTree(folderPath);
    return { files };
  } catch (error) {
    console.error('Failed to refresh folder:', error);
    return null;
  }
});

// 軽量: 指定ディレクトリ直下の一覧（非再帰）
ipcMain.handle(IPC.FS_LIST_DIR, async (_event: any, dirPath: string): Promise<{ name: string; path: string; type: 'file'|'directory' }[]> => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map((d: any) => ({
      name: d.name,
      path: path.join(dirPath, d.name),
      type: d.isDirectory() ? 'directory' : 'file'
    }));
  } catch (error) {
    return [];
  }
});

ipcMain.handle(IPC.FILE_READ, async (event: any, filePath: string): Promise<string | null> => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Failed to read file:', error);
    return null;
  }
});

ipcMain.handle(IPC.FILE_RENAME, async (event: any, oldPath: string, newPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // renameSync は Windows で既存ファイルを上書きするため事前に弾く。
    // 大文字小文字だけの変更は同一ファイルを指すので realpath で判定して許可する
    if (fs.existsSync(newPath) && fs.realpathSync.native(newPath) !== fs.realpathSync.native(oldPath)) {
      return { success: false, error: `File already exists: ${path.basename(newPath)}` };
    }
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle(IPC.FILE_DELETE, async (event: any, filePath: string): Promise<{ success: boolean; error?: string }> => {
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
ipcMain.handle(IPC.FILE_MOVE, async (event: any, sourcePath: string, targetDir: string): Promise<{ success: boolean; newPath?: string; error?: string }> => {
  try {
    const fileName = path.basename(sourcePath);
    const newPath = path.join(targetDir, fileName);

    const relative = path.relative(sourcePath, targetDir);
    if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
      return { success: false, error: `Cannot move a folder into itself: ${fileName}` };
    }

    // 同名ファイルが存在するかチェック
    if (fs.existsSync(newPath)) {
      return { success: false, error: `File already exists: ${fileName}` };
    }

    // ファイル/ディレクトリを移動
    fs.renameSync(sourcePath, newPath);
    return { success: true, newPath };
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
ipcMain.handle(IPC.WINDOW_MINIMIZE, async (): Promise<void> => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle(IPC.WINDOW_MAXIMIZE, async (): Promise<void> => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle(IPC.WINDOW_CLOSE, async (): Promise<void> => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// テーマ読み込み用のIPC処理（themeName 省略時は settings.json の設定値）
ipcMain.handle(IPC.THEME_LOAD, async (_event: any, themeName?: string): Promise<any> => {
  try {
    return loadThemeFile(themeName ?? readSettings().theme);
  } catch (error) {
    console.error('Failed to load theme:', error);
    return null;
  }
});

// 全文検索のIPC処理
ipcMain.handle(IPC.SEARCH_FILES, async (_, searchTerm: string, projectRoot?: string): Promise<any[]> => {
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
ipcMain.handle(IPC.BLENDER_GET_CONNECTION_STATUS, async (): Promise<{
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

// レンダラー準備完了通知の処理
ipcMain.handle(IPC.RENDERER_READY, async (): Promise<void> => {
  // 保留中のファイル開く処理があれば実行
  if (pendingFileOpen) {
    try {
      openFileInRenderer(pendingFileOpen.filePath, pendingFileOpen.trackPath);
      pendingFileOpen = null; // 処理完了後はクリア
  } catch (error) {
      console.error('❌ Error opening pending file:', error);
    }
  }
});

// Blender直接通信テスト用のIPC処理
ipcMain.handle(IPC.BLENDER_SEND_TEST_VALUE, async (event: any, value: number): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {

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
  const result = getFilePathFromArgs(process.argv);
  if (result) {
    // レンダラーが準備完了したらファイルを開く
    pendingFileOpen = result;
  } else {
    console.log('⚠️ No file found in startup arguments');
  }


  // Blender WebSocket サービスを開始
  console.log('Starting Blender WebSocket Service...');
  try {
    await blenderService.start();

    // Blender接続状態変更を監視してrendererに通知
    blenderService.onConnectionChange((connected) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.BLENDER_CONNECTION_CHANGED, connected);
        console.log('Sent Blender connection status to renderer:', connected);
      }
    });
  } catch (error) {
    console.error('Failed to start WebSocket Server:', error);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // （グローバルショートカットは未使用）
});

let isQuitting = false; // 終了処理中フラグ

// 終了要求はすべてここで受け、最終的な終了は app.exit で行う（app.exit は before-quit を発火しない）
app.on('before-quit', (event) => {
  event.preventDefault();
  if (isQuitting) return;

  // ウィンドウが残っていれば close 経由で閉じる。未保存確認（beforeunload）で
  // キャンセルされればそのまま残り、閉じれば 'closed' から再度 app.quit() が呼ばれる
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
    return;
  }

  shutdown();
});

async function shutdown(): Promise<void> {
  isQuitting = true;

  // Blender WebSocket サービスを停止
  try {
    await blenderService.stop();
    console.log('Ernst Editor WebSocket Server stopped');
  } catch (error) {
    console.error('Failed to stop WebSocket Server:', error);
  }

  // 段階的終了処理
  setTimeout(() => {
    app.exit(0);
  }, 100);

  setTimeout(() => {
    process.exit(0);
  }, 300);

  setTimeout(() => {
    // 最終手段：すべての子プロセスを強制終了
    if (process.platform === 'win32') {
      require('child_process').exec('taskkill /F /T /PID ' + process.pid);
    } else {
      process.kill(process.pid, 'SIGKILL');
    }
  }, 500);
}

// セッション保存・読み込み用IPC
import { saveSession, loadSession, sessionExists } from './services/sessionService';

ipcMain.handle(IPC.SESSION_SAVE, async (event: any, sessionData: any, trackPath: string) => {
  try {
    // 現在のウィンドウ位置/サイズを付与して保存
    const bounds = mainWindow?.getBounds();
    const withBounds = {
      ...sessionData,
      windowBounds: bounds
        ? {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized: mainWindow?.isMaximized?.() ?? false,
            isFullScreen: mainWindow?.isFullScreen?.() ?? false
          }
        : sessionData?.windowBounds
    };
    return await saveSession(withBounds, trackPath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle(IPC.SESSION_LOAD, async (event: any, trackPath: string) => {
  try {
    const result = await loadSession(trackPath);
    try {
      // セッションにウィンドウ位置/サイズがあれば適用
      const data: any = (result as any)?.data;
      if (data && data.windowBounds && mainWindow && !mainWindow.isDestroyed()) {
        const b = data.windowBounds as { x?: number; y?: number; width: number; height: number; isMaximized?: boolean; isFullScreen?: boolean };
        // まずフルスクリーン/最大化状態を適用
        if (b.isFullScreen) {
          mainWindow.setFullScreen(true);
          return result;
        } else {
          mainWindow.setFullScreen(false);
        }

        if (b.isMaximized) {
          mainWindow.maximize();
          return result;
        } else if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        }

        // 位置とサイズを安全に適用（未定義は現在値を使用）
        const current = mainWindow.getBounds();
        const newBounds = {
          x: Number.isFinite(b.x as number) ? (b.x as number) : current.x,
          y: Number.isFinite(b.y as number) ? (b.y as number) : current.y,
          width: Number.isFinite(b.width) ? b.width : current.width,
          height: Number.isFinite(b.height) ? b.height : current.height
        };
        mainWindow.setBounds(newBounds);
      }
    } catch {}
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
});

ipcMain.handle(IPC.SESSION_EXISTS, async (event: any, trackPath: string) => {
  try {
    return sessionExists(trackPath);
  } catch (error) {
    console.error('❌ Error checking session existence:', error);
    return false;
  }
});

// 終了は 'closed' ハンドラで行うため、macOS の既定動作（アプリを残す）も含めてここでは何もしない
app.on('window-all-closed', () => {});