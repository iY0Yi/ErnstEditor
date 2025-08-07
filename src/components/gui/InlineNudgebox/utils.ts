/**
 * Inline Nudgebox ユーティリティ関数集
 */

import * as monaco from 'monaco-editor';
import { FloatDetector } from '../InlineFloat/markerUtils';
import { FloatMatch, ArrowKeyStepConfig, ZoomSyncConfig } from './types';

/**
 * デフォルト設定
 */
export const DEFAULT_ARROW_KEY_CONFIG: ArrowKeyStepConfig = {
  defaultStep: 0.1,
  shiftMultiplier: 10,
  ctrlMultiplier: 0.1
};

export const DEFAULT_ZOOM_SYNC_CONFIG: ZoomSyncConfig = {
  fontSizeMultiplier: 1.0,
  lineHeightMultiplier: 1.4,
  paddingMultiplier: 0.3,
  minWidth: 60
};

/**
 * Monaco Editorの実際のフォントメトリクスを使用してテキスト幅を計算
 */
export function calculateTextWidth(
  text: string,
  editor: monaco.editor.IStandaloneCodeEditor
): number {
  const fontSize = editor.getOption(monaco.editor.EditorOption.fontSize);
  const fontFamily = editor.getOption(monaco.editor.EditorOption.fontFamily);

  // Canvas を使って実際のテキスト幅を測定
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = `${fontSize}px ${fontFamily}`;

  const width = context.measureText(text).width;
  canvas.remove(); // メモリリーク防止

  return width;
}

/**
 * 浮動小数点数値を指定された位置または選択範囲から検出
 */
export function detectFloatAtPositionOrSelection(
  model: monaco.editor.ITextModel,
  position: monaco.IPosition,
  selection: monaco.ISelection | null
): FloatMatch | null {
  // 選択範囲がある場合は選択範囲内の数値を優先
  if (selection && !isSelectionEmpty(selection)) {
    // ISelection を IRange に変換
    const range: monaco.IRange = {
      startLineNumber: selection.selectionStartLineNumber,
      startColumn: selection.selectionStartColumn,
      endLineNumber: selection.positionLineNumber,
      endColumn: selection.positionColumn
    };
    const selectedText = model.getValueInRange(range);
    const floatValue = parseFloat(selectedText);
    if (!isNaN(floatValue)) {
      return {
        value: floatValue,
        range: range,
        text: selectedText
      };
    }
  }

  // カーソル位置の数値を検出
  return FloatDetector.detectFloatAtPosition(model, position);
}

/**
 * 選択範囲が空かどうかを判定
 */
function isSelectionEmpty(selection: monaco.ISelection): boolean {
  return selection.selectionStartLineNumber === selection.positionLineNumber &&
         selection.selectionStartColumn === selection.positionColumn;
}

/**
 * 矢印キーによる値の調整を計算
 */
export function calculateArrowKeyStep(
  event: KeyboardEvent,
  config: ArrowKeyStepConfig = DEFAULT_ARROW_KEY_CONFIG
): number {
  let step = config.defaultStep;

  if (event.shiftKey) {
    step *= config.shiftMultiplier;
  } else if (event.ctrlKey) {
    step *= config.ctrlMultiplier;
  }

  return event.key === 'ArrowUp' ? step : -step;
}

/**
 * 数値の精度を決定（小数点以下の桁数）
 */
export function getDecimalPlaces(value: number): number {
  const str = value.toString();
  const dotIndex = str.indexOf('.');
  return dotIndex === -1 ? 0 : str.length - dotIndex - 1;
}

/**
 * テキストを完全にカバーするための位置調整を計算
 */
export function calculatePositionAdjustment(
  editor: monaco.editor.IStandaloneCodeEditor,
  config: ZoomSyncConfig = DEFAULT_ZOOM_SYNC_CONFIG
): { translateY: number; zIndex: number } {
  const fontSize = editor.getOption(monaco.editor.EditorOption.fontSize);
  let lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
  lineHeight *= 2.0; // ユーザー設定の調整

  return {
    translateY: lineHeight,
    zIndex: 1000
  };
}

/**
 * ズームレベルに応じたサイズ設定を計算
 */
export function calculateZoomAdjustedSizes(
  editor: monaco.editor.IStandaloneCodeEditor,
  placeholderText: string = 'u_inline1f',
  config: ZoomSyncConfig = DEFAULT_ZOOM_SYNC_CONFIG
): {
  fontSize: number;
  lineHeight: number;
  width: number;
  height: number;
  padding: number;
} {
  const fontSize = editor.getOption(monaco.editor.EditorOption.fontSize);
  const lineHeight = fontSize * config.lineHeightMultiplier;

  // プレースホルダーテキストの幅を測定
  const textWidth = calculateTextWidth(placeholderText, editor);
  const padding = fontSize * config.paddingMultiplier;
  const width = Math.max(textWidth + padding, config.minWidth);

  return {
    fontSize,
    lineHeight,
    width,
    height: lineHeight,
    padding: 0 // 現在の実装ではパディングは 0
  };
}

/**
 * Monaco Range を作成するヘルパー関数
 */
export function createRange(
  startLineNumber: number,
  startColumn: number,
  endLineNumber: number,
  endColumn: number
): monaco.Range {
  return new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn);
}

/**
 * uniform 名前の定数
 */
export const UNIFORM_NAME = 'u_inline1f';

/**
 * IPC チャンネル名の定数
 */
export const IPC_CHANNELS = {
  SEND_UNIFORM_VALUE: 'send-uniform-value',
  GET_BLENDER_STATUS: 'get-blender-status'
} as const;
