import { FloatMarker, SliderPosition, InlineFloatEvents } from './types';
import * as monaco from 'monaco-editor';
import { blenderService } from '../../services/blenderService';

/**
 * Monaco Editor Content Widget として実装されたインラインスライダー
 */
export class SliderUI implements monaco.editor.IContentWidget {
  private editor: monaco.editor.ICodeEditor;
  private container: HTMLElement;
  private slider: HTMLInputElement;
  private sliderCell: HTMLElement;
  private track: HTMLElement;
  private knob: HTMLElement;
  private numberInput: HTMLInputElement;
  private currentMarker: FloatMarker | null = null;
  private events: InlineFloatEvents;
  private isVisible: boolean = false;
  private currentPosition: monaco.IPosition | null = null;
  private widgetId: string = 'ernst-inline-slider-widget';
  private showTime: number = 0; // スライダー表示開始時刻

  constructor(editor: monaco.editor.ICodeEditor, events: InlineFloatEvents = {}) {
    this.editor = editor;
    this.events = events;
    this.container = this.createSliderContainer();
    this.createSliderElements();

    this.setupContainer();
    this.attachEventListeners();

    // Monaco Editor にコンテンツウィジェットとして登録
    this.editor.addContentWidget(this);
  }

  // IContentWidget インターフェースの実装
  getId(): string {
    return this.widgetId;
  }

  getDomNode(): HTMLElement {
    return this.container;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    if (!this.currentPosition || !this.isVisible) {
      return null;
    }

    return {
      position: this.currentPosition,
      preference: [
        monaco.editor.ContentWidgetPositionPreference.BELOW, // 数値の下に表示
        monaco.editor.ContentWidgetPositionPreference.ABOVE  // 画面端では上に表示
      ]
    };
  }

  /**
   * スライダーコンテナを作成
   */
  private createSliderContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inline_1f-container';
    // Monaco Editorウィジェットに必要な最小限のスタイルのみ
    container.style.position = 'absolute';
    container.style.display = 'none';
    container.style.zIndex = 'var(--z-inline-float, 1000)';

