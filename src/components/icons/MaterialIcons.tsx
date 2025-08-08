import React from 'react';

interface MaterialIconProps {
  name: string;
  size?: number;
  className?: string;
}

// Material Icons SVG データ（ストロークベース、24x24ベース）
const MATERIAL_ICONS = {
  // フォルダアイコン（閉じている）
  folder: (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  ),

  // フォルダアイコン（開いている）
  folder_open: (
    <>
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>
    </>
  ),

  // コードファイル（GLSL等）
  code: (
    <>
      <polyline points="16,18 22,12 16,6"/>
      <polyline points="8,6 2,12 8,18"/>
    </>
  ),

  // テキストファイル
  description: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10,9 9,9 8,9"/>
    </>
  ),

  // 汎用ファイル
  insert_drive_file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14,2 14,8 20,8"/>
    </>
  ),

  // JavaScript/TypeScript用
  javascript: (
    <>
      <polyline points="16,18 22,12 16,6"/>
      <polyline points="8,6 2,12 8,18"/>
    </>
  ),

  // CSS用
  css: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </>
  ),

  // HTML用
  html: (
    <>
      <polyline points="4,17 2,12 4,7"/>
      <polyline points="20,7 22,12 20,17"/>
      <line x1="10" y1="3" x2="8" y2="21"/>
      <line x1="16" y1="3" x2="14" y2="21"/>
    </>
  ),

  // 画像ファイル用
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </>
  ),

  // 音声ファイル用
  audiotrack: (
    <>
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </>
  ),

  // 動画ファイル用
  videocam: (
    <>
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </>
  ),

  // アーカイブファイル用
  archive: (
    <>
      <polyline points="21,8 21,21 3,21 3,8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </>
  ),

  // 検索アイコン
  search: (
    <>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </>
  ),

  // ローディングアイコン（回転する円）
  loading: (
    <>
      <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.49-8.49l2.83-2.83"/>
    </>
  ),
  // placeholders for link/link_off (rendered specially in component)
  link: (<g />),
  link_off: (<g />)
};

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 16,
  className = ''
}) => {
  const iconKey = name as keyof typeof MATERIAL_ICONS;
  const iconPath = MATERIAL_ICONS[iconKey];

  // Special-case filled Google Material icons that use a different viewBox
  if (iconKey === 'link' || iconKey === 'link_off') {
    const d = iconKey === 'link'
      ? 'M420-310H286q-70.55 0-120.27-49.82Q116-409.64 116-480.32t49.73-120.18Q215.45-650 286-650h134v46H286q-51 0-87.5 36.5T162-480q0 51 36.5 87.5T286-356h134v46Zm-76-148v-46h272v46H344Zm196 148v-46h134q51 0 87.5-36.5T798-480q0-51-36.5-87.5T674-604H540v-46h134q70.55 0 120.28 49.82Q844-550.36 844-479.68T794.28-359.5Q744.55-310 674-310H540Z'
      : 'm737-325-38-33q42.78-12.3 69.89-46.65Q796-439 796-480q0-51-36-87.5T674-604H536v-46h138q69.47 0 118.73 49.83Q842-550.34 842-479.78q0 50.37-29.5 90.57Q783-349 737-325ZM600-458l-46-46h58v46h-12ZM791-99 99-793l34-32 692 692-34 34ZM422-310H288q-70.47 0-120.23-49.77Q118-409.53 118-480q0-58.93 37.5-102.97Q193-627 260-648h24l41 44h-36q-52 0-88.5 36.5T164-480q0 51 36.5 87.5T288-356h134v46Zm-74-148v-46h71l45 46H348Z';
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 -960 960 960"
        fill="currentColor"
        className={`material-icon ${className}`}
      >
        <path d={d} />
      </svg>
    );
  }

  if (!iconPath) {
    console.warn(`Material Icon "${name}" not found`);
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`material-icon ${className}`}
    >
      {iconPath}
    </svg>
  );
};

export default MaterialIcon;