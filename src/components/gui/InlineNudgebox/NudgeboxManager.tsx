/**
 * Nudgebox Manager - インライン数値編集システムの管理クラス
 */

import * as monaco from 'monaco-editor';
import { FloatDetector } from '../InlineFloat/markerUtils';
import { FloatMatch } from './types';
import { NudgeboxWidget } from './NudgeboxWidget';
import { detectFloatAtPositionOrSelection, createRange, UNIFORM_NAME, IPC_CHANNELS } from './utils';
import { applyModelEdits } from '../../../utils/monacoUtils';
import { sendValueToBlender } from '../../../utils/blenderUtils';

/**
 * Inline Nudgebox システムのメイン管理クラス
 */
export class InlineNudgeboxManager {
  private editor!: monaco.editor.IStandaloneCodeEditor; // ! で初期化遅延を明示
  private widget: NudgeboxWidget | null = null;
  private currentMatch: FloatMatch | null = null;
  private originalRange: monaco.IRange | null = null;
  private updateTabCallback: (tabId: string, updates: any) => void;
  private layoutListener: monaco.IDisposable | null = null;

  constructor(
    updateTabCallback: (tabId: string, updates: any) => void
  ) {
    this.updateTabCallback = updateTabCallback;
  }

  /**
   * Monaco Editor と統合
   */
  public integrate(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
    this.setupKeyBindings();

    // レイアウト変化で位置・サイズを追従
    this.layoutListener?.dispose();
    this.layoutListener = this.editor.onDidLayoutChange(() => {
      if (this.widget && this.currentMatch) {
        try {
          this.widget.setPosition(this.currentMatch.range);
          this.widget.updateSizeForCurrentZoom();
        } catch {}
      }
    });
  }

