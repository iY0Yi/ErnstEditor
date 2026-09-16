/**
 * Nudgebox Manager - インライン数値編集システムの管理クラス
 */

import * as monaco from 'monaco-editor';
import { FloatMatch } from './types';
import { NudgeboxWidget } from './NudgeboxWidget';
import { detectFloatAtPositionOrSelection, UNIFORM_NAME } from './utils';
import { applyModelEdits } from '../../../utils/monacoUtils';
import { sendValueToBlender } from '../../../utils/blenderUtils';
import { electronClient } from '../../../services/electronClient';
import { FileTab } from '../../../types';

/**
 * 起動中の Nudgebox の状態
 * タブ切替後も起動時のモデルへ書き戻せるよう、モデルと置換箇所（デコレーション）を保持する
 */
interface NudgeSession {
  model: monaco.editor.ITextModel;
  match: FloatMatch;
  placeholderDecorationId: string;
  pendingSave: Promise<void>;
}

interface SaveTarget {
  tabId: string;
  filePath: string;
  content: string;
  model: monaco.editor.ITextModel;
  versionId: number;
}

/**
 * Inline Nudgebox システムのメイン管理クラス
 */
export class InlineNudgeboxManager {
  private editor!: monaco.editor.IStandaloneCodeEditor; // ! で初期化遅延を明示
  private widget: NudgeboxWidget | null = null;
  private session: NudgeSession | null = null;
  private updateTabCallback: (tabId: string, updates: Partial<FileTab>) => void;
  private listeners: monaco.IDisposable[] = [];

  constructor(
    updateTabCallback: (tabId: string, updates: Partial<FileTab>) => void
  ) {
    this.updateTabCallback = updateTabCallback;
  }

  /**
   * Monaco Editor と統合
   */
  public integrate(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
    this.setupKeyBindings();

    this.listeners.forEach(l => l.dispose());
    this.listeners = [
      // レイアウト変化で位置・サイズを追従
      this.editor.onDidLayoutChange(() => {
        const range = this.getPlaceholderRange();
        if (this.widget && range) {
          this.widget.setPosition(range);
          this.widget.updateSizeForCurrentZoom();
        }
      }),
      // タブ切替・タブを閉じる操作で表示中のモデルが変わったら、元の値に戻して終了する
      this.editor.onDidChangeModel(() => {
        if (this.session) {
          this.finish({ confirmed: false });
        }
      })
    ];
  }

