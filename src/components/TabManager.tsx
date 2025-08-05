import React from 'react';
import { FileTab } from '../types';

interface TabManagerProps {
  tabs: FileTab[];
  activeTabId: string;
  draggedTabId: string | null;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onDragStart: (e: React.DragEvent, tabId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetTabId: string) => void;
  onDragEnd: () => void;
}

const TabManager: React.FC<TabManagerProps> = ({
  tabs,
  activeTabId,
  draggedTabId,
  onTabSelect,
  onTabClose,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  return (
    <>
      {/* タブバーのスクロールバー非表示CSS */}
      <style>{`
        .tab-bar::-webkit-scrollbar {
          display: none;
        }
        .tab-bar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

      <div
        className="tab-bar"
        style={{
          background: 'var(--theme-tabs-background, #1e1e1e)',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          minHeight: '35px'
        }}
      >
        {tabs.map(tab => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => onDragStart(e, tab.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, tab.id)}
            onDragEnd={onDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: tab.id === activeTabId
                ? 'var(--theme-tabs-active-background, #2d2d2d)'
                : 'var(--theme-tabs-background, #1e1e1e)',
              padding: '8px 12px',
              cursor: draggedTabId === tab.id ? 'grabbing' : 'pointer',
              fontSize: '13px',
              color: tab.id === activeTabId
                ? 'var(--theme-tabs-active-foreground, #cccccc)'
                : 'var(--theme-tabs-foreground, #666666)',
              minWidth: '120px',
              position: 'relative',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              opacity: draggedTabId === tab.id ? 0.5 : 1,
              transition: 'opacity 0.2s ease'
            }}
            onClick={() => onTabSelect(tab.id)}
          >
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {tab.fileName}{tab.isModified ? ' •' : ''}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '16px',
                marginLeft: '8px',
                padding: '0',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#fff'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#999'}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default TabManager;