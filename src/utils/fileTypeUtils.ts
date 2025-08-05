/**
 * ファイルタイプ判定ユーティリティ
 * ファイル名や拡張子からアイコンタイプを決定する
 */

export type FileIconType = 'folder' | 'folder-open' | 'glsl' | 'text' | 'javascript' | 'css' | 'html' | 'image' | 'audio' | 'video' | 'archive' | 'generic';

// GLSL関連の拡張子
const GLSL_EXTENSIONS = [
  'glsl', 'vert', 'frag', 'geom', 'tesc', 'tese', 'comp',
  'vs', 'fs', 'gs', 'cs', 'vertex', 'fragment', 'geometry',
  'glslinc' // ユーザー要求の独自拡張子
];

// JavaScript/TypeScript関連の拡張子
const JAVASCRIPT_EXTENSIONS = [
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'
];

// CSS関連の拡張子
const CSS_EXTENSIONS = [
  'css', 'scss', 'sass', 'less', 'stylus'
];

// HTML関連の拡張子
const HTML_EXTENSIONS = [
  'html', 'htm', 'xhtml', 'vue', 'svelte'
];

// 画像ファイルの拡張子
const IMAGE_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'bmp', 'webp', 'tiff', 'tga'
];

// 音声ファイルの拡張子
const AUDIO_EXTENSIONS = [
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'
];

// 動画ファイルの拡張子
const VIDEO_EXTENSIONS = [
  'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v'
];

// アーカイブファイルの拡張子
const ARCHIVE_EXTENSIONS = [
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'
];

// テキストファイルの拡張子
const TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'log', 'ini', 'conf', 'config',
  'json', 'xml', 'yaml', 'yml', 'toml', 'csv', 'readme'
];

/**
 * ファイル名から拡張子を取得
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
    return '';
  }
  return fileName.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * ファイル名からアイコンタイプを決定
 */
export function getFileIconType(fileName: string, isDirectory: boolean = false): FileIconType {
  // ディレクトリの場合
  if (isDirectory) {
    return 'folder';
  }

  const extension = getFileExtension(fileName);

  // GLSL関連ファイル
  if (GLSL_EXTENSIONS.includes(extension)) {
    return 'glsl';
  }

  // JavaScript/TypeScript関連ファイル
  if (JAVASCRIPT_EXTENSIONS.includes(extension)) {
    return 'javascript';
  }

  // CSS関連ファイル
  if (CSS_EXTENSIONS.includes(extension)) {
    return 'css';
  }

  // HTML関連ファイル
  if (HTML_EXTENSIONS.includes(extension)) {
    return 'html';
  }

  // 画像ファイル
  if (IMAGE_EXTENSIONS.includes(extension)) {
    return 'image';
  }

  // 音声ファイル
  if (AUDIO_EXTENSIONS.includes(extension)) {
    return 'audio';
  }

  // 動画ファイル
  if (VIDEO_EXTENSIONS.includes(extension)) {
    return 'video';
  }

  // アーカイブファイル
  if (ARCHIVE_EXTENSIONS.includes(extension)) {
    return 'archive';
  }

  // テキストファイル
  if (TEXT_EXTENSIONS.includes(extension)) {
    return 'text';
  }

  // その他のファイル
  return 'generic';
}

/**
 * 展開状態に応じたフォルダアイコンタイプを取得
 */
export function getFolderIconType(isExpanded: boolean): FileIconType {
  return isExpanded ? 'folder-open' : 'folder';
}

/**
 * ファイル名をより読みやすい形式にフォーマット
 */
export function formatFileName(fileName: string): string {
  // 非常に長いファイル名を短縮
  if (fileName.length > 25) {
    const extension = getFileExtension(fileName);
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const shortName = nameWithoutExt.substring(0, 20) + '...';
    return extension ? `${shortName}.${extension}` : shortName;
  }
  return fileName;
}

/**
 * ファイルサイズを人間が読みやすい形式にフォーマット
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}