  /**
   * キーバインドをセットアップ
   */
  private setupKeyBindings(): void {
    // Alt+X: 起動 or 確定（トグル）
    this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyX, () => {
      if (this.widget) {
        this.widget.triggerConfirm();
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
      this.showNudgebox(model, floatMatch);
    }
  }

  /**
   * Nudgebox を表示
   */
  private showNudgebox(model: monaco.editor.ITextModel, floatMatch: FloatMatch): void {
    // 数値を "u_inline1f" で一時置換
    applyModelEdits(model, [{ range: floatMatch.range, text: UNIFORM_NAME }]);

    // 置換箇所はデコレーションで追跡する（エディタ上での編集で行・桁がずれても追従させるため）
    const { startLineNumber, startColumn } = floatMatch.range;
    const [placeholderDecorationId] = model.deltaDecorations([], [{
      range: new monaco.Range(startLineNumber, startColumn, startLineNumber, startColumn + UNIFORM_NAME.length),
      options: { stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }
    }]);

    // 置換した状態を先に保存してから値を送信（Blender側のシェーダーに u_inline1f を反映させるため）
    // 整形すると置換箇所の追跡が壊れるので、Nudgebox からの保存は整形しない
    const saveTarget = this.captureSaveTarget(model);
    const pendingSave = (async () => {
      if (saveTarget) {
        await this.writeSaveTarget(saveTarget);
      }
      await this.sendValueToBlenderInternal(floatMatch.value);
    })();

    this.session = { model, match: floatMatch, placeholderDecorationId, pendingSave };

    this.widget = new NudgeboxWidget({
      value: floatMatch.value,
      range: floatMatch.range,  // 元の数値の範囲
      onConfirm: (value) => this.finish({ confirmed: true, value }),
      onCancel: () => this.finish({ confirmed: false }),
      onValueChange: (value) => this.sendValueToBlenderInternal(value),
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
  }

  /**
   * 確定/キャンセルの共通終了処理
   * 置換箇所への書き戻しは同期的に行い、保存はその後に直列で行う
   * （タブを閉じる操作ではこの直後にモデルが破棄されるため）
   */
  private async finish(result: { confirmed: true; value: number } | { confirmed: false }): Promise<void> {
    const session = this.session;
    if (!session) return;
    this.session = null;
    this.hideWidget();

    const { model, match } = session;
    if (model.isDisposed()) return;

    const range = model.getDecorationRange(session.placeholderDecorationId);
    model.deltaDecorations([session.placeholderDecorationId], []);
    if (!range || model.getValueInRange(range) !== UNIFORM_NAME) {
      console.error('❌ Nudgebox: Placeholder not found; value was not written back');
      return;
    }

    const newText = result.confirmed ? this.formatValue(result.value, match) : match.text;
    applyModelEdits(model, [{ range, text: newText }]);

    const saveTarget = this.captureSaveTarget(model);

    if (this.editor.getModel() === model) {
      // キャレット位置を数値の末尾へ
      const pos = { lineNumber: range.startLineNumber, column: range.startColumn + newText.length };
      this.editor.setPosition(pos);
      this.editor.revealPositionInCenterIfOutsideViewport(pos);
      this.editor.focus();
    }

    // 起動時の保存（u_inline1f 入り）が後から書き込まれないよう、完了を待ってから保存する
    await session.pendingSave;
    if (!result.confirmed) {
      // Blenderに元の値を送信（復旧）
      await this.sendValueToBlenderInternal(match.value);
    }
    if (saveTarget) {
      await this.writeSaveTarget(saveTarget);
    }
  }

  /**
   * 確定値をソースに書き込む文字列へ変換
   */
  private formatValue(value: number, match: FloatMatch): string {
    // 負の値で前の演算子が「-」の場合はカッコで囲む
    if (value < 0 && match.precedingOperator === '-') {
      return `(${value})`;
    }
    return value.toString();
  }

  /**
   * ウィジェットを非表示
   */
  private hideWidget(): void {
    if (this.widget) {
      this.editor.removeContentWidget(this.widget);
      this.widget.dispose();
      this.widget = null;
    }
  }

  private getPlaceholderRange(): monaco.Range | null {
    if (!this.session || this.session.model.isDisposed()) return null;
    return this.session.model.getDecorationRange(this.session.placeholderDecorationId);
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
   * 保存対象（モデルに対応するタブと、その時点の内容）を同期的に確定する
   * アクティブタブではなくモデルからタブを引くので、タブ切替後でも正しいファイルに保存できる
   */
  private captureSaveTarget(model: monaco.editor.ITextModel): SaveTarget | null {
    const tabs = (window as any).__ERNST_BUFFER_TABS__ as FileTab[] | undefined;
    const tab = tabs?.find(t => t.model === model);
    if (!tab || !tab.filePath) {
      console.warn('⚠️ Nudgebox: No saved file for this buffer; skipped saving');
      return null;
    }
    return {
      tabId: tab.id,
      filePath: tab.filePath,
      content: model.getValue(),
      model,
      versionId: model.getAlternativeVersionId()
    };
  }

  private async writeSaveTarget(target: SaveTarget): Promise<void> {
    // エクスプローラーで削除されたファイルを書き戻しで再作成しないよう、既存ファイルにのみ書き込む
    const result = await electronClient.saveFile(target.filePath, target.content, { format: false, mustExist: true });
    if (!result.success) {
      console.error('❌ Nudgebox: Failed to save file:', result.error);
      return;
    }
    // 保存中に編集が入っていなければ保存済み扱いにする
    const { model } = target;
    if (!model.isDisposed() && model.getAlternativeVersionId() === target.versionId) {
      this.updateTabCallback(target.tabId, { content: target.content, isModified: false });
    }
  }

  /**
   * リソース清理
   */
  public dispose(): void {
    this.finish({ confirmed: false });
    this.listeners.forEach(l => l.dispose());
    this.listeners = [];
  }
}
