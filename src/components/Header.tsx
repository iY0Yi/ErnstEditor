import React from 'react';
import { FileTab } from '../types';

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
    if (window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  // 接続ステータスのテキストとアイコン
  const getConnectionInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Connected', icon: '●' };
      case 'error':
        return { text: 'Connection Error', icon: '●' };
      default:
        return { text: 'Disconnected', icon: '●' };
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
        <div className={`connection-status ${connectionStatus}`}>
          <div className="connection-indicator-icon">
            {connectionInfo.icon}
          </div>
          <div className="connection-text">
            {connectionInfo.text}
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