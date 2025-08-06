/**
 * インラインスライダーのCSSスタイル定義
 */

export const INLINE_FLOAT_STYLES = `
  /* インラインスライダーコンテナ */
  .ernst-inline-slider-container {
    position: absolute;
    z-index: 1000;
    background: var(--theme-ui-background-dark, #2d2d30);
    border: 1px solid var(--theme-ui-border, #3e3e42);
    border-radius: 4px;
    padding: 8px 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    font-family: var(--theme-font-family-ui, 'Mulish', sans-serif);
    font-size: 12px;
    color: var(--theme-ui-foreground, #cccccc);
    backdrop-filter: blur(6px);
    min-width: 160px;
    user-select: none;
    transition: opacity 0.15s ease-in-out;
  }

  .ernst-inline-slider-container:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  }

  /* スライダー本体 */
  .ernst-inline-slider {
    width: 120px;
    height: 4px;
    margin: 4px 0;
    appearance: none;
    background: var(--theme-ui-background-light, #3c3c3c);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .ernst-inline-slider:hover {
    background: var(--theme-ui-background-lighter, #454545);
  }

  .ernst-inline-slider:focus {
    box-shadow: 0 0 0 2px var(--theme-accent-color-alpha, rgba(0, 122, 204, 0.3));
  }

  /* WebKit スライダーサム */
  .ernst-inline-slider::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--theme-accent-color, #007acc);
    cursor: pointer;
    border: 2px solid var(--theme-ui-background-dark, #2d2d30);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .ernst-inline-slider::-webkit-slider-thumb:hover {
    background: var(--theme-accent-hover, #1177dd);
    transform: scale(1.1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  }

  .ernst-inline-slider::-webkit-slider-thumb:active {
    transform: scale(1.05);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  /* Firefox スライダーサム */
  .ernst-inline-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--theme-accent-color, #007acc);
    cursor: pointer;
    border: 2px solid var(--theme-ui-background-dark, #2d2d30);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
  }

  .ernst-inline-slider::-moz-range-thumb:hover {
    background: var(--theme-accent-hover, #1177dd);
    transform: scale(1.1);
  }

  /* Firefox スライダートラック */
  .ernst-inline-slider::-moz-range-track {
    height: 4px;
    background: var(--theme-ui-background-light, #3c3c3c);
    border-radius: 2px;
    border: none;
  }

  /* 値表示 */
  .ernst-value-display {
    display: block;
    text-align: center;
    font-weight: 600;
    margin-top: 6px;
    color: var(--theme-accent-color, #007acc);
    font-size: 11px;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  /* マーカー装飾 */
  .ernst-inline-float-marker {
    background: var(--theme-accent-color-alpha, rgba(0, 122, 204, 0.15));
    border: 1px solid var(--theme-accent-color, #007acc);
    border-radius: 2px;
    position: relative;
  }

  .ernst-inline-float-marker::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: var(--theme-accent-color-alpha, rgba(0, 122, 204, 0.1));
    border-radius: 3px;
    z-index: -1;
  }

  /* アニメーション */
  @keyframes ernst-slider-appear {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .ernst-inline-slider-container {
    animation: ernst-slider-appear 0.15s ease-out;
  }

  /* 一時マーカーテキスト（非表示） */
  .ernst-temp-marker-text {
    opacity: 0;
    font-size: 0;
    color: transparent;
    pointer-events: none;
  }

  /* ホバー効果 */
  .ernst-inline-slider-container:hover .ernst-value-display {
    color: var(--theme-accent-hover, #1177dd);
  }

  /* レスポンシブ調整 */
  @media (max-width: 768px) {
    .ernst-inline-slider-container {
      min-width: 140px;
      padding: 6px 10px;
      font-size: 11px;
    }

    .ernst-inline-slider {
      width: 100px;
    }

    .ernst-value-display {
      font-size: 10px;
    }
  }

  /* 高DPI対応 */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    .ernst-inline-slider::-webkit-slider-thumb {
      border-width: 1px;
    }

    .ernst-inline-slider::-moz-range-thumb {
      border-width: 1px;
    }
  }

  /* ダークモード特有の調整 */
  @media (prefers-color-scheme: dark) {
    .ernst-inline-slider-container {
      backdrop-filter: blur(8px);
    }

    .ernst-inline-float-marker {
      background: var(--theme-accent-color-alpha, rgba(0, 122, 204, 0.2));
    }
  }
`;

/**
 * スタイルをDOMに挿入
 */
export function injectInlineFloatStyles(): void {
  const existingStyle = document.getElementById('ernst-inline-float-styles');
  if (existingStyle) {
    return; // 既に挿入済み
  }

  const style = document.createElement('style');
  style.id = 'ernst-inline-float-styles';
  style.textContent = INLINE_FLOAT_STYLES;
  document.head.appendChild(style);
}

/**
 * スタイルをDOMから削除
 */
export function removeInlineFloatStyles(): void {
  const style = document.getElementById('ernst-inline-float-styles');
  if (style) {
    style.remove();
  }
}