import * as monaco from 'monaco-editor';
import { FloatDetector, MarkerManager } from './markerUtils';
import { SliderUI } from './sliderUI';
import { injectInlineFloatStyles, removeInlineFloatStyles } from './styles';
import { FloatMarker, IInlineFloatWidget, InlineFloatEvents } from './types';
import { blenderService } from '../../../services/blenderService';

/**
 * インラインスライダーのMonaco Widget実装
 */
export class InlineFloatWidget implements IInlineFloatWidget {
  private static readonly WIDGET_ID = 'ernst.inlineFloat';

  private editor: monaco.editor.IStandaloneCodeEditor;
  private markerManager: MarkerManager;
  private sliderUI: SliderUI;
  private isActive: boolean = false;
  private currentMarker: FloatMarker | null = null;

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.markerManager = new MarkerManager(editor);

    // スタイルを注入
    injectInlineFloatStyles();

    // SliderUIを初期化
    this.sliderUI = new SliderUI(editor, {
      onValueChange: this.handleValueChange.bind(this),
      onConfirm: this.handleConfirm.bind(this),
      onCancel: this.handleCancel.bind(this),
      onActivate: this.handleActivate.bind(this),
      onDeactivate: this.handleDeactivate.bind(this)
    });

    // エディタにWidget登録
    this.editor.addContentWidget(this);

