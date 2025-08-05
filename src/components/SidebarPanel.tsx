import React from 'react';
import FileExplorer from './FileExplorer';
import SearchPanel from './SearchPanel';
import { MaterialIcon } from './icons/MaterialIcons';

type PanelType = 'files' | 'search';

interface SidebarPanelProps {
  onFileSelect: (filePath: string, fileName: string, content: string) => void;
  activeFilePath: string | null;
  onSearchResult: (filePath: string, line: number, column: number) => void;
  onProjectRootChange?: (projectRoot: string | null) => void;
  onRefreshFileTreeCallback?: (callback: () => void) => void;
  onFileRenamed?: (oldPath: string, newPath: string) => void;
  onFileDeleted?: (filePath: string) => void;
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  onFileSelect,
  activeFilePath,
  onSearchResult,
  onProjectRootChange,
  onRefreshFileTreeCallback,
  onFileRenamed,
  onFileDeleted
}) => {
  const [activePanel, setActivePanel] = React.useState<PanelType>('files');
  const [projectRoot, setProjectRoot] = React.useState<string | null>(null);

    // projectRootを更新するハンドラー
  const handleProjectRootChange = React.useCallback((root: string | null) => {
    setProjectRoot(root);
    onProjectRootChange?.(root);
  }, [onProjectRootChange]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--theme-sidebar-background, #1e1e1e)',
      borderRight: `1px solid var(--theme-ui-background-dark, #000000)`
    }}>
                  {/* タブヘッダー（アイコン表示） */}
      <div style={{
        display: 'flex',
        background: 'var(--theme-sidebar-background, #1e1e1e)',
        minHeight: '35px'
      }}>
        <button
          onClick={() => setActivePanel('files')}
          style={{
            flex: 1,
            height: '35px',
            background: activePanel === 'files'
              ? 'var(--theme-ui-background-bright, #2d2d2d)'
              : 'transparent',
            border: 'none',
            color: activePanel === 'files'
              ? 'var(--theme-ui-foreground-bright, #ffffff)'
              : 'var(--theme-sidebar-foreground, #cccccc)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (activePanel !== 'files') {
              e.currentTarget.style.background = 'var(--theme-ui-background-bright, #2a2a2a)';
            }
          }}
          onMouseLeave={(e) => {
            if (activePanel !== 'files') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Files"
        >
          <MaterialIcon name="folder" size={16} />
        </button>
        <button
          onClick={() => setActivePanel('search')}
          style={{
            flex: 1,
            height: '35px',
            background: activePanel === 'search'
              ? 'var(--theme-ui-background-bright, #2d2d2d)'
              : 'transparent',
            border: 'none',
            color: activePanel === 'search'
              ? 'var(--theme-ui-foreground-bright, #ffffff)'
              : 'var(--theme-sidebar-foreground, #cccccc)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (activePanel !== 'search') {
              e.currentTarget.style.background = 'var(--theme-ui-background-bright, #2a2a2a)';
            }
          }}
          onMouseLeave={(e) => {
            if (activePanel !== 'search') {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          title="Search"
        >
          <MaterialIcon name="search" size={16} />
        </button>
      </div>

      {/* パネルコンテンツ */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* FileExplorer - 状態保持のため常にレンダリング */}
        <div style={{
          display: activePanel === 'files' ? 'block' : 'none',
          height: '100%'
        }}>
                      <FileExplorer
              onFileSelect={onFileSelect}
              activeFilePath={activeFilePath}
              onProjectRootChange={handleProjectRootChange}
              onRefreshFileTreeCallback={onRefreshFileTreeCallback}
              onFileRenamed={onFileRenamed}
              onFileDeleted={onFileDeleted}
            />
        </div>

        {/* SearchPanel - 状態保持のため常にレンダリング */}
        <div style={{
          display: activePanel === 'search' ? 'block' : 'none',
          height: '100%'
        }}>
          <SearchPanel
            onSearchResult={onSearchResult}
            projectRoot={projectRoot}
          />
        </div>
      </div>
    </div>
  );
};

export default SidebarPanel;