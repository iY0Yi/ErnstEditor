/**
 * Inline Nudgebox (Float) システム
 *
 * 機能:
 * - Alt+X で数値入力ボックスを起動
 * - +u_inline1f の位置にフキダシ風デザインの数値ボックスを表示
 * - Enter で値確定、ESC でキャンセル
 * - 上限下限なしの自由な数値入力
 */

import * as monaco from 'monaco-editor';
import { FloatDetector } from '../InlineFloat/markerUtils';
// import { blenderService } from '../../../services/blenderService'; // レンダラープロセス内のインスタンスは使用しない

interface FloatMatch {
  value: number;
  range: monaco.IRange;
  text: string;
  precedingOperator?: string;
}

interface NudgeboxOptions {
  value: number;
  range: monaco.IRange;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  onValueChange?: (value: number) => void; // リアルタイム値変更時のコールバック
}

class NudgeboxWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement;
  private numberInput: HTMLInputElement;
  private position: monaco.IContentWidgetPosition | null = null;
  private options: NudgeboxOptions;

  constructor(options: NudgeboxOptions) {
    this.options = options;
    this.domNode = this.createDomNode();
    this.setupEventListeners();
  }

  private createDomNode(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inline-nudgebox-container';

    // メインボックス
    const mainBox = document.createElement('div');
    mainBox.className = 'inline-nudgebox-main';

    // 数値入力
    this.numberInput = document.createElement('input');
    this.numberInput.type = 'number';
    this.numberInput.className = 'inline-nudgebox-input';
    this.numberInput.value = this.options.value.toString();
    this.numberInput.step = 'any'; // 任意の精度

    // フキダシの矢印
    const arrow = document.createElement('div');
    arrow.className = 'inline-nudgebox-arrow';

    mainBox.appendChild(this.numberInput);
    container.appendChild(mainBox);
    container.appendChild(arrow);

    return container;
  }

  private setupEventListeners(): void {
    // Enter: 確定、ESC: キャンセル、矢印キー: 精度制御
    this.numberInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.confirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        this.handleArrowKeyStep(e);
      }
    });

    // 数値入力の変更をリアルタイムで監視
    this.numberInput.addEventListener('input', () => {
      const value = parseFloat(this.numberInput.value);
      if (!isNaN(value) && this.options.onValueChange) {
        this.options.onValueChange(value);
      }
    });

    // 外側クリックでは閉じない（EnterとESCのみで操作）
    // この仕様により、ユーザーは意図的にEnter/ESCで操作する必要がある
  }



  private confirm(): void {
    const value = parseFloat(this.numberInput.value);
    if (!isNaN(value)) {
      this.options.onConfirm(value);
    } else {
      this.cancel();
    }
  }

  private cancel(): void {
    this.options.onCancel();
  }

  /**
   * 矢印キーによる精度制御ステップ処理
   * スライダーと同じ仕様:
   * - 修飾キーなし: 第1小数点 (0.1)
   * - Ctrl+矢印: 1/100精度 (0.01)
   * - Shift+矢印: 1/1000精度 (0.001)
   * - Alt+矢印: 1/10000精度 (0.0001)
   */
  private handleArrowKeyStep(e: KeyboardEvent): void {
    const currentValue = parseFloat(this.numberInput.value) || 0;
    let stepSize = 0.1; // デフォルトステップサイズ（第1小数点）

    // 修飾キーによる精度制御
    if (e.ctrlKey) {
      stepSize = 0.01; // Ctrl+矢印: 1/100精度
    } else if (e.shiftKey) {
      stepSize = 0.001; // Shift+矢印: 1/1000精度
    } else if (e.altKey) {
      stepSize = 0.0001; // Alt+矢印: 1/10000精度
    }

    // 上下キーによる増減
    const direction = e.key === 'ArrowUp' ? 1 : -1;
    let newValue = currentValue + (stepSize * direction);

    // 小数点以下の桁数を適切に丸める
    const decimalPlaces = this.getDecimalPlaces(stepSize);
    newValue = parseFloat(newValue.toFixed(decimalPlaces));

    // 値を更新（上限下限なし）
    this.numberInput.value = newValue.toString();

    // リアルタイムでBlenderに送信
    if (this.options.onValueChange) {
      this.options.onValueChange(newValue);
    }
  }

  /**
   * ステップサイズから適切な小数点桁数を取得
   */
  private getDecimalPlaces(stepSize: number): number {
    if (stepSize >= 1) return 0;
    if (stepSize >= 0.1) return 1;
    if (stepSize >= 0.01) return 2;
    if (stepSize >= 0.001) return 3;
    if (stepSize >= 0.0001) return 4;
    return 5;
  }

  public focus(): void {
    setTimeout(() => {
      if (this.numberInput) {
        this.numberInput.focus();
        this.numberInput.select();
      } else {
        console.warn('⚠️ Nudgebox input element not found');
      }
    }, 50); // 少し長めに待つ
  }

  public dispose(): void {
    if (this.domNode.parentNode) {
      this.domNode.parentNode.removeChild(this.domNode);
    }
  }

  // IContentWidget implementation
  getId(): string {
    return 'inline.nudgebox.widget';
  }

  getDomNode(): HTMLElement {
    return this.domNode;
  }

  getPosition(): monaco.IContentWidgetPosition | null {
    return this.position;
  }

  setPosition(range: monaco.IRange): void {
    this.position = {
      position: {
        lineNumber: range.startLineNumber,
        column: range.endColumn
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
    };
  }
}

