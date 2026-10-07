/**
 * Inline Nudgebox ユーティリティ関数集
 */

import * as monaco from 'monaco-editor';
import { FloatDetector } from '../InlineFloat/markerUtils';
import { FloatMatch, ArrowKeyStepConfig } from './types';

/**
 * デフォルト設定
 */
export const DEFAULT_ARROW_KEY_CONFIG: ArrowKeyStepConfig = {
  defaultStep: 0.1,
  shiftMultiplier: 10,
  ctrlMultiplier: 0.1
};

const FLOAT_LITERAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fF]?$/;

/**
 * 浮動小数点数値を指定された位置または選択範囲から検出
 */
export function detectFloatAtPositionOrSelection(
  model: monaco.editor.ITextModel,
  position: monaco.IPosition,
  selection: monaco.ISelection | null
): FloatMatch | null {
  // 選択範囲がある場合は、選択全体が1つの数値リテラルのときだけ採用する
  // （parseFloat は "0.5 * x" も受理するため、置換で後続テキストが消える）
  if (selection && !isSelectionEmpty(selection)) {
    // 後方選択でも start <= end になるよう正規化
    const normalized = monaco.Selection.liftSelection(selection);
    if (normalized.startLineNumber === normalized.endLineNumber) {
      const range: monaco.IRange = {
        startLineNumber: normalized.startLineNumber,
        startColumn: normalized.startColumn,
        endLineNumber: normalized.endLineNumber,
        endColumn: normalized.endColumn
      };
      const selectedText = model.getValueInRange(range);
      if (FLOAT_LITERAL_PATTERN.test(selectedText)) {
        return {
          value: parseFloat(selectedText),
          range,
          text: selectedText
        };
      }
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
