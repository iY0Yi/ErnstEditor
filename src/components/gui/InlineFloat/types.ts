import * as monaco from 'monaco-editor';

/**
 * インラインスライダーの設定
 */
export interface InlineFloatConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/**
 * インラインスライダーの状態
 */
export interface InlineFloatState {
  isActive: boolean;
  currentValue: number;
  originalValue: number;
  position: monaco.IPosition;
  range: monaco.IRange;
}

/**
 * マーカー情報
 */
export interface FloatMarker {
  id: string;
  position: monaco.IPosition;
  range: monaco.IRange;
  originalValue: number;
  currentValue: number;
  originalText?: string; // 元の文字列形式（-1.0f など）
  precedingOperator?: string; // 直前の演算子（+, -, *, /など）
  markerId?: string; // Monaco Editorのマーカー ID
}

/**
 * スライダーの位置情報
 */
export interface SliderPosition {
  top: number;
  left: number;
  width: number;
}

/**
 * 浮動小数点数の検出結果
 */
export interface FloatMatch {
  value: number;
  range: monaco.IRange;
  text: string;
  precedingOperator?: string; // 直前の演算子（+, -, *, /など）
}

/**
 * インラインスライダーのイベント
 */
export interface InlineFloatEvents {
  onValueChange?: (value: number) => void;
  onConfirm?: (finalValue: number) => void;
  onCancel?: (originalValue: number) => void;
  onActivate?: (marker: FloatMarker) => void;
  onDeactivate?: (marker: FloatMarker) => void;
}

/**
 * Monaco Editor Widget インターフェース
 */
export interface IInlineFloatWidget extends monaco.editor.IContentWidget {
  getId(): string;
  getDomNode(): HTMLElement;
  getPosition(): monaco.editor.IContentWidgetPosition | null;
  dispose(): void;

  // カスタムメソッド
  show(marker: FloatMarker): void;
  hide(): void;
  updateValue(value: number): void;
  isVisible(): boolean;
}