    // ダブルクリックイベント監視
    this.setupDoubleClickListener();
  }

  /**
   * Widget ID
   */
  getId(): string {
    return InlineFloatWidget.WIDGET_ID;
  }

  /**
   * DOM要素を取得
   */
  getDomNode(): HTMLElement {
    return this.sliderUI.getDomNode();
  }

  /**
   * Widget位置を取得
   */
  getPosition(): monaco.editor.IContentWidgetPosition | null {
    if (!this.isActive || !this.currentMarker) {
      return null;
    }

    return {
      position: this.currentMarker.position,
      preference: [
        monaco.editor.ContentWidgetPositionPreference.ABOVE,
        monaco.editor.ContentWidgetPositionPreference.BELOW
      ]
    };
  }

  /**
   * スライダーを表示
   */
  show(marker: FloatMarker): void {
    this.currentMarker = marker;
    this.isActive = true;

    // 一時マーカーを追加
    this.markerManager.addTemporaryMarker(marker);

    // スライダーを表示
    this.sliderUI.show(marker);

    // Widget位置を更新
    this.editor.layoutContentWidget(this);

    console.log(`🎛️ Inline slider activated for value: ${marker.originalValue}`);
  }

  /**
   * スライダーを非表示
   */
  hide(): void {
    if (!this.isActive) return;

    this.sliderUI.hide();
    this.isActive = false;
    this.currentMarker = null;

    // Widget位置を更新（非表示）
    this.editor.layoutContentWidget(this);
  }

  /**
   * 値を更新
   */
  updateValue(value: number): void {
    if (this.currentMarker) {
      this.markerManager.updateMarkerValue(this.currentMarker.id, value);
    }
  }

  /**
   * 表示状態を取得
   */
  isVisible(): boolean {
    return this.isActive;
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.hide();
    this.editor.removeContentWidget(this);
    this.sliderUI.dispose();
    this.markerManager.clearAllMarkers();
    removeInlineFloatStyles();
  }

        /**
   * ダブルクリック・右クリックリスナーを設定
   */
  private setupDoubleClickListener(): void {
    console.log('🔧 Setting up event listeners for InlineFloat');

    // 方法1: Monaco Editor API を使用（推奨）
    this.setupMonacoEvents();

    // 方法2: DOM イベント（フォールバック）
    this.setupDOMEvents();
  }

  /**
   * Monaco Editor APIイベントを設定
   */
  private setupMonacoEvents(): void {
    console.log('🔧 Setting up Monaco Editor API events');

    // Monaco Editor のダブルクリックイベント
    let clickCount = 0;
    let clickTimer: NodeJS.Timeout | null = null;
    let lastClickPosition: monaco.IPosition | null = null;

    this.editor.onMouseDown((e) => {
      if (!e.target || !e.target.position) return;

      clickCount++;
      const currentPosition = e.target.position;

      console.log(`🖱️ Monaco click ${clickCount} at position:`, currentPosition);

      // ダブルクリック判定（500ms以内）
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }

      if (clickCount === 2 && lastClickPosition &&
          lastClickPosition.lineNumber === currentPosition.lineNumber &&
          Math.abs(lastClickPosition.column - currentPosition.column) <= 3) {

        console.log('🖱️ Double-click detected via Monaco API!');
        this.handleDoubleClick(currentPosition);
        clickCount = 0;
        lastClickPosition = null;
        return;
      }

      lastClickPosition = currentPosition;

      clickTimer = setTimeout(() => {
        clickCount = 0;
        lastClickPosition = null;
        clickTimer = null;
      }, 500);
    });

    // 右クリック用のコンテキストメニューイベント
    this.editor.onContextMenu((e) => {
      console.log('🖱️ Monaco context menu detected!', e);
      if (e.target && e.target.position) {
        console.log('🖱️ Right-click detected via Monaco API!');
        this.handleDoubleClick(e.target.position);
      }
    });

    // キーボードショートカット追加（Ctrl+Shift+I）
    this.editor.addAction({
      id: 'ernst.triggerInlineSlider',
      label: 'Trigger Inline Slider',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI],
      run: (editor) => {
        console.log('🎹 Keyboard shortcut (Ctrl+Shift+I) triggered!');
        const position = editor.getPosition();
        if (position) {
          this.handleDoubleClick(position);
        }
      }
    });

    console.log('✅ Monaco Editor API events set up successfully');
  }

  /**
   * DOM イベントを設定（フォールバック）
   */
  private setupDOMEvents(): void {
    console.log('🔧 Setting up DOM events as fallback');

        // メイン方法: 直接DOMイベント
    const editorDom = this.editor.getDomNode();
    if (editorDom) {
      console.log('🔧 Editor DOM found:', editorDom);
      console.log('🔧 Editor DOM classList:', editorDom.classList.toString());
      console.log('🔧 Editor DOM children count:', editorDom.children.length);
      console.log('🔧 Setting up DOM event listeners');

      // より詳細なイベント設定
      const clickHandler = (event: Event) => {
        console.log('🖱️ DOM Click detected!', {
          target: event.target,
          currentTarget: event.currentTarget,
          type: event.type,
          coordinates: event instanceof MouseEvent ? {x: event.clientX, y: event.clientY} : null
        });
      };

      const dblclickHandler = (event: MouseEvent) => {
        console.log('🖱️ DOM Double-click detected!', event);
        this.handleClickEvent(event, 'double-click');
      };

      const contextHandler = (event: MouseEvent) => {
        console.log('🖱️ DOM Right-click detected!', event);
        event.preventDefault();
        this.handleClickEvent(event, 'right-click');
      };

      // イベントリスナーを追加
      editorDom.addEventListener('click', clickHandler, true); // useCapture = true
      editorDom.addEventListener('dblclick', dblclickHandler, true);
      editorDom.addEventListener('contextmenu', contextHandler, true);

      console.log('✅ DOM event listeners set up successfully');

      // 実際にエディター領域をテスト
      setTimeout(() => {
        console.log('🔧 Testing DOM accessibility...');
        const rect = editorDom.getBoundingClientRect();
        console.log('🔧 Editor DOM rect:', rect);

        // エディターの子要素も確認
        const codeArea = editorDom.querySelector('.monaco-editor');
        console.log('🔧 Monaco editor element found:', !!codeArea);

        const textarea = editorDom.querySelector('textarea');
        console.log('🔧 Textarea element found:', !!textarea);

        // 内部要素にもイベントリスナーを追加（フォールバック）
        const linesContent = editorDom.querySelector('.lines-content');
        const viewLines = editorDom.querySelector('.view-lines');

        console.log('🔧 Lines content found:', !!linesContent);
        console.log('🔧 View lines found:', !!viewLines);

        if (linesContent) {
          console.log('🔧 Adding event listeners to lines-content');
          linesContent.addEventListener('click', (event) => {
            console.log('🖱️ Lines-content Click detected!', event);
          }, true);

          linesContent.addEventListener('dblclick', (event) => {
            console.log('🖱️ Lines-content Double-click detected!', event);
            this.handleClickEvent(event as MouseEvent, 'double-click');
          }, true);

          linesContent.addEventListener('contextmenu', (event) => {
            console.log('🖱️ Lines-content Right-click detected!', event);
            event.preventDefault();
            this.handleClickEvent(event as MouseEvent, 'right-click');
          }, true);
        }

        if (viewLines) {
          console.log('🔧 Adding event listeners to view-lines');
          viewLines.addEventListener('click', (event) => {
            console.log('🖱️ View-lines Click detected!', event);
          }, true);

          viewLines.addEventListener('dblclick', (event) => {
            console.log('🖱️ View-lines Double-click detected!', event);
            this.handleClickEvent(event as MouseEvent, 'double-click');
          }, true);

          viewLines.addEventListener('contextmenu', (event) => {
            console.log('🖱️ View-lines Right-click detected!', event);
            event.preventDefault();
            this.handleClickEvent(event as MouseEvent, 'right-click');
          }, true);
        }

                // 全体のbodyにもテスト用リスナー追加
        document.body.addEventListener('click', (event) => {
          console.log('🖱️ Body Click detected!', {
            target: event.target,
            className: (event.target as Element)?.className
          });
        }, true);

      }, 1000);
    } else {
      console.error('❌ Editor DOM not found!');
    }
  }

  /**
   * クリックイベント処理の共通ロジック
   */
  private handleClickEvent(event: MouseEvent, eventType: string): void {
    console.log(`🖱️ Handling ${eventType} event`);

    // Monaco Editorのターゲット取得
    const target = this.editor.getTargetAtClientPoint(event.clientX, event.clientY);
    console.log('🎯 Target at client point:', target);

    if (target && target.position) {
      console.log('✅ Position found via target:', target.position);
      this.handleDoubleClick(target.position);
    } else {
      console.log('❌ Could not get position from client point, trying alternative method');

      // 代替方法: カーソル位置を使用
      const position = this.editor.getPosition();
      if (position) {
        console.log('✅ Using cursor position:', position);
        this.handleDoubleClick(position);
      } else {
        console.log('❌ No position available');
      }
    }
  }

  /**
   * ダブルクリック処理の共通ロジック
   */
  private handleDoubleClick(position: monaco.IPosition | null): void {
    if (!position) {
      console.log('❌ No position found');
      return;
    }

    console.log('📍 Click position:', position);

    const model = this.editor.getModel();
    if (!model) {
      console.log('❌ No model found');
      return;
    }

    // 浮動小数点数を検出
    const floatMatch = FloatDetector.detectFloatAtPosition(model, position);
    console.log('🔍 Float detection result:', floatMatch);

    if (!floatMatch) {
      console.log('❌ No float found at position');
      return;
    }

    console.log('✅ Float found:', floatMatch.value, 'at range:', floatMatch.range);

    // 既に表示中の場合は非表示にする
    if (this.isActive) {
      console.log('🔄 Hiding existing slider');
      this.hide();
      return;
    }

    // マーカーを作成
    const marker = this.markerManager.createMarker(floatMatch);
    console.log('📝 Marker created:', marker.id);

    // スライダーを表示
    this.show(marker);
    console.log('🎛️ Slider should now be visible');
  }



  /**
   * 値変更ハンドラー
   */
  private handleValueChange(value: number): void {
    this.updateValue(value);

    // Blenderにリアルタイム送信
    blenderService.sendUniformValue(value);
  }

  /**
   * 確定ハンドラー
   */
  private handleConfirm(finalValue: number): void {
    if (!this.currentMarker) return;

    console.log(`✅ Inline slider confirmed: ${this.currentMarker.originalValue} → ${finalValue}`);

    // マーカーを確定
    this.markerManager.confirmMarker(this.currentMarker.id);

    // 最終値をBlenderに送信
    blenderService.sendUniformValue(finalValue);

    this.hide();
  }

  /**
   * キャンセルハンドラー
   */
  private handleCancel(originalValue: number): void {
    if (!this.currentMarker) return;

    console.log(`❌ Inline slider cancelled: reverted to ${originalValue}`);

    // マーカーをキャンセル
    this.markerManager.cancelMarker(this.currentMarker.id);

    // 元の値をBlenderに送信
    blenderService.sendUniformValue(originalValue);

    this.hide();
  }

  /**
   * アクティベーションハンドラー
   */
  private handleActivate(marker: FloatMarker): void {
    console.log(`🎯 Inline slider activated for value: ${marker.originalValue}`);
  }

  /**
   * 非アクティベーションハンドラー
   */
  private handleDeactivate(marker: FloatMarker): void {
    console.log(`💤 Inline slider deactivated`);
  }
}

