import { useState, useEffect } from 'react';

type ConnectionStatus = 'connected' | 'disconnected' | 'error';

export const useBlenderConnection = () => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  useEffect(() => {
    if (!window.electronAPI) return;

    // 初期状態を設定
    window.electronAPI.getBlenderConnectionStatus().then((status) => {
      setConnectionStatus(status.isBlenderConnected ? 'connected' : 'disconnected');
      console.log('🔍 Blender connection status initialized:', status);
    }).catch((error) => {
      console.error('Failed to get Blender connection status:', error);
      setConnectionStatus('error');
    });

    // 接続状態変更を監視
    window.electronAPI.onBlenderConnectionChange((connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      console.log('🔌 Blender connection status changed:', connected ? 'Connected' : 'Disconnected');
    });

    return () => {
      window.electronAPI.removeBlenderConnectionListener();
    };
  }, []);

  return {
    connectionStatus
  };
};