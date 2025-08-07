/**
 * Blender 通信用カスタムフック
 * blenderUtils の React フック版ラッパー
 */

import { useCallback } from 'react';
import { sendValueToBlender, checkBlenderConnection } from '../../../../utils/blenderUtils';

/**
 * Blender 通信機能を提供するフック
 * @deprecated 新しいコードでは blenderUtils を直接使用してください
 */
export function useBlenderCommunication() {
  /**
   * Blender に uniform 値を送信
   */
  const sendValueToBlenderHook = useCallback(async (value: number): Promise<boolean> => {
    return await sendValueToBlender(value);
  }, []);

  /**
   * Blender の接続状態を確認
   */
  const checkBlenderConnectionHook = useCallback(async (): Promise<boolean> => {
    return await checkBlenderConnection();
  }, []);

  return {
    sendValueToBlender: sendValueToBlenderHook,
    checkBlenderConnection: checkBlenderConnectionHook
  };
}
