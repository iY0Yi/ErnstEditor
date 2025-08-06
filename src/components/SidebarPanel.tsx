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
  externalProjectRoot?: string | null; // 外部からプロジェクトルートを設定
}

const SidebarPanel: React.FC<SidebarPanelProps> = ({
  onFileSelect,
  activeFilePath,
  onSearchResult,
  onProjectRootChange,
  onRefreshFileTreeCallback,
  onFileRenamed,
  onFileDeleted,
  externalProjectRoot
}) => {
  const [activePanel, setActivePanel] = React.useState<PanelType>('files');
  const [projectRoot, setProjectRoot] = React.useState<string | null>(null);

  // 外部からのプロジェクトルート設定を処理
  React.useEffect(() => {
    if (externalProjectRoot && externalProjectRoot !== projectRoot) {
      console.log('📁 SidebarPanel: Setting external project root:', externalProjectRoot);
      setProjectRoot(externalProjectRoot);
      onProjectRootChange?.(externalProjectRoot);
    }
  }, [externalProjectRoot, projectRoot, onProjectRootChange]);

    // projectRootを更新するハンドラー
  const handleProjectRootChange = React.useCallback((root: string | null) => {
    setProjectRoot(root);
    onProjectRootChange?.(root);
  }, [onProjectRootChange]);

  return (
    <div className="sidebar-panel">
                  {/* タブヘッダー（アイコン表示） */}
      <div className="sidebar-tab-header">
        <button
          onClick={() => setActivePanel('files')}
          className={`sidebar-tab-button ${activePanel === 'files' ? 'active' : ''}`}
          title="Files"
        >
          <MaterialIcon name="folder" size={16} />
        </button>
        <button
          onClick={() => setActivePanel('search')}
          className={`sidebar-tab-button ${activePanel === 'search' ? 'active' : ''}`}
          title="Search"
        >
          <MaterialIcon name="search" size={16} />
        </button>
      </div>

      {/* パネルコンテンツ */}
      <div className="sidebar-panel-content">
        {/* FileExplorer - 状態保持のため常にレンダリング */}
        <div className={`sidebar-panel-item ${activePanel !== 'files' ? 'hidden' : ''}`}>
                      <FileExplorer
              onFileSelect={onFileSelect}
              activeFilePath={activeFilePath}
              onProjectRootChange={handleProjectRootChange}
              onRefreshFileTreeCallback={onRefreshFileTreeCallback}
              onFileRenamed={onFileRenamed}
              onFileDeleted={onFileDeleted}
              externalProjectRoot={projectRoot}
            />
        </div>

        {/* SearchPanel - 状態保持のため常にレンダリング */}
        <div className={`sidebar-panel-item ${activePanel !== 'search' ? 'hidden' : ''}`}>
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