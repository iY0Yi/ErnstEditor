import { useState, useEffect } from 'react';
import { electronClient } from '../services/electronClient';

type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export const useBlenderConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!electronClient) return;

    // 初期状態を設定
    electronClient.getBlenderConnectionStatus()?.then((status) => {
      if (status) setConnectionStatus(status.isBlenderConnected ? 'connected' : 'disconnected');
    }).catch((error) => {
      console.error('Failed to get Blender connection status:', error);
      setConnectionStatus('error');
    });

    // 接続状態変更を監視
    electronClient.onBlenderConnectionChange?.((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      console.log('🔗Blender connection status changed:', connected ? 'Connected' : 'Disconnected');
    });

    return () => {
      electronClient.removeBlenderConnectionListener?.();
    };
  }, []);

  return {
    connectionStatus
  };
};