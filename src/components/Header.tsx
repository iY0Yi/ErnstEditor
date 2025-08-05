import React from 'react';
import { MenuState, FileTab } from '../types';

interface HeaderProps {
  activeTab: FileTab;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveFileAs: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveFileAs
}) => {
  const [menuState, setMenuState] = React.useState<MenuState>({
    fileMenuOpen: false
  });

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

  return (
    <div style={{
      background: 'var(--theme-header-background, #2d2d2d)',
      color: 'var(--theme-header-foreground, white)',
      padding: '0',
      borderBottom: `1px solid var(--theme-ui-background-dark, #000000)`,
      display: 'flex',
      fontSize: '13px',
      position: 'relative',
      WebkitAppRegion: 'drag' // ドラッグ可能な領域
    } as any}>
      {/* Fileメニュー */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuState(prev => ({ ...prev, fileMenuOpen: !prev.fileMenuOpen }))}
          onBlur={(e) => {
            setTimeout(() => {
              if (!e.currentTarget.contains(document.activeElement)) {
                setMenuState(prev => ({ ...prev, fileMenuOpen: false }));
              }
            }, 150);
          }}
          style={{
            background: menuState.fileMenuOpen ? 'var(--theme-sidebar-hover, #404040)' : 'transparent',
            border: 'none',
            color: 'var(--theme-header-foreground, white)',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: '13px',
            WebkitAppRegion: 'no-drag' // ボタンはドラッグ無効
          } as any}
        >
          File
        </button>

        {/* ドロップダウンメニュー */}
        {menuState.fileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            background: 'var(--theme-header-background, #2d2d2d)',
            border: `1px solid var(--theme-header-border, #404040)`,
            borderTop: 'none',
            minWidth: '180px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}>
            <button
              onClick={() => {
                onNewFile();
                setMenuState(prev => ({ ...prev, fileMenuOpen: false }));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px 16px',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#404040'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
            >
              <span>New</span>
              <span style={{ opacity: 0.6 }}>Ctrl+N</span>
            </button>

            <button
              onClick={() => {
                onOpenFile();
                setMenuState(prev => ({ ...prev, fileMenuOpen: false }));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px 16px',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#404040'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
            >
              <span>Open...</span>
              <span style={{ opacity: 0.6 }}>Ctrl+O</span>
            </button>

            <hr style={{
              margin: '4px 0',
              border: 'none',
              borderTop: '1px solid #404040'
            }} />

            <button
              onClick={() => {
                onSaveFile();
                setMenuState(prev => ({ ...prev, fileMenuOpen: false }));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px 16px',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#404040'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
            >
              <span>Save</span>
              <span style={{ opacity: 0.6 }}>Ctrl+S</span>
            </button>

            <button
              onClick={() => {
                onSaveFileAs();
                setMenuState(prev => ({ ...prev, fileMenuOpen: false }));
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                padding: '8px 16px',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#404040'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
            >
              Save As...
            </button>
          </div>
        )}
      </div>

      {/* ウィンドウコントロールボタン */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
        <button
          onClick={handleMinimize}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: '12px',
            WebkitAppRegion: 'no-drag'
          } as any}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ─
        </button>
        <button
          onClick={handleMaximize}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: '12px',
            WebkitAppRegion: 'no-drag'
          } as any}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#404040')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ☐
        </button>
        <button
          onClick={handleClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '8px 12px',
            fontSize: '12px',
            WebkitAppRegion: 'no-drag'
          } as any}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#ff5f5f')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default Header;