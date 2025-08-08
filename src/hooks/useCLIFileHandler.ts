import { useEffect } from 'react';
import { electronClient } from '../services/electronClient';

interface UseCLIFileHandlerProps {
  onProjectRootChange?: (trackPath: string | null) => void;
  onProjectNameChange?: (projectName: string) => void;
  onPendingFile?: (fileData: { filePath: string; content: string; fileName: string }) => void;
}

export const useCLIFileHandler = ({ onProjectRootChange, onProjectNameChange, onPendingFile }: UseCLIFileHandlerProps) => {
  useEffect(() => {
    if (electronClient.onFileOpenFromCLI) {
      const handleFileOpenFromCLI = (data: { filePath: string; content: string; fileName: string; trackPath?: string | null; projectName?: string | null }) => {

        // Step 4: trackディレクトリを設定
        if (data.trackPath && onProjectRootChange) {
          onProjectRootChange(data.trackPath);
        }

        // プロジェクト名を設定（多重タイマーは廃止）
        if (data.projectName && onProjectNameChange) {
          console.log('🏷️ Setting project name:', data.projectName);
          onProjectNameChange(data.projectName);
        }

        // Step 6準備: ファイルパスがある場合はpendingFileとして保存
        if (data.filePath && data.filePath.trim() !== '' && onPendingFile) {
          onPendingFile({
            filePath: data.filePath,
            content: data.content,
            fileName: data.fileName
          });
        }
      };

      electronClient.onFileOpenFromCLI(handleFileOpenFromCLI);

      return () => {
        electronClient.removeFileOpenFromCLIListener?.();
      };
    }
  }, [onProjectRootChange, onProjectNameChange, onPendingFile]);
};