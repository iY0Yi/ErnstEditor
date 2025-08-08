/**
 * Blender 通信ユーティリティ
 * IPC経由でメインプロセスのblenderServiceとの通信を提供
 */

/**
 * Blender に uniform 値を送信
 * @param value - 送信する値
 * @returns 送信成功の場合 true
 */
export async function sendValueToBlender(value: number): Promise<boolean> {
  try {
    // IPC経由でメインプロセスのblenderServiceを使用
  const { electronClient } = require('../services/electronClient');
  if (electronClient && (electronClient as any).sendTestValueToBlender) {
    const result = await (electronClient as any).sendTestValueToBlender(value);
      if (!result.success) {
        console.error('❌ BlenderUtils: Failed to send via IPC:', result.error);
        return false;
      }
      return true;
    } else {
      console.error('❌ BlenderUtils: IPC API not available');
      return false;
    }
  } catch (error) {
    console.error('❌ BlenderUtils: Error sending value via IPC:', error);
    return false;
  }
}

/**
 * Blender の接続状態を確認
 * @returns 接続されている場合 true
 */
export async function checkBlenderConnection(): Promise<boolean> {
  try {
  const { electronClient } = require('../services/electronClient');
  if (electronClient && electronClient.getBlenderConnectionStatus) {
    const status = await electronClient.getBlenderConnectionStatus();
      return status.isBlenderConnected;
    }
    return false;
  } catch (error) {
    console.error('❌ BlenderUtils: Error checking connection:', error);
    return false;
  }
}

/**
 * Blender サーバーを強制起動
 * @returns 起動成功の場合 true
 */
export async function forceStartBlenderServer(): Promise<boolean> {
  try {
  const { electronClient } = require('../services/electronClient');
  if (electronClient && (electronClient as any).forceStartBlenderServer) {
    const result = await (electronClient as any).forceStartBlenderServer();
      return result.success;
    }
    return false;
  } catch (error) {
    console.error('❌ BlenderUtils: Error starting server:', error);
    return false;
  }
}
