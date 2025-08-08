import React from 'react';
import { FileTab } from '../types';
import MaterialIcon from './icons/MaterialIcons';

interface HeaderProps {
  activeTab: FileTab;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
  connectionStatus?: 'connected' | 'disconnected' | 'error';
  projectName?: string;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveFileAs,
  connectionStatus = 'disconnected',
  projectName = ''
}) => {
  // ウィンドウコントロール関数
  const handleMinimize = () => {
    const { electronClient } = require('../services/electronClient');
    if (electronClient) {
      electronClient.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    const { electronClient } = require('../services/electronClient');
    if (electronClient) {
      electronClient.maximizeWindow();
    }
  };

  const handleClose = () => {
    const { electronClient } = require('../services/electronClient');
    if (electronClient) {
      electronClient.closeWindow();
    }
  };

  // 接続ステータスのテキストとアイコン（Material Icons）
  const getConnectionInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Connected', icon: 'link' as const };
      case 'error':
        return { text: 'Connection Error', icon: 'link_off' as const };
      default:
        return { text: 'Disconnected', icon: 'link_off' as const };
    }
  };

  const connectionInfo = getConnectionInfo();

  return (
    <div className="header">
      {/* Left Section: Empty for now */}
      <div className="header-left">
      </div>

      {/* Center Section: Project Name Only */}
      <div className="header-center">
        <div className="project-info">
          <span className="project-name">{projectName}</span>
        </div>
      </div>

      {/* Right Section: Connection Status + Window Controls */}
      <div className="header-right">
        {/* Connection Status */}
        <div className={`connection-status ${connectionStatus}`} title={connectionInfo.text}>
          <div className="connection-indicator-icon">
            <MaterialIcon name={connectionInfo.icon} size={21} />
          </div>
        </div>

        {/* Window Controls */}
        <div className="window-controls">
          <button className="window-control minimize" onClick={handleMinimize}>
            ─
          </button>
          <button className="window-control maximize" onClick={handleMaximize}>
            ☐
          </button>
          <button className="window-control close" onClick={handleClose}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;