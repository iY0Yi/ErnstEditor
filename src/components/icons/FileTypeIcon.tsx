import React from 'react';
import { MaterialIcon } from './MaterialIcons';

interface FileTypeIconProps {
  type: 'folder' | 'folder-open' | 'glsl' | 'text' | 'javascript' | 'css' | 'html' | 'image' | 'audio' | 'video' | 'archive' | 'generic';
  size?: number;
  className?: string;
}

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  type,
  size = 16,
  className = ''
}) => {
  const iconClassName = `file-icon ${className}`;

  // Material Iconsマッピング
  const iconMap: Record<string, string> = {
    'folder': 'folder',
    'folder-open': 'folder_open',
    'glsl': 'code',
    'text': 'description',
    'javascript': 'javascript',
    'css': 'css',
    'html': 'html',
    'image': 'image',
    'audio': 'audiotrack',
    'video': 'videocam',
    'archive': 'archive',
    'generic': 'insert_drive_file'
  };

  const iconName = iconMap[type] || iconMap['generic'];

  return (
    <MaterialIcon
      name={iconName}
      size={size}
      className={iconClassName}
    />
  );
};

export default FileTypeIcon;