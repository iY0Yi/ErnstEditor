import { ElectronAPI } from '../types';

function getAPI(): ElectronAPI | undefined {
  return (window as any)?.electronAPI as ElectronAPI | undefined;
}

export const electronClient = {
  // file
  openFile: async () => getAPI()?.openFile() ?? null,
  saveFile: async (filePath: string, content: string) => getAPI()?.saveFile(filePath, content) ?? { success: false, error: 'API unavailable' },
  saveFileAs: async (content: string) => getAPI()?.saveFileAs(content) ?? { success: false, error: 'API unavailable' },
  readFile: async (filePath: string) => getAPI()?.readFile(filePath) ?? null,
  renameFile: async (oldPath: string, newPath: string) => getAPI()?.renameFile(oldPath, newPath) ?? { success: false, error: 'API unavailable' },
  deleteFile: async (filePath: string) => getAPI()?.deleteFile(filePath) ?? { success: false, error: 'API unavailable' },
  moveFile: async (src: string, destDir: string) => getAPI()?.moveFile(src, destDir) ?? { success: false, error: 'API unavailable' },

  // folder
  openFolder: async () => getAPI()?.openFolder() ?? null,
  refreshFolder: async (folderPath: string) => getAPI()?.refreshFolder(folderPath) ?? null,

  // window
  minimizeWindow: async () => getAPI()?.minimizeWindow(),
  maximizeWindow: async () => getAPI()?.maximizeWindow(),
  closeWindow: async () => getAPI()?.closeWindow(),

  // theme/search
  loadTheme: async (themeName?: string) => getAPI()?.loadTheme(themeName) ?? null,
  searchInFiles: async (term: string, root?: string) => getAPI()?.searchInFiles(term, root) ?? [],

  // blender
  getBlenderConnectionStatus: async () => getAPI()?.getBlenderConnectionStatus(),
  onBlenderConnectionChange: (cb: (connected: boolean) => void) => getAPI()?.onBlenderConnectionChange(cb),
  removeBlenderConnectionListener: () => getAPI()?.removeBlenderConnectionListener(),
  forceStartBlenderServer: async () => getAPI()?.forceStartBlenderServer() ?? { success: false, error: 'API unavailable' },
  sendTestValueToBlender: async (v: number) => getAPI()?.sendTestValueToBlender(v) ?? { success: false, error: 'API unavailable' },

  // session
  saveSession: async (sessionData: any, trackPath: string) => getAPI()?.saveSession(sessionData, trackPath) ?? { success: false, error: 'API unavailable' },
  loadSession: async (trackPath: string) => getAPI()?.loadSession(trackPath) ?? { success: false, error: 'API unavailable' },
  sessionExists: async (trackPath: string) => getAPI()?.sessionExists(trackPath) ?? false,

  // misc
  notifyRendererReady: async () => getAPI()?.notifyRendererReady(),
  onFileOpenFromCLI: (cb: (data: { filePath: string; content: string; fileName: string; trackPath?: string | null; projectName?: string | null }) => void) => getAPI()?.onFileOpenFromCLI(cb),
  removeFileOpenFromCLIListener: () => getAPI()?.removeFileOpenFromCLIListener()
};


