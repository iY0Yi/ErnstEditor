/**
 * Inline Nudgebox (Float) システム - メインエクスポート
 *
 * リファクタリング後の統合エクスポートファイル
 *
 * 機能:
 * - Alt+X で数値入力ボックスを起動
 * - u_inline1f の位置にフキダシ風デザインの数値ボックスを表示
 * - Enter で値確定、ESC でキャンセル
 * - 上限下限なしの自由な数値入力
 * - Monaco Editor のズームレベルに連動したサイズ・位置調整
 * - Blender とのリアルタイム通信
 */

// ===== 型定義 =====
export type {
  FloatMatch,
  NudgeboxOptions,
  NudgeboxPosition,
  ArrowKeyStepConfig,
  ZoomSyncConfig,
  BlenderCommunicationConfig
} from './types';

// ===== メインクラス =====
export { InlineNudgeboxManager } from './NudgeboxManager';
export { NudgeboxWidget } from './NudgeboxWidget';

// ===== ユーティリティ関数 =====
export {
  calculateTextWidth,
  detectFloatAtPositionOrSelection,
  calculateArrowKeyStep,
  getDecimalPlaces,
  calculatePositionAdjustment,
  calculateZoomAdjustedSizes,
  createRange,
  DEFAULT_ARROW_KEY_CONFIG,
  DEFAULT_ZOOM_SYNC_CONFIG,
  UNIFORM_NAME,
  IPC_CHANNELS
} from './utils';

// ===== カスタムフック =====
export { useBlenderCommunication } from './hooks/useBlenderCommunication';

// ===== デフォルトエクスポート =====
export { InlineNudgeboxManager as default } from './NudgeboxManager';