/**
 * インラインスライダー統合クラス
 */
export class InlineFloatManager {
  private widget: InlineFloatWidget | null = null;
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private markerManager: MarkerManager | null = null;
  private sliderUI: SliderUI | null = null;
  private isActive: boolean = false;
  private currentMarker: FloatMarker | null = null;

  // コード書き換え関連
  private originalValue: string = '';
  private originalRange: monaco.IRange | null = null;
  private getActiveTabCallback: (() => any) | null = null;
  private updateTabCallback: ((tabId: string, updates: any) => void) | null = null;

  constructor(
    getActiveTab?: () => any,
    updateTab?: (tabId: string, updates: any) => void
  ) {
    this.getActiveTabCallback = getActiveTab || null;
    this.updateTabCallback = updateTab || null;
    console.log('🔧 InlineFloatManager created with tab callbacks:', !!this.getActiveTabCallback);
  }

  /**
   * 専用保存処理（Monaco Editorから直接内容を取得して保存）
   */
  private async saveCurrentFile(): Promise<void> {
    if (!this.editor) {
      console.error('❌ No editor available for saving');
      return;
    }

    console.log('🔍 Debug - getActiveTabCallback exists:', !!this.getActiveTabCallback);
    const activeTab = this.getActiveTabCallback ? this.getActiveTabCallback() : null;
    console.log('🔍 Debug - activeTab:', activeTab);
    console.log('🔍 Debug - activeTab.filePath:', activeTab?.filePath);
    console.log('🔍 Debug - activeTab type check:', {
      hasId: !!activeTab?.id,
      hasFileName: !!activeTab?.fileName,
      hasFilePath: !!activeTab?.filePath,
      hasContent: !!activeTab?.content,
      isModified: activeTab?.isModified,
      fileName: activeTab?.fileName,
      fullTab: activeTab
    });

    if (!activeTab) {
      console.error('❌ No active tab available for saving');
      return;
    }

    if (!activeTab.filePath) {
      console.warn('⚠️ No file path in active tab (new unsaved file)');
      console.log('🔍 Active tab details:', {
        id: activeTab.id,
        fileName: activeTab.fileName,
        filePath: activeTab.filePath,
        isModified: activeTab.isModified
      });

            // 新規ファイルの場合は「名前を付けて保存」を呼び出す
      try {
        const content = this.editor.getValue();
        console.log('💾 Attempting to save new file with content length:', content.length);

        const result = await window.electronAPI.saveFileAs(content);
        console.log('💾 SaveFileAs result:', result);

        if (result && result.success && result.fileName && result.filePath) {
          console.log('✅ New file saved as:', result.filePath);

          // タブ情報を更新
          if (this.updateTabCallback) {
            this.updateTabCallback(activeTab.id, {
              fileName: result.fileName,
              filePath: result.filePath,
              content: content,
              isModified: false
            });
          }
          } else {
          console.error('❌ Failed to save new file. Result details:', {
            result: result,
            hasResult: !!result,
            success: result?.success,
            fileName: result?.fileName,
            filePath: result?.filePath,
            error: result?.error
          });
        }
      } catch (error) {
        console.error('❌ Error during new file save:', error);
      }
      return;
    }

    try {
      // Monaco Editorから直接内容を取得
      const content = this.editor.getValue();
      console.log('💾 Saving file:', activeTab.filePath);

      // ElectronAPIで直接保存
      const result = await window.electronAPI.saveFile(activeTab.filePath, content);

      if (result.success) {
        console.log('✅ File saved successfully');

        // タブ情報を更新
        if (this.updateTabCallback) {
          this.updateTabCallback(activeTab.id, {
            isModified: false,
            content: content
          });
        }
            } else {
        console.error('❌ Failed to save file:', result.error);
      }
    } catch (error) {
      console.error('❌ Error during file save:', error);
    }
  }

