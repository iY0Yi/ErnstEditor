import { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';
import { PathUtils } from '../utils/pathUtils';

export const useProjectManager = () => {
  // 表示用の最終的なプロジェクト名
  const [projectName, setProjectName] = useState<string>('');
  // 直接指定されたプロジェクト名（CLI など）を保持
  const directNameRef = useRef<string>('');
  const [refreshFileTreeCallback, setRefreshFileTreeCallback] = useState<(() => void) | null>(null);

  // プロジェクトルート変更ハンドラー
  const handleProjectRootChange = useCallback((root: string | null) => {
    logger.debug('ProjectManager: handleProjectRootChange', { root });

    if (root) {
      // ルートフォルダ名（例: track）
      const folderName = PathUtils.getDirectoryName(root);
      logger.debug('ProjectManager: derived folder name', { folderName });
      // すでに direct 名が指定されている場合は上書きしない
      if (!directNameRef.current) {
        setProjectName(folderName);
      }
    } else {
      // ルートが外れたら direct もクリア
      directNameRef.current = '';
      setProjectName('');
    }
  }, []);

  // プロジェクト名を直接設定（CLI起動時用）
  const setProjectNameDirect = useCallback((name: string) => {
    logger.info('ProjectManager: set direct project name', { name });
    directNameRef.current = name || '';
    setProjectName(directNameRef.current);
  }, []);

  // ファイル操作とタブ同期のコールバック
  const handleFileRenamed = useCallback((oldPath: string, newPath: string, updateTabPath: (oldPath: string, newPath: string) => void) => {
    updateTabPath(oldPath, newPath);
  }, []);

  const handleFileDeleted = useCallback((filePath: string, closeTabByPath: (filePath: string) => void) => {
    closeTabByPath(filePath);
  }, []);

  return {
    projectName,
    refreshFileTreeCallback,
    setRefreshFileTreeCallback,
    handleProjectRootChange,
    setProjectNameDirect,
    handleFileRenamed,
    handleFileDeleted
  };
};