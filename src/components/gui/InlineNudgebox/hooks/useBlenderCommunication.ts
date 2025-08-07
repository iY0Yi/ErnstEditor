/**
 * Blender 通信用カスタムフック
 */

import { useCallback } from 'react';

/**
 * Blender 通信機能を提供するフック
 */
export function useBlenderCommunication() {
  /**
   * Blender に uniform 値を送信
   */
  const sendValueToBlender = useCallback(async (value: number): Promise<boolean> => {
    try {
      // IPC経由でメインプロセスのblenderServiceを使用
      if (window.electronAPI && (window.electronAPI as any).sendTestValueToBlender) {
        const result = await (window.electronAPI as any).sendTestValueToBlender(value);
        if (!result.success) {
          console.error('❌ Blender communication: Failed to send via IPC:', result.error);
          return false;
        }
        return true;
      } else {
        console.error('❌ Blender communication: IPC API not available');
        return false;
      }
    } catch (error) {
      console.error('❌ Blender communication: Error sending value via IPC:', error);
      return false;
    }
  }, []);

  /**
   * Blender の接続状態を確認
   */
  const checkBlenderConnection = useCallback(async (): Promise<boolean> => {
    try {
      if (window.electronAPI && window.electronAPI.getBlenderStatus) {
        const status = await window.electronAPI.getBlenderStatus();
        return status.isBlenderConnected;
      }
      return false;
    } catch (error) {
      console.error('❌ Blender communication: Error checking connection:', error);
      return false;
    }
  }, []);

  return {
    sendValueToBlender,
    checkBlenderConnection
  };
}
