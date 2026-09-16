import * as React from 'react';
import { FileTypeIcon } from './icons/FileTypeIcon';
import { getFileIconType, getFolderIconType } from '../utils/fileTypeUtils';
import '../styles/file-tree-icons.css';

// ファイルエクスプローラーの型定義
interface FileItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
  isExpanded?: boolean;
}

interface ContextMenuPosition {
  x: number;
  y: number;
  targetItem: FileItem | null;
}

interface FileExplorerProps {
  onFileSelect: (filePath: string, fileName: string, content: string) => void;
  activeFilePath: string | null;
  onProjectRootChange?: (projectRoot: string | null) => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (filePath: string) => void;
  externalProjectRoot?: string | null; // 外部からプロジェクトルートを設定
}

const isSameOrInside = (target: string, basePath: string): boolean =>
  target === basePath || target.startsWith(basePath + '\\') || target.startsWith(basePath + '/');

const getParentPath = (itemPath: string): string => {
  const idx = Math.max(itemPath.lastIndexOf('/'), itemPath.lastIndexOf('\\'));
  return idx === -1 ? '' : itemPath.slice(0, idx);
};

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, activeFilePath, onProjectRootChange, onFileRenamed, onFileDeleted, externalProjectRoot }) => {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [contextMenu, setContextMenu] = React.useState<ContextMenuPosition | null>(null);
  const [draggedItem, setDraggedItem] = React.useState<FileItem | null>(null);
  const [projectRoot, setProjectRoot] = React.useState<string | null>(null);
  const [renamingItem, setRenamingItem] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState<string>('');

  // 非同期のリフレッシュやイベントハンドラから最新値を参照するための ref
  const filesRef = React.useRef<FileItem[]>(files);
  const projectRootRef = React.useRef<string | null>(projectRoot);
  const refreshSeqRef = React.useRef(0);
  React.useEffect(() => { filesRef.current = files; }, [files]);
  React.useEffect(() => { projectRootRef.current = projectRoot; }, [projectRoot]);

  // プロジェクトルートを開く
  const openProjectFolder = async () => {
    const { electronClient } = require('../services/electronClient');
    if (electronClient && electronClient.openFolder) {
      const result = await electronClient.openFolder();
      if (result) {
        setFiles(result.files);
        setProjectRoot(result.rootPath);
        onProjectRootChange?.(result.rootPath);
      }
    }
  };

  // 指定されたディレクトリを読み込む
  const loadProjectDirectory = async (directoryPath: string) => {
    console.log('📂FileExplorer: Loading project directory:', directoryPath);
    const { electronClient } = require('../services/electronClient');
    if (electronClient && electronClient.refreshFolder) {
      try {
        const result = await electronClient.refreshFolder(directoryPath);
        if (result) {
          console.log('📂FileExplorer: Directory loaded successfully');
          setFiles(result.files);
          setProjectRoot(directoryPath);
          onProjectRootChange?.(directoryPath);
        } else {
          console.error('❌ FileExplorer: Failed to load directory');
        }
      } catch (error) {
        console.error('❌ FileExplorer: Error loading directory:', error);
      }
    }
  };

  // 外部からのプロジェクトルート設定を処理
  React.useEffect(() => {
    if (externalProjectRoot && externalProjectRoot !== projectRoot) {
      console.log('📂FileExplorer: External project root changed:', externalProjectRoot);
      loadProjectDirectory(externalProjectRoot);
    }
  }, [externalProjectRoot, projectRoot]);

  // ファイルツリーアイテムのレンダリング
  const renderFileItem = (item: FileItem, depth: number = 0): React.ReactNode => {
    const handleItemClick = async () => {
      if (item.type === 'file') {
        // ファイルの内容を読み込んでタブで開く
        const { electronClient } = require('../services/electronClient');
        if (electronClient && electronClient.readFile) {
          const content = await electronClient.readFile(item.path);
          if (content !== null) {
            onFileSelect(item.path, item.name, content);
          }
        }
    } else {
        // ディレクトリの展開/折りたたみ
        setFiles(prevFiles => toggleDirectory(prevFiles, item.id));
    }
  };

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        targetItem: item
      });
    };

  const handleDragStart = (e: React.DragEvent) => {
      setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedItem && draggedItem.id !== item.id) {
        let targetDirectoryPath: string;

        if (item.type === 'directory') {
          // ディレクトリにドロップした場合：そのディレクトリをターゲットに
          targetDirectoryPath = item.path;
        } else if (item.type === 'file') {
          // ファイルにドロップした場合：そのファイルの親ディレクトリをターゲットに
          const pathSeparator = item.path.includes('/') ? '/' : '\\';
          const pathParts = item.path.split(pathSeparator);
          pathParts.pop(); // ファイル名を除去

          if (pathParts.length === 0 || (pathParts.length === 1 && pathParts[0] === '')) {
            // ルートレベルのファイルの場合：プロジェクトルートをターゲットに
            targetDirectoryPath = projectRoot || '';
          } else {
            // サブディレクトリ内のファイルの場合：親ディレクトリをターゲットに
            targetDirectoryPath = pathParts.join(pathSeparator);
          }
        } else {
          setDraggedItem(null);
          return;
        }

        // 同じフォルダ内へのドロップは移動不要（「既に存在する」エラーになるため）
        if (getParentPath(draggedItem.path) === targetDirectoryPath) {
          setDraggedItem(null);
          return;
        }

        // ファイル/ディレクトリを目標ディレクトリに移動
        const { electronClient } = require('../services/electronClient');
        if (electronClient && electronClient.moveFile) {
          const result = await electronClient.moveFile(draggedItem.path, targetDirectoryPath);
          if (result.success && result.newPath) {
            onFileRenamed?.(draggedItem.path, result.newPath);
            await refreshFileTree({ from: draggedItem.path, to: result.newPath });
          } else {
            alert(`Failed to move: ${result.error}`);
          }
        }
      }
      setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  return (
      <div key={item.id}>
        <div
          className={`file-tree-item file-item ${item.type === 'file' && item.path === activeFilePath ? 'selected' : ''}`}
          onClick={handleItemClick}
          onContextMenu={handleContextMenu}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          style={{
            paddingLeft: `${depth * 16 + 8}px`,
          }}
        >
                    {item.type === 'directory' && (
            <FileTypeIcon
              type={getFolderIconType(item.isExpanded || false)}
              size={16}
              className="folder-icon"
            />
          )}
          {item.type === 'file' && (
            <FileTypeIcon
              type={getFileIconType(item.name)}
              size={16}
              className={`${getFileIconType(item.name)}-icon`}
            />
          )}
          {renamingItem === item.id ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameCancel}
              onKeyDown={handleRenameKeyDown}
              autoFocus
              className="file-rename-input"
            />
          ) : (
            <span className="file-name">{item.name}</span>
          )}
        </div>

        {/* 子要素の表示（ディレクトリが展開されている場合） */}
        {item.type === 'directory' && item.isExpanded && item.children && (
          <div>
            {item.children.map(child => renderFileItem(child, depth + 1))}
          </div>
      )}
    </div>
  );
};

  // ディレクトリの展開/折りたたみ状態を切り替え
  const toggleDirectory = (items: FileItem[], targetId: string): FileItem[] => {
    return items.map(item => {
      if (item.id === targetId && item.type === 'directory') {
        return { ...item, isExpanded: !item.isExpanded };
      }
      if (item.children) {
        return { ...item, children: toggleDirectory(item.children, targetId) };
          }
          return item;
    });
  };

  // コンテキストメニューの操作
  const handleRename = () => {
    if (contextMenu?.targetItem) {
      setRenamingItem(contextMenu.targetItem.id);
      setRenameValue(contextMenu.targetItem.name);
    }
    setContextMenu(null);
  };

  const handleRenameCancel = () => {
    setRenamingItem(null);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  const handleRenameConfirm = async () => {
    if (!renamingItem || !renameValue.trim()) {
      handleRenameCancel();
      return;
    }

    const targetItem = findItemById(files, renamingItem);
    const { electronClient } = require('../services/electronClient');
    if (!targetItem || !electronClient) {
      handleRenameCancel();
      return;
    }

    const newName = renameValue.trim();
    if (newName === targetItem.name) {
      handleRenameCancel();
      return;
    }
    if (/[\\/]/.test(newName) || newName === '.' || newName === '..') {
      alert(`Invalid name: ${newName}`);
      handleRenameCancel();
      return;
    }

    try {
      // 簡単なパス計算（クロスプラットフォーム対応）
      const pathSeparator = targetItem.path.includes('/') ? '/' : '\\';
      const pathParts = targetItem.path.split(pathSeparator);
      pathParts[pathParts.length - 1] = newName; // 最後の部分（ファイル名）を置き換え
      const newPath = pathParts.join(pathSeparator);

      const result = await electronClient.renameFile(targetItem.path, newPath);
      if (result.success) {
        // タブ同期コールバックを呼び出し
        onFileRenamed?.(targetItem.path, newPath);
        // ファイルツリーを更新（リネームしたフォルダの展開状態も引き継ぐ）
        await refreshFileTree({ from: targetItem.path, to: newPath });
        handleRenameCancel();
      } else {
        alert(`Failed to rename: ${result.error}`);
        handleRenameCancel();
      }
    } catch (error) {
      console.error('Rename error:', error);
      alert(`Rename failed: ${error}`);
      handleRenameCancel();
    }
  };

  // アイテムIDで検索するヘルパー関数
  const findItemById = (items: FileItem[], id: string): FileItem | null => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDelete = async () => {
    const { electronClient } = require('../services/electronClient');
    if (contextMenu?.targetItem && electronClient) {
      const confirmed = confirm(`Delete "${contextMenu.targetItem.name}"?`);
      if (confirmed) {
        const result = await electronClient.deleteFile(contextMenu.targetItem.path);
        if (result.success) {
          // タブ同期コールバックを呼び出し
          onFileDeleted?.(contextMenu.targetItem.path);
          await refreshFileTree();
          window.dispatchEvent(new Event('ERNST_FOCUS_EDITOR'));
        } else {
          alert(`Failed to delete: ${result.error}`);
        }
      }
    }
    setContextMenu(null);
  };

  // 展開状態を収集するヘルパー関数
  const collectExpandedPaths = (items: FileItem[]): Set<string> => {
    const expandedPaths = new Set<string>();

    const traverse = (items: FileItem[]) => {
      items.forEach(item => {
        if (item.type === 'directory' && item.isExpanded) {
          expandedPaths.add(item.path);
        }
        if (item.children) {
          traverse(item.children);
        }
      });
    };

    traverse(items);
    return expandedPaths;
  };

  // 新しいファイルツリーに展開状態を適用するヘルパー関数
  const applyExpandedState = (items: FileItem[], expandedPaths: Set<string>): FileItem[] => {
    return items.map(item => {
      if (item.type === 'directory') {
        const isExpanded = expandedPaths.has(item.path);
        return {
          ...item,
          isExpanded,
          children: item.children ? applyExpandedState(item.children, expandedPaths) : undefined
        };
      }
      return item;
    });
  };

  // ファイルツリーを再読み込み（展開状態を保持）
  // イベント経由でも呼ばれるため、クロージャではなく ref から最新の状態を読む
  const refreshFileTree = React.useCallback(async (renamed?: { from: string; to: string }) => {
    const root = projectRootRef.current;
    const { electronClient } = require('../services/electronClient');
    if (!root || !electronClient) return;

    const seq = ++refreshSeqRef.current;
    const result = await electronClient.refreshFolder(root);
    // 後発のリフレッシュが先に完了していたら古い結果で上書きしない
    if (!result || seq !== refreshSeqRef.current || root !== projectRootRef.current) return;

    // 取得完了時点の展開状態を使う（取得中にユーザーが開閉した分も反映する）
    const expandedPaths = collectExpandedPaths(filesRef.current);
    if (renamed) {
      Array.from(expandedPaths).forEach(p => {
        if (isSameOrInside(p, renamed.from)) {
          expandedPaths.delete(p);
          expandedPaths.add(renamed.to + p.slice(renamed.from.length));
        }
      });
    }
    setFiles(applyExpandedState(result.files, expandedPaths));
  }, []);

  // コンテキストメニューを閉じる
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // 保存などメインプロセス起点のリフレッシュ要求
  React.useEffect(() => {
    const handler = () => { refreshFileTree(); };
    window.addEventListener('ERNST_REFRESH_FILE_TREE', handler);
    return () => window.removeEventListener('ERNST_REFRESH_FILE_TREE', handler);
  }, [refreshFileTree]);

  return (
    <>
      <div className="file-explorer-main">
        {/* ヘッダー */}
        {!projectRoot && (
          <div className="file-explorer-open-overlay">
            <button
              onClick={openProjectFolder}
              className="file-explorer-open-button"
            >
              Open Folder
            </button>
          </div>
        )}

        {/* ファイルツリー */}
        <div className="file-explorer-tree"
        >
          {files.length === 0 && projectRoot ? (
            <div className="file-explorer-empty-message">
              No files found
            </div>
          ) : (
            files.map(item => renderFileItem(item))
          )}
        </div>

      </div>

      {/* コンテキストメニュー */}
      {contextMenu && (
        <div
          className="context-menu-overlay"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          <button
            onClick={handleRename}
            className="context-menu-button"
          >
            Rename
          </button>
          <button
            onClick={handleDelete}
            className="context-menu-button delete"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
};

export default FileExplorer;