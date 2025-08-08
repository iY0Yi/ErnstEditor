/**
 * セッション保存サービス
 * .ernst フォルダとsession.jsonの読み書きを担当
 */

import { SessionData, SessionResult } from '../types/session';

/**
 * セッションファイルのパスを生成
 * @param trackPath - trackディレクトリのパス
 * @returns session.jsonのフルパス
 */
export function getSessionFilePath(trackPath: string): string {
  // trackと同階層に .ernst フォルダを作成
  const projectRoot = require('path').dirname(trackPath);
  const ernstDir = require('path').join(projectRoot, '.ernst');
  return require('path').join(ernstDir, 'session.json');
}

/**
 * .ernst ディレクトリを作成（存在しない場合）
 * @param trackPath - trackディレクトリのパス
 */
export function ensureErnstDirectory(trackPath: string): void {
  const projectRoot = require('path').dirname(trackPath);
  const ernstDir = require('path').join(projectRoot, '.ernst');

  const fs = require('fs');
  if (!fs.existsSync(ernstDir)) {
    fs.mkdirSync(ernstDir, { recursive: true });
    console.log('📁 Created .ernst directory:', ernstDir);
  }
}

/**
 * セッションデータを保存
 * @param sessionData - 保存するセッションデータ
 * @param trackPath - trackディレクトリのパス
 * @returns 保存結果
 */
export async function saveSession(sessionData: SessionData, trackPath: string): Promise<SessionResult> {
  try {
    // .ernst ディレクトリを確保
    ensureErnstDirectory(trackPath);

    // セッションファイルパスを取得
    const sessionFilePath = getSessionFilePath(trackPath);

    // 最終更新時刻を設定
    const dataWithTimestamp = {
      ...sessionData,
      lastModified: Date.now()
    };

    // JSONファイルとして保存
    const fs = require('fs');
    const jsonContent = JSON.stringify(dataWithTimestamp, null, 2);
    fs.writeFileSync(sessionFilePath, jsonContent, 'utf-8');

    console.log('💾 Session saved:', sessionFilePath);
    return { success: true, data: dataWithTimestamp };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to save session:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * セッションデータを読み込み
 * @param trackPath - trackディレクトリのパス
 * @returns 読み込み結果
 */
export async function loadSession(trackPath: string): Promise<SessionResult> {
  try {
    const sessionFilePath = getSessionFilePath(trackPath);

    const fs = require('fs');

    // ファイルが存在しない場合は成功扱い（空セッション）
    if (!fs.existsSync(sessionFilePath)) {
      console.log('📄 No session file found, starting fresh');
      return { success: true, data: null };
    }

    // JSONファイルを読み込み
    const jsonContent = fs.readFileSync(sessionFilePath, 'utf-8');
    const sessionData: SessionData = JSON.parse(jsonContent);

    console.log('📖 Session loaded:', sessionFilePath);
    return { success: true, data: sessionData };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to load session:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * セッションファイルが存在するかチェック
 * @param trackPath - trackディレクトリのパス
 * @returns ファイルの存在確認結果
 */
export function sessionExists(trackPath: string): boolean {
  const sessionFilePath = getSessionFilePath(trackPath);
  const fs = require('fs');
  return fs.existsSync(sessionFilePath);
}
