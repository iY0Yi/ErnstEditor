/**
 * タブ作成ファクトリユーティリティ
 * FileTabオブジェクトの作成を一元化
 */

import { FileTab } from '../types';
import { generateId } from './idUtils';
import { getLanguageFromFileName } from '../components/language';
import { PathUtils } from './pathUtils';

/**
 * ファイル情報からFileTabを作成
 * @param filePath - ファイルパス
 * @param content - ファイル内容
 * @param fileName - ファイル名（省略時はfilePathから自動抽出）
 * @param isModified - 修正フラグ（デフォルト: false）
 * @returns 新しいFileTabオブジェクト
 */
export function createFileTab(
  filePath: string,
  content: string,
  fileName?: string,
  isModified: boolean = false
): FileTab {
  const actualFileName = fileName || PathUtils.getFileName(filePath);
  const language = getLanguageFromFileName(actualFileName);

  return {
    id: generateId(),
    fileName: actualFileName,
    filePath: filePath,
    content: content,
    language: language,
    isModified: isModified
  };
}

/**
 * ElectronAPIの結果からFileTabを作成
 * @param result - ElectronAPIのopenFile結果
 * @param isModified - 修正フラグ（デフォルト: false）
 * @returns 新しいFileTabオブジェクト
 */
export function createFileTabFromAPIResult(
  result: { filePath: string; content: string; fileName: string },
  isModified: boolean = false
): FileTab {
  return createFileTab(result.filePath, result.content, result.fileName, isModified);
}

/**
 * 新規ファイル用のFileTabを作成
 * @param fileName - ファイル名（デフォルト: 'untitled'）
 * @param content - 初期内容（デフォルト: 空文字）
 * @returns 新しいFileTabオブジェクト
 */
export function createNewFileTab(
  fileName: string = 'untitled',
  content: string = ''
): FileTab {
  const language = getLanguageFromFileName(fileName);

  return {
    id: generateId(),
    fileName: fileName,
    filePath: '', // 新規ファイルはパスなし
    content: content,
    language: language,
    isModified: true // 新規ファイルは未保存扱い
  };
}
