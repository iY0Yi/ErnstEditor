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
  onRefreshFileTreeCallback?: (callback: () => void) => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (filePath: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ onFileSelect, activeFilePath, onProjectRootChange, onRefreshFileTreeCallback, onFileRenamed, onFileDeleted }) => {
  const [files, setFiles] = React.useState<FileItem[]>([]);
  const [contextMenu, setContextMenu] = React.useState<ContextMenuPosition | null>(null);
  const [draggedItem, setDraggedItem] = React.useState<FileItem | null>(null);
  const [projectRoot, setProjectRoot] = React.useState<string | null>(null);
  const [renamingItem, setRenamingItem] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState<string>('');

  // プロジェクトルートを開く
  const openProjectFolder = async () => {
    if (window.electronAPI && 'openFolder' in window.electronAPI) {
      const result = await (window.electronAPI as any).openFolder();
      if (result) {
        setFiles(result.files);
        setProjectRoot(result.rootPath);
        onProjectRootChange?.(result.rootPath);
      }
    }
  };

  // ファイルツリーアイテムのレンダリング
  const renderFileItem = (item: FileItem, depth: number = 0): React.ReactNode => {
    const handleItemClick = async () => {
      if (item.type === 'file') {
        // ファイルの内容を読み込んでタブで開く
        if (window.electronAPI && 'readFile' in window.electronAPI) {
          const content = await (window.electronAPI as any).readFile(item.path);
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

        // ファイル/ディレクトリを目標ディレクトリに移動
        if (window.electronAPI && 'moveFile' in window.electronAPI) {
          const result = await (window.electronAPI as any).moveFile(draggedItem.path, targetDirectoryPath);
          if (result.success) {
            // ファイルツリーを更新
            await refreshFileTree();
          } else {
            alert(`Failed to move: ${result.error}`);
          }
        }
      }
      setDraggedItem(null);
  };

  return (
      <div key={item.id}>
        <div
          className={`file-tree-item ${item.type === 'file' && item.path === activeFilePath ? 'selected' : ''}`}
          onClick={handleItemClick}
          onContextMenu={handleContextMenu}
          draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
              style={{
                background: 'var(--theme-input-background)',
                color: 'var(--theme-input-foreground)',
                border: '1px solid var(--theme-ui-background-dark)',
                borderRadius: '2px',
                padding: '2px 4px',
                fontSize: '12px',
                width: '100%',
                maxWidth: '200px'
              }}
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
    if (!targetItem || !window.electronAPI) {
      handleRenameCancel();
      return;
    }

    if (renameValue.trim() === targetItem.name) {
      handleRenameCancel();
      return;
    }

    try {
      // 簡単なパス計算（クロスプラットフォーム対応）
      const pathSeparator = targetItem.path.includes('/') ? '/' : '\\';
      const pathParts = targetItem.path.split(pathSeparator);
      pathParts[pathParts.length - 1] = renameValue.trim(); // 最後の部分（ファイル名）を置き換え
      const newPath = pathParts.join(pathSeparator);

      const result = await window.electronAPI.renameFile(targetItem.path, newPath);
      if (result.success) {
        // タブ同期コールバックを呼び出し
        onFileRenamed?.(targetItem.path, newPath);
        // ファイルツリーを更新
        await refreshFileTree();
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
    if (contextMenu?.targetItem && window.electronAPI) {
      const confirmed = confirm(`Delete "${contextMenu.targetItem.name}"?`);
      if (confirmed) {
        const result = await window.electronAPI.deleteFile(contextMenu.targetItem.path);
        if (result.success) {
          // タブ同期コールバックを呼び出し
          onFileDeleted?.(contextMenu.targetItem.path);
          // ファイルツリーを更新（簡易的にリフレッシュ）
          await refreshFileTree();
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
  const refreshFileTree = async () => {
    if (projectRoot && window.electronAPI) {
      // 現在の展開状態を保存
      const expandedPaths = collectExpandedPaths(files);

      const result = await window.electronAPI.refreshFolder(projectRoot);
      if (result) {
        // 新しいファイルツリーに展開状態を適用
        const filesWithExpandedState = applyExpandedState(result.files, expandedPaths);
        setFiles(filesWithExpandedState);
      }
    }
  };

  // refreshFileTree関数を親コンポーネントに登録
  React.useEffect(() => {
    if (onRefreshFileTreeCallback) {
      onRefreshFileTreeCallback(refreshFileTree);
    }
  }, [projectRoot, onRefreshFileTreeCallback]);

  // コンテキストメニューを閉じる
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      {/* スクロールバー非表示CSS */}
      <style>{`
        .file-explorer::-webkit-scrollbar {
          display: none;
        }
        .file-explorer {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

                        <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--theme-sidebar-background, #1e1e1e)',
                    borderRight: `1px solid var(--theme-sidebar-border, #404040)`,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
        {/* ヘッダー */}
        {!projectRoot && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            background: 'var(--theme-sidebar-background, #1e1e1e)',
            zIndex: 10
          }}>
            <button
              onClick={openProjectFolder}
              style={{
                background: 'var(--theme-sidebar-border, #404040)',
                border: `1px solid var(--theme-sidebar-border, #404040)`,
                color: 'var(--theme-sidebar-foreground, #cccccc)',
                padding: '8px 16px',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Open Folder
            </button>
          </div>
        )}

        {/* ファイルツリー */}
        <div
          className="file-explorer"
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '4px 0'
          }}
        >
          {files.length === 0 && projectRoot ? (
            <div style={{
              padding: '16px',
              color: '#888',
              fontSize: '12px',
              textAlign: 'center'
            }}>
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
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#2d2d2d',
            border: '1px solid #404040',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 1000,
            minWidth: '120px'
          }}
        >
          <button
            onClick={handleRename}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Rename
          </button>
          <button
            onClick={handleDelete}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#ff6b6b',
              padding: '8px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
};

export default FileExplorer;