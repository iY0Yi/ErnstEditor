import { useState, useCallback } from 'react';

export const useProjectManager = () => {
  const [projectName, setProjectName] = useState<string>('');
  const [refreshFileTreeCallback, setRefreshFileTreeCallback] = useState<(() => void) | null>(null);

  // プロジェクトルート変更ハンドラー
  const handleProjectRootChange = useCallback((root: string | null) => {
    console.log('📁 ProjectManager: handleProjectRootChange called with:', root);

    if (root) {
      // ルートフォルダ名を抽出してプロジェクト名として設定
      const folderName = root.split(/[/\\]/).pop() || '';
      console.log('📁 ProjectManager: Setting project name to:', folderName);
      setProjectName(folderName);
      console.log('✅ ProjectManager: Project name set successfully');
    } else {
      console.log('📁 ProjectManager: Clearing project name');
      setProjectName('');
    }
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
    handleFileRenamed,
    handleFileDeleted
  };
};