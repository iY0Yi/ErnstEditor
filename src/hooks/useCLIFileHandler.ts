import { useEffect } from 'react';
import { FileTab } from '../types';
import { getLanguageFromFileName } from '../components/language';

interface UseCLIFileHandlerProps {
  addTab: (tab: FileTab) => void;
  setActiveTabId: (id: string) => void;
  onProjectRootChange?: (trackPath: string) => void;
}

export const useCLIFileHandler = ({ addTab, setActiveTabId, onProjectRootChange }: UseCLIFileHandlerProps) => {
  useEffect(() => {
    if (window.electronAPI?.onFileOpenFromCLI) {
      const handleFileOpenFromCLI = (data: { filePath: string; content: string; fileName: string; trackPath?: string | null }) => {
        console.log('Renderer: Opening file from command line:', data.fileName);
        console.log('Renderer: File path:', data.filePath);
        console.log('Renderer: Content length:', data.content.length);

        if (data.trackPath) {
          console.log('Renderer: Track directory found:', data.trackPath);
          console.log('Renderer: onProjectRootChange available:', !!onProjectRootChange);
        } else {
          console.log('⚠️ Renderer: No track directory provided');
        }

        // trackディレクトリをプロジェクトルートとして設定
        if (data.trackPath && onProjectRootChange) {
          console.log('Renderer: Calling onProjectRootChange with:', data.trackPath);
          try {
            onProjectRootChange(data.trackPath);
            console.log('✅ Renderer: onProjectRootChange called successfully');
          } catch (error) {
            console.error('❌ Renderer: Error calling onProjectRootChange:', error);
          }
        }

        // 新しいタブとして開く
        console.log('Renderer: Creating new tab...');

        // ファイル名から言語を推測
        const language = getLanguageFromFileName(data.fileName);
        console.log('🎨 Renderer: Detected language:', language, 'for file:', data.fileName);

        const newTab: FileTab = {
          id: `tab-${Date.now()}`,
          fileName: data.fileName,
          content: data.content,
          filePath: data.filePath,
          isModified: false,
          language: language, // 言語を設定
          model: null, // モデルはaddTab内で作成される
          viewState: null
        };

        try {
          console.log('Renderer: Adding tab...');
          addTab(newTab);
          console.log('Renderer: Setting active tab...');
          setActiveTabId(newTab.id);
          console.log('✅ Renderer: Tab created and set as active successfully');
        } catch (error) {
          console.error('❌ Renderer: Error creating tab:', error);
        }
      };

      window.electronAPI.onFileOpenFromCLI(handleFileOpenFromCLI);

      return () => {
        window.electronAPI.removeFileOpenFromCLIListener();
      };
    }
  }, [addTab, setActiveTabId, onProjectRootChange]);
};