    // コンテナが作成されました
    return container;
  }

  /**
   * スライダー要素群を作成（セル、トラック、スライダー、ノブの階層構造）
   */
  private createSliderElements(): void {
    // スライダーセル作成（横並びレイアウト）
    this.sliderCell = document.createElement('div');
    this.sliderCell.className = 'inline_1f-slider-cell';
    this.sliderCell.style.display = 'flex';
    this.sliderCell.style.alignItems = 'center';
    this.sliderCell.style.gap = '12px';

    // トラックコンテナ作成（スライダー部分）
    const trackContainer = document.createElement('div');
    trackContainer.className = 'inline_1f-track-container';
    trackContainer.style.flexGrow = '1';
    trackContainer.style.position = 'relative';

    // トラック作成
    this.track = document.createElement('div');
    this.track.className = 'inline_1f-track';
    this.track.style.position = 'relative';

    // スライダー（input）作成
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'inline_1f-slider';
    this.slider.style.position = 'absolute';
    this.slider.style.width = '100%';
    this.slider.style.height = '40px';
    this.slider.style.top = '-20px';
    this.slider.style.opacity = '0';
    this.slider.style.margin = '0';
    this.slider.style.appearance = 'none';
    this.slider.style.webkitAppearance = 'none';
    this.slider.style.background = 'transparent';
    this.slider.style.outline = 'none';

    // ノブ作成
    this.knob = document.createElement('div');
    this.knob.className = 'inline_1f-knob';
    this.knob.style.position = 'absolute';
    this.knob.style.left = '50%';
    this.knob.style.transform = 'translateX(-50%)';
    this.knob.style.pointerEvents = 'none';

    // 数値入力フィールド作成
    this.numberInput = document.createElement('input');
    this.numberInput.type = 'number';
    this.numberInput.className = 'inline_1f-number-input';
    this.numberInput.style.width = '60px';
    this.numberInput.style.height = '24px';
    this.numberInput.style.border = '1px solid var(--theme-input-border)';
    this.numberInput.style.borderRadius = '2px';
    this.numberInput.style.background = 'var(--theme-input-background)';
    this.numberInput.style.color = 'var(--theme-input-foreground)';
    this.numberInput.style.fontSize = '11px';
    this.numberInput.style.textAlign = 'center';
    this.numberInput.style.outline = 'none';
    this.numberInput.step = 'any';

    // 階層構造を組み立て
    this.track.appendChild(this.slider);
    this.track.appendChild(this.knob);
    trackContainer.appendChild(this.track);
    this.sliderCell.appendChild(trackContainer);
    this.sliderCell.appendChild(this.numberInput);

    // イベントリスナー設定
    this.setupSliderEvents();

    // スライダー要素が作成されました
  }

    /**
   * スライダーと数値入力のイベントリスナーを設定
   */
  private setupSliderEvents(): void {
    // スライダーの値変更イベント
    this.slider.addEventListener('input', () => {
      const value = parseFloat(this.slider.value);
      this.updateKnobPosition();
      this.updateNumberInput(value);

      if (this.currentMarker) {
        this.currentMarker.currentValue = value;
      }
      this.events.onValueChange?.(value);
    });

    // 数値入力フィールドの値変更イベント
    this.numberInput.addEventListener('input', () => {
      const value = parseFloat(this.numberInput.value);
      if (!isNaN(value)) {
        this.updateSlider(value);
        this.updateKnobPosition();

        if (this.currentMarker) {
          this.currentMarker.currentValue = value;
        }
        this.events.onValueChange?.(value);
      }
    });

    // 数値入力フィールドのキーボードイベント
    this.numberInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirmValue();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelValue();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        this.handleArrowKeyStep(e);
      }
    });
  }

  /**
   * ノブの位置を更新
   */
  private updateKnobPosition(): void {
    const min = parseFloat(this.slider.min) || 0;
    const max = parseFloat(this.slider.max) || 100;
    const value = parseFloat(this.slider.value) || 0;

    const percentage = ((value - min) / (max - min)) * 100;
    this.knob.style.left = `${percentage}%`;
  }

  /**
   * 数値入力フィールドを更新
   */
  private updateNumberInput(value: number): void {
    this.numberInput.value = value.toString();
  }

  /**
   * スライダーを更新
   */
  private updateSlider(value: number): void {
    this.slider.value = value.toString();
  }

  /**
   * 矢印キーによる精度制御ステップ処理
   */
  private handleArrowKeyStep(e: KeyboardEvent): void {
    const currentValue = parseFloat(this.numberInput.value) || 0;
    let stepSize = 1; // デフォルトステップサイズ

    // 修飾キーによる精度制御
    if (e.ctrlKey) {
      stepSize = 0.1; // Ctrl+矢印: 1/10精度
    } else if (e.shiftKey) {
      stepSize = 0.01; // Shift+矢印: 1/100精度
    } else if (e.altKey) {
      stepSize = 0.001; // Alt+矢印: 1/1000精度
    }

    // 上下キーによる増減
    const direction = e.key === 'ArrowUp' ? 1 : -1;
    let newValue = currentValue + (stepSize * direction);

    // 小数点以下の桁数を適切に丸める
    const decimalPlaces = this.getDecimalPlaces(stepSize);
    newValue = parseFloat(newValue.toFixed(decimalPlaces));

    // スライダーの範囲内に制限
    const min = parseFloat(this.slider.min) || -Infinity;
    const max = parseFloat(this.slider.max) || Infinity;
    newValue = Math.max(min, Math.min(max, newValue));

    // 値を更新
    this.updateNumberInput(newValue);
    this.updateSlider(newValue);
    this.updateKnobPosition();

    // イベント通知
    if (this.currentMarker) {
      this.currentMarker.currentValue = newValue;
    }
    this.events.onValueChange?.(newValue);
  }

  /**
   * ステップサイズから適切な小数点桁数を取得
   */
  private getDecimalPlaces(stepSize: number): number {
    if (stepSize >= 1) return 0;
    if (stepSize >= 0.1) return 1;
    if (stepSize >= 0.01) return 2;
    if (stepSize >= 0.001) return 3;
    return 4;
  }



  /**
   * コンテナを設定
   */
  private setupContainer(): void {
    // スライダーセルのみをコンテナに追加
    this.container.appendChild(this.sliderCell);

    // エディタエリアに追加
    document.body.appendChild(this.container);
  }

  /**
   * イベントリスナーを設定
   */
  private attachEventListeners(): void {
    // スライダーのイベントリスナーはsetupSliderEventsで設定済み

    // スライダーダブルクリック（確定）
    this.slider.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.confirmValue();
    });

        // ダブルクリック検出（スライダー外でのダブルクリックで閉じる）
    let outsideClickCount = 0;
    let outsideClickTimer: NodeJS.Timeout | null = null;
    let lastOutsideClickTime = 0;

    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.container.contains(e.target as Node)) {
        const currentTime = Date.now();
        const timeSinceShow = currentTime - this.showTime;

        // 表示後300ms以内のクリックは無視（ダブルクリック検出によるマウスアップを防ぐ）
        if (timeSinceShow < 300) {
          return;
        }

        outsideClickCount++;

        if (outsideClickTimer) {
          clearTimeout(outsideClickTimer);
        }

        // ダブルクリック検出（500ms以内の2回目のクリック）
        if (outsideClickCount === 2 && (currentTime - lastOutsideClickTime) < 500) {
          this.cancelValue();
          outsideClickCount = 0;
          return;
        }

        lastOutsideClickTime = currentTime;

        // 500ms後にクリックカウントをリセット
        outsideClickTimer = setTimeout(() => {
          outsideClickCount = 0;
          outsideClickTimer = null;
        }, 500);
      }
    });

    // 右クリック検出（スライダー外での右クリックで閉じる）
    document.addEventListener('contextmenu', (e) => {
      if (this.isVisible && !this.container.contains(e.target as Node)) {
        const timeSinceShow = Date.now() - this.showTime;

              // 表示直後の右クリックは無視
      if (timeSinceShow < 300) {
        return;
      }
        e.preventDefault(); // コンテキストメニューを無効化
        this.cancelValue();
      }
    });

    // ESCキーでキャンセル
    document.addEventListener('keydown', (e) => {
      if (this.isVisible && e.key === 'Escape') {
        e.preventDefault();
        console.log('⌨️ ESC key pressed, cancelling slider');
        this.cancelValue();
      }
    });

    // Enterキーで確定
    document.addEventListener('keydown', (e) => {
      if (this.isVisible && e.key === 'Enter') {
        e.preventDefault();
        console.log('⌨️ Enter key pressed, confirming slider');
        this.confirmValue();
      }
    });
  }

      /**
   * スライダーを表示
   * @param marker - 表示するマーカー
   */
  show(marker: FloatMarker): void {
    this.currentMarker = marker;
    this.isVisible = true;
    this.showTime = Date.now(); // 表示開始時刻を記録

    // 位置を設定（マーカーの範囲の中央）
    this.currentPosition = {
      lineNumber: marker.range.startLineNumber,
      column: Math.floor((marker.range.startColumn + marker.range.endColumn) / 2)
    };

    // スライダーの範囲と値を設定
    const range = this.calculateRange(marker.originalValue);
    this.slider.min = range.min.toString();
    this.slider.max = range.max.toString();
    this.slider.step = range.step.toString();
    this.slider.value = marker.currentValue.toString();

    // 数値入力フィールドを更新
    this.updateNumberInput(marker.currentValue);

    // ノブ位置を更新
    this.updateKnobPosition();

    // ウィジェット位置を更新（Monaco が自動的に位置計算）
    this.editor.layoutContentWidget(this);

    // フォーカスを設定
    setTimeout(() => {
      if (this.slider) {
        this.slider.focus();
      }
    }, 100);

    // アクティベーションイベント
    this.events.onActivate?.(marker);
  }

  /**
   * スライダーを非表示
   */
  hide(): void {
    if (!this.isVisible) return;

    console.log('🙈 Hiding slider');
    this.isVisible = false;
    this.currentPosition = null;

    // ウィジェット位置を更新（非表示）
    this.editor.layoutContentWidget(this);

    if (this.currentMarker) {
      this.events.onDeactivate?.(this.currentMarker);
      console.log('🙈 Slider deactivated for marker:', this.currentMarker.id);
      this.currentMarker = null;
    }
  }

  /**
   * 値を確定
   */
  private confirmValue(): void {
    if (!this.currentMarker) return;

    const finalValue = this.currentMarker.currentValue;
    this.events.onConfirm?.(finalValue);
    this.hide();
  }

  /**
   * 値をキャンセル
   */
  private cancelValue(): void {
    if (!this.currentMarker) return;

    const originalValue = this.currentMarker.originalValue;
    this.events.onCancel?.(originalValue);
    this.hide();
  }



  /**
   * スライダーの範囲を計算
   * @param originalValue - 元の値
   */
  private calculateRange(originalValue: number): { min: number; max: number; step: number } {
    const absValue = Math.abs(originalValue);

    if (absValue === 0) {
      return { min: -1, max: 1, step: 0.01 };
    } else if (absValue < 1) {
      return { min: -2, max: 2, step: 0.001 };
    } else if (absValue < 10) {
      return { min: -20, max: 20, step: 0.01 };
    } else {
      return { min: -100, max: 100, step: 0.1 };
    }
  }

  /**
   * 現在の表示状態を取得
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * 現在のマーカーを取得
   */
  getCurrentMarker(): FloatMarker | null {
    return this.currentMarker;
  }

  /**
   * DOM要素を取得
   */
  getDomNode(): HTMLElement {
    return this.container;
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.hide();

    // Monaco Editor からコンテンツウィジェットを削除
    this.editor.removeContentWidget(this);

    // イベントリスナーは自動的に削除される（要素が削除されるため）
  }
}