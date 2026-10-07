/**
 * Nudgebox Widget - インライン数値編集ウィジェット
 */

import * as monaco from 'monaco-editor';
import { NudgeboxOptions } from './types';
import { getDecimalPlaces, UNIFORM_NAME } from './utils';

/**
 * Monaco Editor で使用するインライン数値編集ウィジェット
 */
export class NudgeboxWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement;
  private numberInput: HTMLInputElement;
  private position: monaco.editor.IContentWidgetPosition | null = null;
  private options: NudgeboxOptions;

  constructor(options: NudgeboxOptions) {
    this.options = options;
    this.numberInput = document.createElement('input');
    this.domNode = this.createDomNode();
    this.setupEventListeners();
  }

  /**
   * DOM要素を作成
   */
  private createDomNode(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inline-nudgebox-container';

    // メインボックス
    const mainBox = document.createElement('div');
    mainBox.className = 'inline-nudgebox-main';

    // 数値入力（既に constructor で初期化済み）
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

  /**
   * イベントリスナーをセットアップ
   */
  private setupEventListeners(): void {
    // Alt+X: 確定、ESC: キャンセル、矢印キー: 精度制御
    this.numberInput.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).altKey && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        this.confirm();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        this.handleArrowKeyStep(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
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

  /**
   * 値を確定
   */
  private confirm(): void {
    const value = parseFloat(this.numberInput.value);
    if (!isNaN(value)) {
      this.options.onConfirm(value);
    } else {
      this.cancel();
    }
  }

  /**
   * キャンセル
   */
  private cancel(): void {
    this.options.onCancel();
  }

  /**
   * 現在の入力値を取得（数値でなければ null）
   */
  public getCurrentValue(): number | null {
    const value = parseFloat(this.numberInput.value);
    return isNaN(value) ? null : value;
  }

  /**
   * 外部から確定をトリガー
   */
  public triggerConfirm(): void {
    this.confirm();
  }

  /**
   * 矢印キーによる精度制御ステップ処理
   * 指定仕様:
   * - 修飾なし: 0.1
   * - Alt+矢印: 0.01
   * - Ctrl+矢印: 0.001
   * - Shift+矢印: 0.0001
   */
  private handleArrowKeyStep(e: KeyboardEvent): void {
    const currentValue = parseFloat(this.numberInput.value) || 0;
    let stepSize = 0.1; // デフォルト

    // 修飾キーによる精度（Alt > Ctrl > Shift の優先順）
    if (e.altKey) {
      stepSize = 0.01;
    } else if (e.ctrlKey) {
      stepSize = 0.001;
    } else if (e.shiftKey) {
      stepSize = 0.0001;
    }

    // 上下キーによる増減
    const direction = e.key === 'ArrowUp' ? 1 : -1;
    let newValue = currentValue + (stepSize * direction);

    // 小数点以下の桁数を適切に丸める
    const decimalPlaces = getDecimalPlaces(stepSize);
    newValue = parseFloat(newValue.toFixed(decimalPlaces));

    // 値を更新（上限下限なし）
    this.numberInput.value = newValue.toString();

    // リアルタイムでBlenderに送信
    if (this.options.onValueChange) {
      this.options.onValueChange(newValue);
    }
  }

  /**
   * 入力フィールドにフォーカス
   */
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

  // ===== IContentWidget implementation =====

  getId(): string {
    return 'inline.nudgebox.widget';
  }

  getDomNode(): HTMLElement {
    return this.domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    return this.position;
  }

  /**
   * プレースホルダー（u_inline1f）の範囲にぴったり重ねる位置とサイズを設定する
   * 反映には呼び出し側で addContentWidget / layoutContentWidget が必要
   */
  update(range: monaco.IRange): void {
    // EXACT は行の上端・桁の左端に配置される。ABOVE/BELOW は画面端で上下が入れ替わるため使わない
    this.position = {
      position: { lineNumber: range.startLineNumber, column: range.startColumn },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
    };

    const { editor, editorOption } = this.options;
    const { fontSize, lineHeight } = editor.getOption(editorOption.fontInfo);

    this.numberInput.style.fontSize = `${fontSize}px`;
    this.numberInput.style.lineHeight = `${lineHeight}px`;
    this.domNode.style.width = `${Math.ceil(this.measureRangeWidth(range))}px`;
    this.domNode.style.height = `${lineHeight}px`;
  }

  private measureRangeWidth(range: monaco.IRange): number {
    const { editor, editorOption } = this.options;
    const start = editor.getOffsetForColumn(range.startLineNumber, range.startColumn);
    const end = editor.getOffsetForColumn(range.endLineNumber, range.endColumn);
    if (start >= 0 && end > start) {
      return end - start;
    }
    // 行が描画されていないと実測できないので、エディタのフォント情報から概算する
    const { typicalHalfwidthCharacterWidth } = editor.getOption(editorOption.fontInfo);
    return typicalHalfwidthCharacterWidth * UNIFORM_NAME.length;
  }
}
