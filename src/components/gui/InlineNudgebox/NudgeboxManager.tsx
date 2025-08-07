/**
 * Nudgebox Manager - インライン数値編集システムの管理クラス
 */

import * as monaco from 'monaco-editor';
import { FloatDetector } from '../InlineFloat/markerUtils';
import { FloatMatch } from './types';
import { NudgeboxWidget } from './NudgeboxWidget';
import {
  detectFloatAtPositionOrSelection,
  createRange,
  UNIFORM_NAME,
  IPC_CHANNELS
} from './utils';

/**
 * Inline Nudgebox システムのメイン管理クラス
 */
export class InlineNudgeboxManager {
  private editor!: monaco.editor.IStandaloneCodeEditor; // ! で初期化遅延を明示
  private widget: NudgeboxWidget | null = null;
  private currentMatch: FloatMatch | null = null;
  private originalRange: monaco.IRange | null = null;
  private updateTabCallback: (tabId: string, updates: any) => void;

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
  }

  /**
   * キーバインドをセットアップ
   */
  private setupKeyBindings(): void {
    // Alt+X キーバインド
    this.editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.KeyX,
      () => {
        this.tryActivateNudgebox();
      }
    );
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

    model.pushEditOperations([], [{
      range: floatMatch.range,
      text: UNIFORM_NAME
    }], () => null);

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

    // 初期値をBlenderに送信
    this.sendValueToBlender(floatMatch.value);

    // ファイル保存
    this.saveCurrentFile();
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

        model.pushEditOperations([], [{
          range: this.originalRange,
          text: newText
        }], () => null);

        await this.saveCurrentFile();
      }
    }
    this.hideNudgebox();
  }

  /**
   * キャンセル時の処理
   */
  private async handleCancel(): Promise<void> {
    if (this.currentMatch && this.originalRange) {
      const model = this.editor.getModel();
      if (model) {
        // 元の値に戻す
        model.pushEditOperations([], [{
          range: this.originalRange,
          text: this.currentMatch.text
        }], () => null);

        // Blenderに元の値を送信（復旧）
        await this.sendValueToBlender(this.currentMatch.value);

        await this.saveCurrentFile();
      }
    }
    this.hideNudgebox();
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
    this.sendValueToBlender(value);
  }

  /**
   * BlenderにUniform値を送信
   */
  private async sendValueToBlender(value: number): Promise<void> {
    try {
      // IPC経由でメインプロセスのblenderServiceを使用
      if (window.electronAPI && (window.electronAPI as any).sendTestValueToBlender) {
        const result = await (window.electronAPI as any).sendTestValueToBlender(value);
        if (!result.success) {
          console.error('❌ Nudgebox: Failed to send via IPC:', result.error);
        }
      } else {
        console.error('❌ Nudgebox: IPC API not available');
      }
    } catch (error) {
      console.error('❌ Nudgebox: Error sending value via IPC:', error);
    }
  }

  /**
   * 最新のアクティブタブを動的に取得
   */
  private getActiveTab(): any {
    // Appコンポーネントのアクティブタブを直接参照
    const app = (window as any).__ERNST_APP_INSTANCE__;
    if (app && app.getActiveTab) {
      return app.getActiveTab();
    }
    console.error('❌ Nudgebox: Cannot access latest active tab');
    return null;
  }

  /**
   * 現在のファイルを保存
   */
  private async saveCurrentFile(): Promise<void> {
    try {
      const activeTab = this.getActiveTab(); // 動的に最新のアクティブタブを取得
      console.log('🔍 DEBUG: Nudgebox saveCurrentFile - activeTab:', activeTab?.fileName, activeTab?.filePath);
      if (activeTab && activeTab.filePath && this.editor) {
        const content = this.editor.getValue();
        const result = await window.electronAPI.saveFile(activeTab.filePath, content);

        if (result.success) {
          this.updateTabCallback(activeTab.id, {
            content,
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
   * リソース清理
   */
  public dispose(): void {
    this.hideNudgebox();
  }
}
