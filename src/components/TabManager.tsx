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
    <div className="tab-bar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => onDragStart(e, tab.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, tab.id)}
            onDragEnd={onDragEnd}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''} ${draggedTabId === tab.id ? 'dragging' : ''}`}
            onClick={() => onTabSelect(tab.id)}
          >
            <span className="tab-filename">
              {tab.fileName}{tab.isModified ? ' •' : ''}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="tab-close-button"
            >
              ×
            </button>
          </div>
        ))}
    </div>
  );
};

export default TabManager;