  /**
   * エディタに統合
   */
  integrate(editor: monaco.editor.IStandaloneCodeEditor): void {
    if (this.widget) {
      this.dispose();
    }

    this.editor = editor;

    // Monaco Content Widget として SliderUI を直接使用
    this.markerManager = new MarkerManager(editor);
    this.sliderUI = new SliderUI(editor, {
      onValueChange: this.handleValueChange.bind(this),
      onConfirm: this.handleValueConfirm.bind(this),
      onCancel: this.handleValueCancel.bind(this),
      onActivate: this.handleSliderActivate.bind(this),
      onDeactivate: this.handleSliderDeactivate.bind(this)
    });

    this.setupDoubleClickListener();

    console.log('🔧 InlineFloat integrated with Monaco Editor using Content Widget');
  }

  /**
   * 統合を解除
   */
  dispose(): void {
    if (this.widget) {
      this.widget.dispose();
      this.widget = null;
    }
    if (this.sliderUI) {
      this.sliderUI.dispose();
      this.sliderUI = null;
    }
    if (this.markerManager) {
      this.markerManager = null;
    }
    this.editor = null;

    console.log('🔧 InlineFloat integration disposed');
  }

  /**
   * 現在のWidget取得
   */
  getWidget(): SliderUI | null {
    return this.sliderUI;
  }

