/**
 * Inline Nudgebox システムの型定義
 */

import * as monaco from 'monaco-editor';

/**
 * 浮動小数点数のマッチング結果
 */
export interface FloatMatch {
  /** 数値の値 */
  value: number;
  /** Monaco エディタでの範囲 */
  range: monaco.IRange;
  /** 元のテキスト */
  text: string;
  /** 前置演算子 (+, -, など) */
  precedingOperator?: string;
}

/**
 * Nudgebox ウィジェットのオプション
 */
export interface NudgeboxOptions {
  /** 初期値 */
  value: number;
  /** 確定時のコールバック */
  onConfirm: (value: number) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** リアルタイム値変更時のコールバック */
  onValueChange?: (value: number) => void;
  editor: monaco.editor.IStandaloneCodeEditor;
  /** エディタを作った側の Monaco の EditorOption（import した monaco-editor とは番号がずれるため） */
  editorOption: typeof monaco.editor.EditorOption;
}

/**
 * Nudgebox ウィジェットの位置情報
 */
export interface NudgeboxPosition {
  /** 行番号 */
  lineNumber: number;
  /** 列番号 */
  column: number;
}

/**
 * 矢印キーでの値調整設定
 */
export interface ArrowKeyStepConfig {
  /** デフォルトのステップ値 */
  defaultStep: number;
  /** Shift キーでの倍率 */
  shiftMultiplier: number;
  /** Ctrl キーでの倍率 */
  ctrlMultiplier: number;
}

/**
 * Blender 通信設定
 */
export interface BlenderCommunicationConfig {
  /** uniform 名 */
  uniformName: string;
  /** 初期値送信の有効化 */
  sendInitialValue: boolean;
  /** リアルタイム送信の有効化 */
  enableRealtimeSend: boolean;
}
