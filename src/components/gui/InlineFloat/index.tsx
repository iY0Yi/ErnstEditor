import * as monaco from 'monaco-editor';
import { applyModelEdits } from '../../../utils/monacoUtils';
import { FloatDetector, MarkerManager } from './markerUtils';
import { SliderUI } from './sliderUI';
import { FloatMarker } from './types';
import { blenderService } from '../../../services/blenderService';

// 旧 InlineFloatWidget 実装は削除（InlineFloatManager に統一）


/**
 * インラインスライダー統合クラス
 */
export class InlineFloatManager {
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

        const { electronClient } = require('../../../services/electronClient');
        const result = await electronClient.saveFileAs(content);
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
      const { electronClient } = require('../../../services/electronClient');
      const result = await electronClient.saveFile(activeTab.filePath, content);

      if (result.success) {
        console.log('✅ File saved successfully');

        // clang-format により変更があればモデル反映
        const updated = (result as any).formattedContent && typeof (result as any).formattedContent === 'string'
          ? (result as any).formattedContent
          : content;
        if (updated !== content) {
          const model = this.editor?.getModel?.();
          if (model) {
            applyModelEdits(model, [{ range: model.getFullModelRange(), text: updated }]);
          }
        }

        // タブ情報を更新
        if (this.updateTabCallback) {
          this.updateTabCallback(activeTab.id, {
            isModified: false,
            content: (result as any).formattedContent ?? content
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
    if (this.sliderUI || this.markerManager) {
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
      applyModelEdits(model, [{ range: marker.range, text: newText }]);

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
      await this.saveCurrentFileIntegrated();
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

        applyModelEdits(model, [{ range: this.originalRange, text: newText }]);

        console.log('🔧 Code updated from', currentText, 'to', newText);

        // ファイルを保存
        await this.saveCurrentFileIntegrated();
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
        applyModelEdits(model, [{ range: this.originalRange, text: this.originalValue }]);

        console.log('🔧 Code reverted from', currentText, 'to', this.originalValue);

        // ファイルを保存
        await this.saveCurrentFileIntegrated();
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
}

// デフォルトエクスポート
export default InlineFloatManager;