  /**
   * アクティブかどうか
   */
  getIsActive(): boolean {
    return this.isActive;
  }

    /**
   * ダブルクリックリスナーをセットアップ
   */
  private setupDoubleClickListener(): void {
    if (!this.editor) return;

    console.log('🔧 Setting up double-click listener for InlineFloat');

    let clickCount = 0;
    let clickTimer: NodeJS.Timeout | null = null;
    let lastClickPosition: monaco.IPosition | null = null;

    // Monaco Editor の onMouseDown イベントでダブルクリックを検出
    this.editor.onMouseDown((e) => {
      if (!e.target || !e.target.position) return;

      const currentPosition = e.target.position;
      console.log(`🖱️ Mouse down at position:`, currentPosition);

      clickCount++;

      if (clickTimer) {
        clearTimeout(clickTimer);
      }

            // 2回目のクリックかつ、同じ位置（近い位置）の場合
      if (clickCount === 2 && lastClickPosition &&
          lastClickPosition.lineNumber === currentPosition.lineNumber &&
          Math.abs(lastClickPosition.column - currentPosition.column) <= 3) {

        console.log('🖱️ Double-click detected!');

        // イベント伝播を停止（重要：外クリック検出を防ぐ）
        if (e.event) {
          e.event.stopPropagation();
          e.event.preventDefault();
        }

        this.handleDoubleClick(currentPosition);
        clickCount = 0;
        lastClickPosition = null;
        return;
      }

      lastClickPosition = currentPosition;

      // 500ms後にクリックカウントをリセット
      clickTimer = setTimeout(() => {
        clickCount = 0;
        lastClickPosition = null;
        clickTimer = null;
      }, 500);
    });

    // 右クリックでも有効化（デバッグ用）
    this.editor.onContextMenu((e) => {
      if (!e.target || !e.target.position) return;
      console.log('🖱️ Right-click detected, triggering slider');

      // イベント伝播を停止
      if (e.event) {
        e.event.stopPropagation();
        e.event.preventDefault();
      }

      this.handleDoubleClick(e.target.position);
    });

    console.log('✅ Double-click listener setup complete');
  }

    /**
   * ダブルクリック処理
   */
  private handleDoubleClick(position: monaco.IPosition): void {
    if (!this.editor || !this.markerManager) return;

    const model = this.editor.getModel();
    if (!model) return;

    // 数値検出（静的メソッドとして呼び出し）
    const floatMatch = FloatDetector.detectFloatAtPosition(model, position);

    if (floatMatch) {
      console.log('🎯 Float detected at position:', floatMatch);

      // マーカー作成
      const marker: FloatMarker = {
        id: `float_${Date.now()}`,
        position: position,
        range: floatMatch.range,
        originalValue: floatMatch.value,
        currentValue: floatMatch.value,
        originalText: floatMatch.text,  // 元の文字列形式を保持
        precedingOperator: floatMatch.precedingOperator  // 直前の演算子
      };

      this.showSlider(marker);
    } else {
      console.log('❌ No float detected at position:', position);
    }
  }