  /**
   * キーバインドをセットアップ
   */
  private setupKeyBindings(): void {
    // Alt+X: 起動 or キャンセル（トグル）
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyX, () => {
      if (this.widget) {
        // Alt+X で確定
        try {
          (this.widget as any).triggerConfirm?.();
        } catch {}
      } else {
        this.tryActivateNudgebox();
      }
    });
  }

  /**
   * Nudgebox の起動を試行
   */
  private tryActivateNudgebox(): void {
    const model = this.editor.getModel();
    if (!model) return;

    const position = this.editor.getPosition();
    if (!position) return;

    // カーソル位置または選択範囲の数値を検出
    const selection = this.editor.getSelection();
    const floatMatch = detectFloatAtPositionOrSelection(model, position, selection);

    if (floatMatch) {
      this.showNudgebox(floatMatch);
    }
  }

  /**
   * Nudgebox を表示
   */
  private showNudgebox(floatMatch: FloatMatch): void {
    this.currentMatch = floatMatch;

    // 数値を "u_inline1f" で一時置換
    const model = this.editor.getModel();
    if (!model) return;

    applyModelEdits(model, [{ range: floatMatch.range, text: UNIFORM_NAME }]);

    // 置換後の範囲を保存（u_inline1fの範囲）
    this.originalRange = createRange(
      floatMatch.range.startLineNumber,
      floatMatch.range.startColumn,
      floatMatch.range.endLineNumber,
      floatMatch.range.startColumn + UNIFORM_NAME.length
    );

    // Nudgeboxウィジェットを作成
    this.widget = new NudgeboxWidget({
      value: floatMatch.value,
      range: floatMatch.range,  // 元の数値の範囲
      onConfirm: (value) => this.handleConfirm(value),
      onCancel: () => this.handleCancel(),
      onValueChange: (value) => this.handleValueChange(value),
      editor: this.editor // エディタ参照を渡してズーム対応
    });

    // 元の数値の位置に配置（+u_inline1fを隠すため）
    this.widget.setPosition(floatMatch.range);
    this.editor.addContentWidget(this.widget);

    // 現在のズームレベルに合わせて強制的にサイズ更新
    setTimeout(() => {
      this.widget?.updateSizeForCurrentZoom();
      this.widget?.focus();
    }, 15); // 少し長めに遅延

    // 初期値をBlenderに送信（保存はしない。保存は確定/キャンセル時のみ）
    this.sendValueToBlenderInternal(floatMatch.value);
  }

  /**
   * 値確定時の処理
   */
  private async handleConfirm(value: number): Promise<void> {
    if (this.currentMatch && this.originalRange) {
      const model = this.editor.getModel();
      if (model) {
        let newText = value.toString();

        // 負の値で前の演算子が「-」の場合はカッコで囲む
        if (value < 0 && this.currentMatch.precedingOperator === '-') {
          newText = `(${value})`;
        }

        applyModelEdits(model, [{ range: this.originalRange, text: newText }]);

        // 保存（整形後にカーソルを末尾へ戻す）
        await this.saveCurrentFileIntegrated();

        // キャレット位置を新しい数値の末尾へ
        try {
          const pos = { lineNumber: this.originalRange.startLineNumber, column: this.originalRange.startColumn + newText.length };
          this.editor.setPosition(pos);
          this.editor.revealPositionInCenterIfOutsideViewport(pos);
        } catch {}
      }
    }
    this.hideNudgebox();
    // エディタにフォーカスを戻す
    try { this.editor.focus(); } catch {}
  }

  /**
   * キャンセル時の処理
   */
  private async handleCancel(): Promise<void> {
    if (this.currentMatch && this.originalRange) {
      const model = this.editor.getModel();
      if (model) {
        // 元の値に戻す
        applyModelEdits(model, [{ range: this.originalRange, text: this.currentMatch.text }]);

        // Blenderに元の値を送信（復旧）
        await this.sendValueToBlenderInternal(this.currentMatch.value);

        await this.saveCurrentFileIntegrated();

        // キャレット位置を元の数値の末尾へ
        try {
          const pos = { lineNumber: this.originalRange.startLineNumber, column: this.originalRange.startColumn + this.currentMatch.text.length };
          this.editor.setPosition(pos);
          this.editor.revealPositionInCenterIfOutsideViewport(pos);
        } catch {}
      }
    }
    this.hideNudgebox();
    // エディタにフォーカスを戻す
    try { this.editor.focus(); } catch {}
  }

  /**
   * Nudgebox を非表示
   */
  private hideNudgebox(): void {
    if (this.widget) {
      this.editor.removeContentWidget(this.widget);
      this.widget.dispose();
      this.widget = null;
    }
    this.currentMatch = null;
    this.originalRange = null;
  }

  /**
   * 値変更時のリアルタイム処理
   */
  private handleValueChange(value: number): void {
    this.sendValueToBlenderInternal(value);
  }

  /**
   * BlenderにUniform値を送信（共通ユーティリティを使用）
   */
  private async sendValueToBlenderInternal(value: number): Promise<void> {
    const success = await sendValueToBlender(value);
    if (!success) {
      console.error('❌ Nudgebox: Failed to send value to Blender');
    }
  }

  /**
   * 最新のアクティブタブを動的に取得
   */
  private getActiveTab(): any {
    // Appコンポーネントのアクティブタブを直接参照
    try {
      const appCtx = (window as any).__ERNST_APP_CONTEXT__ as { getActiveTab?: () => any } | undefined;
      if (appCtx && appCtx.getActiveTab) {
        return appCtx.getActiveTab();
      }
    } catch {}
    console.error('❌ Nudgebox: Cannot access latest active tab');
    return null;
  }

  /**
   * 現在のファイルを保存
   */
  private async saveCurrentFile(): Promise<void> {
    try {
      const activeTab = this.getActiveTab(); // 動的に最新のアクティブタブを取得
      if (activeTab && activeTab.filePath && this.editor) {
        const content = this.editor.getValue();
        const { electronClient } = require('../../../services/electronClient');
        const result = await electronClient.saveFile(activeTab.filePath, content);

        if (result.success) {
          const updated = (result as any).formattedContent && typeof (result as any).formattedContent === 'string'
            ? (result as any).formattedContent
            : content;
          if (updated !== content) {
            try {
              const model = this.editor.getModel?.();
              if (model) {
                const { applyModelEdits } = require('../../../utils/monacoUtils');
                const fullRange = model.getFullModelRange();
                applyModelEdits(model, [{ range: fullRange, text: updated }]);
              }
            } catch {}
          }
          this.updateTabCallback(activeTab.id, {
            content: (result as any).formattedContent ?? content,
            isModified: false
          });
        } else {
          console.error('❌ Failed to save file:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error saving file:', error);
    }
  }

  /**
   * 統合されたBufferManagerを使用したファイル保存
   */
  private async saveCurrentFileIntegrated(): Promise<void> {
    try {
      // グローバルアクセス経由で統合されたsaveActiveTabを呼び出し
      const appCtx = (window as any).__ERNST_APP_CONTEXT__ as { saveActiveTab?: () => Promise<boolean> } | undefined;
      if (appCtx && appCtx.saveActiveTab) {
        const success = await appCtx.saveActiveTab();
        console.log(success ? '✅ Integrated save successful' : '❌ Integrated save failed');
      } else {
        // フォールバック: 従来の保存方法
        console.log('⚠️ Integrated save not available, using fallback');
        await this.saveCurrentFile();
      }
    } catch (error) {
      console.error('❌ Error in integrated save:', error);
      // フォールバック: 従来の保存方法
      await this.saveCurrentFile();
    }
  }

  /**
   * リソース清理
   */
  public dispose(): void {
    this.hideNudgebox();
    this.layoutListener?.dispose();
    this.layoutListener = null;
  }
}
