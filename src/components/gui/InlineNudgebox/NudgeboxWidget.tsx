/**
 * Nudgebox Widget - インライン数値編集ウィジェット
 */

import * as monaco from 'monaco-editor';
import { NudgeboxOptions } from './types';
import {
  calculateTextWidth,
  calculatePositionAdjustment,
  calculateZoomAdjustedSizes,
  getDecimalPlaces,
  UNIFORM_NAME
} from './utils';

/**
 * Monaco Editor で使用するインライン数値編集ウィジェット
 */
export class NudgeboxWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement;
  private numberInput: HTMLInputElement;
  private position: monaco.editor.IContentWidgetPosition | null = null;
  private options: NudgeboxOptions;
  private configChangeListener: monaco.IDisposable | null = null;

  constructor(options: NudgeboxOptions) {
    this.options = options;
    this.numberInput = document.createElement('input');
    this.domNode = this.createDomNode();
    this.setupEventListeners();
    this.setupZoomChangeListener();

    // DOM作成後に少し遅延させて確実にサイズ更新
    setTimeout(() => {
      this.updateSizeForCurrentZoom();
    }, 5);
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
   * ウィジェットの位置を設定
   */
  setPosition(range: monaco.IRange): void {
    // Nudgeboxを元の数値の開始位置に配置
    this.position = {
      position: {
        lineNumber: range.startLineNumber,
        column: range.startColumn  // startColumn に変更（数値の先頭）
      },
      preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
    };

    // 位置の微調整を行う
    this.adjustPositionForTextCoverage(range);
  }

  /**
   * テキストを完全にカバーするための位置調整
   */
  private adjustPositionForTextCoverage(range: monaco.IRange): void {
    if (!this.options.editor) return;

    // 少し遅延させて DOM が配置された後に調整
    setTimeout(() => {
      const adjustment = calculatePositionAdjustment(this.options.editor!);
      this.domNode.style.transform = `translateY(${adjustment.translateY}px)`;
      this.domNode.style.zIndex = adjustment.zIndex.toString();

      const fontSize = this.options.editor!.getOption(monaco.editor.EditorOption.fontSize);
      console.log(`📍 Position adjusted: fontSize=${fontSize}, translateY=${adjustment.translateY}`);
    }, 10);
  }

  /**
   * ズーム変更監視をセットアップ
   */
  private setupZoomChangeListener(): void {
    if (!this.options.editor) return;

    this.configChangeListener = this.options.editor.onDidChangeConfiguration((e) => {
      if (e.hasChanged(monaco.editor.EditorOption.fontSize)) {
        this.updateSizeForCurrentZoom();
      }
    });
  }

  /**
   * 現在のズームレベルに合わせてNudgeboxサイズを更新
   */
  public updateSizeForCurrentZoom(): void {
    if (!this.options.editor) return;

    const sizes = calculateZoomAdjustedSizes(this.options.editor, UNIFORM_NAME);

    // Nudgeboxのフォントサイズをエディタに合わせる
    this.numberInput.style.fontSize = `${sizes.fontSize}px`;
    this.numberInput.style.lineHeight = `${sizes.lineHeight}px`;

    this.domNode.style.width = `${sizes.width}px`;
    this.domNode.style.height = `${sizes.height}px`;

    // 位置もズームに合わせて調整
    const adjustment = calculatePositionAdjustment(this.options.editor);
    this.domNode.style.transform = `translateY(${adjustment.translateY}px)`;

    // 位置の再評価（未フォーマットで行幅が変わったケースに備える）
    try {
      if (this.position && this.options.range) {
        this.setPosition(this.options.range);
      }
    } catch {}

    // メインボックスのサイズも調整
    const mainBox = this.domNode.querySelector('.inline-nudgebox-main') as HTMLElement;
    if (mainBox) {
      mainBox.style.height = `${sizes.height}px`;
      mainBox.style.padding = `${sizes.padding}px`;
    }
  }

  /**
   * リソース清理
   */
  dispose(): void {
    if (this.configChangeListener) {
      this.configChangeListener.dispose();
      this.configChangeListener = null;
    }
  }
}