export class InlineNudgeboxManager {
  private editor: monaco.editor.IStandaloneCodeEditor;
  private widget: NudgeboxWidget | null = null;
  private currentMatch: FloatMatch | null = null;
  private originalRange: monaco.IRange | null = null;
  private getActiveTabCallback: () => any;
  private updateTabCallback: (tabId: string, updates: any) => void;

  constructor(
    getActiveTabCallback: () => any,
    updateTabCallback: (tabId: string, updates: any) => void
  ) {
    this.getActiveTabCallback = getActiveTabCallback;
    this.updateTabCallback = updateTabCallback;
  }

  public integrate(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
    this.setupKeyBindings();
    // console.log('✅ InlineNudgeboxManager integrated');
  }

  private setupKeyBindings(): void {
    // Alt+X キーバインド
    this.editor.addCommand(
      monaco.KeyMod.Alt | monaco.KeyCode.KeyX,
      () => {
        this.tryActivateNudgebox();
      }
    );
  }

  private tryActivateNudgebox(): void {
    const model = this.editor.getModel();
    if (!model) return;

    const position = this.editor.getPosition();
    if (!position) return;

    // カーソル位置または選択範囲の数値を検出
    const selection = this.editor.getSelection();
    const floatMatch = this.detectFloatAtPositionOrSelection(model, position, selection);

    if (floatMatch) {
      this.showNudgebox(floatMatch);
    } else {
      // console.log('⚠️ No float number found at cursor position or selection');
    }
  }

  private detectFloatAtPositionOrSelection(
    model: monaco.editor.ITextModel,
    position: monaco.IPosition,
    selection: monaco.ISelection | null
  ): FloatMatch | null {
    // 選択範囲がある場合は選択範囲内の数値を優先
    if (selection && !selection.isEmpty()) {
      const selectedText = model.getValueInRange(selection);
      const floatValue = parseFloat(selectedText);
      if (!isNaN(floatValue)) {
        return {
          value: floatValue,
          range: selection,
          text: selectedText
        };
      }
    }

    // カーソル位置の数値を検出
    return FloatDetector.detectFloatAtPosition(model, position);
  }

  private showNudgebox(floatMatch: FloatMatch): void {
    this.currentMatch = floatMatch;

    // 数値を "u_inline1f" で一時置換
    const model = this.editor.getModel();
    if (!model) return;

    const placeholder = 'u_inline1f';
    model.pushEditOperations([], [{
      range: floatMatch.range,
      text: placeholder
    }], () => null);

    // 置換後の範囲を保存（u_inline1fの範囲）
    this.originalRange = new monaco.Range(
      floatMatch.range.startLineNumber,
      floatMatch.range.startColumn,
      floatMatch.range.endLineNumber,
      floatMatch.range.startColumn + placeholder.length
    );

    // Nudgeboxウィジェットを作成
    this.widget = new NudgeboxWidget({
      value: floatMatch.value,
      range: floatMatch.range,  // 元の数値の範囲
      onConfirm: (value) => this.handleConfirm(value),
      onCancel: () => this.handleCancel(),
      onValueChange: (value) => this.handleValueChange(value)
    });

    // 元の数値の位置に配置（+u_inline1fを隠すため）
    this.widget.setPosition(floatMatch.range);
    this.editor.addContentWidget(this.widget);

    // フォーカス（DOMが準備できるまで少し待つ）
    setTimeout(() => {
      this.widget.focus();
    }, 10);

    // 初期値をBlenderに送信
    this.sendValueToBlender(floatMatch.value);

    // ファイル保存
    this.saveCurrentFile();

    // console.log('📦 Nudgebox activated for value:', floatMatch.value);
  }

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

        // Blenderに新しい値を送信（確定時はコメントアウト - リアルタイム送信で既に送信済み）
        // console.log('🎛️ Nudgebox sending value to Blender:', value);
        // await this.sendValueToBlender(value); // 確定時は追加送信不要

        await this.saveCurrentFile();
        // console.log('✅ Nudgebox value confirmed and sent to Blender:', value);
      }
    }
    this.hideNudgebox();
  }

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

  private async saveCurrentFile(): Promise<void> {
    try {
      const activeTab = this.getActiveTabCallback();
      if (activeTab && activeTab.filePath && this.editor) {
        const content = this.editor.getValue();
        const result = await window.electronAPI.saveFile(activeTab.filePath, content);

        if (result.success) {
          this.updateTabCallback(activeTab.id, {
            content,
            isModified: false
          });
          // console.log('💾 File saved automatically');
        } else {
          console.error('❌ Failed to save file:', result.error);
        }
      } else {
        // console.log('⚠️ No active tab or file path for saving');
      }
    } catch (error) {
      console.error('❌ Error saving file:', error);
    }
  }

  public dispose(): void {
    this.hideNudgebox();
    // console.log('🧹 InlineNudgeboxManager disposed');
  }
}

export default InlineNudgeboxManager;