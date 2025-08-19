export const IPC = {
  // File operations
  FILE_OPEN: 'file:open',
  FILE_SAVE: 'file:save',
  FILE_SAVE_AS: 'file:saveAs',
  FILE_READ: 'file:read',
  FILE_RENAME: 'file:rename',
  FILE_DELETE: 'file:delete',
  FILE_MOVE: 'file:move',

  // Folder operations
  FOLDER_OPEN: 'folder:open',
  FOLDER_REFRESH: 'folder:refresh',

  // Window controls
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Theme
  THEME_LOAD: 'theme:load',

  // Search
  SEARCH_FILES: 'search:files',

  // CLI file open
  FILE_OPEN_FROM_CLI: 'file:open-from-cli',

  // Blender
  BLENDER_GET_CONNECTION_STATUS: 'blender:get-connection-status',
  BLENDER_CONNECTION_CHANGED: 'blender:connection-changed',
  BLENDER_FORCE_START_SERVER: 'blender:force-start-server',
  BLENDER_SEND_TEST_VALUE: 'blender:send-test-value',

  // Renderer ready
  RENDERER_READY: 'renderer:ready',

  // Session
  SESSION_SAVE: 'session:save',
  SESSION_LOAD: 'session:load',
  SESSION_EXISTS: 'session:exists',

  // App actions (from main → renderer)
  APP_ACTION: 'app:action'
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];