  /**
   * スライダー表示
   */
  private async showSlider(marker: FloatMarker): Promise<void> {
    if (!this.sliderUI || !this.editor) return;

    // 元の値と範囲を記録
    const originalText = marker.originalText || marker.originalValue.toString();
    this.originalValue = originalText;
    this.originalRange = marker.range;

    console.log('💾 Recording original value before modification:', this.originalValue);

    // コードを「元の文字列+u_inline1f」に書き換え（fサフィックス除去）
    const baseText = originalText.replace(/f$/, ''); // 末尾のfを除去
    const newText = `${baseText}+u_inline1f`;
    const model = this.editor.getModel();

    if (model) {
      model.pushEditOperations([], [{
        range: marker.range,
        text: newText
      }], () => null);

      console.log('🔧 Code modified from', originalText, 'to', newText);

            // 書き換え後の新しい範囲を計算して記録
      const startLine = marker.range.startLineNumber;
      const startColumn = marker.range.startColumn;
      const endColumn = startColumn + newText.length;

      this.originalRange = new monaco.Range(
        startLine,
        startColumn,
        startLine,
        endColumn
      );

      console.log('🔧 Updated range to include +u_inline1f:', {
        startLine: startLine,
        startColumn: startColumn,
        endColumn: endColumn,
        newText: newText
      });

      // ファイルを保存（Blenderのホットリロードをトリガー）
      await this.saveCurrentFile();
    }

    this.isActive = true;
    this.currentMarker = marker;
    this.sliderUI.show(marker);
  }

  /**
   * 値変更ハンドラー
   */
  private handleValueChange(value: number): void {
    if (this.currentMarker) {
      this.currentMarker.currentValue = value;
      // Blenderに送信（blenderServiceが有効な場合）
      console.log('📤 Sending value to Blender:', value);
    }
  }

  /**
   * 値確定ハンドラー
   */
  private async handleValueConfirm(value: number): Promise<void> {
    if (this.currentMarker && this.editor && this.originalRange) {
      console.log('✅ Confirming value change from', this.originalValue, 'to', value);

      // 「元の値+u_inline1f」を「新しい値」に置き換え
      const model = this.editor.getModel();
      if (model) {
        // 現在のテキストを取得（「元の値+u_inline1f」の形式）
        const currentText = model.getValueInRange(this.originalRange);
        console.log('🔧 Current text in range:', currentText);

                // 新しい値に置き換え（負の値の場合はカッコで囲む）
        let newText = value.toString();

        console.log('🔧 Confirm logic check:', {
          value,
          isNegative: value < 0,
          precedingOperator: this.currentMarker?.precedingOperator,
          shouldWrap: value < 0 && this.currentMarker?.precedingOperator === '-'
        });

        // 負の値で、かつ前の演算子が「-」の場合のみカッコで囲む
        if (value < 0 && this.currentMarker?.precedingOperator === '-') {
          console.log('✅ WRAPPING: Negative value with preceding minus operator detected');

          // 前が「-」で新しい値も負の場合はカッコで囲む（構文エラー防止）
          // 例：b+-.2（.2を抽出、前の演算子は-） で -0.1 に変更 → b+(-(-0.1))
          newText = `(${value})`;
          console.log('✅ WRAPPED result:', newText);
        } else {
          console.log('⭕ NO WRAPPING: Condition not met');
        }

        model.pushEditOperations([], [{
          range: this.originalRange,
          text: newText
        }], () => null);

        console.log('🔧 Code updated from', currentText, 'to', newText);

        // ファイルを保存
        await this.saveCurrentFile();
      }
    }
    this.hideSlider();
  }

  /**
   * 値キャンセルハンドラー
   */
  private async handleValueCancel(originalValue: number): Promise<void> {
    if (this.editor && this.originalRange && this.originalValue) {
      console.log('❌ Cancelling value change, reverting to original:', this.originalValue);

      // 「元の値+u_inline1f」を「元の値」に戻す
      const model = this.editor.getModel();
      if (model) {
        // 現在のテキストを取得（「元の値+u_inline1f」の形式）
        const currentText = model.getValueInRange(this.originalRange);
        console.log('🔧 Current text in range:', currentText);

        // 元の値に戻す
        model.pushEditOperations([], [{
          range: this.originalRange,
          text: this.originalValue
        }], () => null);

        console.log('🔧 Code reverted from', currentText, 'to', this.originalValue);

        // ファイルを保存
        await this.saveCurrentFile();
      }
    }
    this.hideSlider();
  }

  /**
   * スライダーアクティブハンドラー
   */
  private handleSliderActivate(marker: FloatMarker): void {
    console.log('🎛️ Slider activated for:', marker);
  }

  /**
   * スライダー非アクティブハンドラー
   */
  private handleSliderDeactivate(marker: FloatMarker): void {
    console.log('🙈 Slider deactivated for:', marker);
  }

  /**
   * スライダー非表示
   */
  private hideSlider(): void {
    if (this.sliderUI) {
      this.sliderUI.hide();
    }
    this.isActive = false;
    this.currentMarker = null;
  }
}

// デフォルトエクスポート
export default InlineFloatManager;