import * as monaco from 'monaco-editor';
import { FloatMarker, FloatMatch } from './types';

// glsl-tokenizerを使用した正確なGLSLトークン解析
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tokenizer = require('glsl-tokenizer/string');

/**
 * GLSLコード内の浮動小数点数を検出
 */
export class FloatDetector {
    /**
   * 指定した位置にある浮動小数点数を検出
   * @param model - Monaco Editor のモデル
   * @param position - 検出位置
   * @returns 浮動小数点数の情報、または null
   */
    static detectFloatAtPosition(
    model: monaco.editor.ITextModel,
    position: monaco.IPosition
  ): FloatMatch | null {

    const line = model.getLineContent(position.lineNumber);

        try {
      // GLSLコードをトークン化
      const tokens = tokenizer(line);

            // 各トークンをチェック
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        // floatタイプのトークンのみを対象
        if (token.type !== 'float') continue;

        // token.positionを使って正確な位置を計算
        const startColumn = token.position + 1; // Monaco は 1-indexed, glsl-tokenizer.position は 0-indexed
        const endColumn = startColumn + token.data.length;

        // クリック位置がトークン範囲内にあるかチェック
        if (position.column >= startColumn && position.column <= endColumn) {
          const range: monaco.IRange = {
            startLineNumber: position.lineNumber,
            startColumn: startColumn,
            endLineNumber: position.lineNumber,
            endColumn: endColumn
          };

          // 直前の空白以外の演算子を検索
          const precedingOperator = this.findPrecedingOperator(tokens, i);

          const value = parseFloat(token.data.replace(/f$/, '')); // 末尾のfを除去

          console.log('✅ Float detected:', {
            value,
            originalText: token.data,
            precedingOperator,
            range
          });

          return {
            value,
            range,
            text: token.data,
            precedingOperator
          } as FloatMatch;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 直前の空白以外の演算子を検索
   * @param tokens - 全トークン配列
   * @param floatIndex - 対象のfloatトークンのインデックス
   * @returns 演算子文字列またはundefined
   */
  private static findPrecedingOperator(tokens: any[], floatIndex: number): string | undefined {
    // floatトークンより前のトークンを逆順で検索
    for (let i = floatIndex - 1; i >= 0; i--) {
      const token = tokens[i];

      // 空白はスキップ
      if (token.type === 'whitespace') continue;

      // 演算子の場合は返す
      if (token.type === 'operator') {
        console.log('🔍 Found preceding operator:', token.data);
        return token.data;
      }

      // 演算子以外が見つかったら検索終了
      break;
    }

    return undefined;
  }

  /**
   * GLSLコード全体から浮動小数点数を検出
   * @param model - Monaco Editor のモデル
   * @returns すべての浮動小数点数の配列
   */
  static detectAllFloats(model: monaco.editor.ITextModel): FloatMatch[] {
    const results: FloatMatch[] = [];
    const lineCount = model.getLineCount();

    for (let lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
      const line = model.getLineContent(lineNumber);

      try {
        const tokens = tokenizer(line);

                for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];

          // floatタイプのトークンのみを対象
          if (token.type !== 'float') continue;

          const startColumn = token.position + 1; // Monaco は 1-indexed, glsl-tokenizer.position は 0-indexed
          const endColumn = startColumn + token.data.length;

          const range: monaco.IRange = {
            startLineNumber: lineNumber,
            startColumn: startColumn,
            endLineNumber: lineNumber,
            endColumn: endColumn
          };

          // 直前の空白以外の演算子を検索
          const precedingOperator = this.findPrecedingOperator(tokens, i);

          const value = parseFloat(token.data.replace(/f$/, '')); // 末尾のfを除去

          results.push({
            value,
            range,
            text: token.data,
            precedingOperator
          } as FloatMatch);
        }
      } catch (error) {
        continue;
      }
    }
    return results;
  }
}

/**
 * マーカー管理クラス
 */
export class MarkerManager {
  private markers: Map<string, FloatMarker> = new Map();
  private editor: monaco.editor.IStandaloneCodeEditor;
  private model: monaco.editor.ITextModel;

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;
    this.model = editor.getModel()!;
  }

  /**
   * マーカーを作成
   * @param floatMatch - 浮動小数点数の情報
   * @returns 作成されたマーカー
   */
  createMarker(floatMatch: FloatMatch): FloatMarker {
    const id = this.generateMarkerId();

    const marker: FloatMarker = {
      id,
      position: {
        lineNumber: floatMatch.range.startLineNumber,
        column: floatMatch.range.startColumn
      },
      range: floatMatch.range,
      originalValue: floatMatch.value,
      currentValue: floatMatch.value
    };

    // Monaco Editor の装飾マーカーを作成
    const decorations = this.editor.createDecorationsCollection([
      {
        range: floatMatch.range,
      options: {
          className: 'ernst-inline-float-marker',
          hoverMessage: { value: `Value: ${floatMatch.value}` },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      }
    ]);

    // マーカーIDを保存（削除時に使用）
    if (decorations.length > 0) {
      marker.markerId = decorations.getRange(0)?.toString();
    }

    this.markers.set(id, marker);
    return marker;
  }

  /**
   * マーカーを削除
   * @param markerId - マーカーID
   */
  removeMarker(markerId: string): void {
    const marker = this.markers.get(markerId);
    if (marker) {
      // Monaco Editor の装飾も削除
      // Note: decorationsCollection は自動的にガベージコレクションされる
      this.markers.delete(markerId);
    }
  }

  /**
   * 一時的なマーカーテキストを追加
   * @param marker - マーカー
   * @param suffix - 追加するテキスト（例: "+u_inline1f"）
   */
  addTemporaryMarker(marker: FloatMarker, suffix: string = '+u_inline1f'): void {
    const currentText = this.model.getValueInRange(marker.range);
    const newText = currentText + suffix;

    // テキストを一時的に置換
    this.editor.executeEdits('inline-float-marker', [
      {
        range: marker.range,
        text: newText
      }
    ]);

    // 範囲を更新
    marker.range = {
      ...marker.range,
      endColumn: marker.range.endColumn + suffix.length
    };
  }

  /**
   * 一時的なマーカーテキストを削除
   * @param marker - マーカー
   * @param suffix - 削除するテキスト
   */
  removeTemporaryMarker(marker: FloatMarker, suffix: string = '+u_inline1f'): void {
    const currentText = this.model.getValueInRange(marker.range);
    const originalText = currentText.replace(suffix, '');

    // テキストを元に戻す
    this.editor.executeEdits('inline-float-marker', [
      {
        range: marker.range,
        text: originalText
      }
    ]);

    // 範囲を更新
    marker.range = {
      ...marker.range,
      endColumn: marker.range.endColumn - suffix.length
    };
  }

  /**
   * マーカーの値を更新
   * @param markerId - マーカーID
   * @param newValue - 新しい値
   */
  updateMarkerValue(markerId: string, newValue: number): void {
    const marker = this.markers.get(markerId);
    if (!marker) return;

    marker.currentValue = newValue;

    // テキストを更新（一時マーカーを除く）
    const currentText = this.model.getValueInRange(marker.range);
    const withoutMarker = currentText.replace('+u_inline1f', '');
    const newText = newValue.toString();
    const finalText = newText + (currentText.includes('+u_inline1f') ? '+u_inline1f' : '');

    this.editor.executeEdits('inline-float-update', [
      {
        range: marker.range,
        text: finalText
      }
    ]);

    // 範囲を調整
    const textLengthChange = finalText.length - currentText.length;
    marker.range = {
      ...marker.range,
      endColumn: marker.range.endColumn + textLengthChange
    };
  }

  /**
   * マーカーを確定（一時マーカーを削除して値を保存）
   * @param markerId - マーカーID
   */
  confirmMarker(markerId: string): void {
    const marker = this.markers.get(markerId);
    if (!marker) return;

    // 一時マーカーを削除
    this.removeTemporaryMarker(marker);

    // 最終値でテキストを更新
    this.editor.executeEdits('inline-float-confirm', [
      {
        range: marker.range,
        text: marker.currentValue.toString()
      }
    ]);

    // マーカーを削除
    this.removeMarker(markerId);
  }

  /**
   * マーカーをキャンセル（元の値に戻す）
   * @param markerId - マーカーID
   */
  cancelMarker(markerId: string): void {
    const marker = this.markers.get(markerId);
    if (!marker) return;

    // 一時マーカーを削除
    this.removeTemporaryMarker(marker);

    // 元の値でテキストを更新
    this.editor.executeEdits('inline-float-cancel', [
      {
        range: marker.range,
        text: marker.originalValue.toString()
      }
    ]);

    // マーカーを削除
    this.removeMarker(markerId);
  }

  /**
   * マーカーを取得
   * @param markerId - マーカーID
   */
  getMarker(markerId: string): FloatMarker | undefined {
    return this.markers.get(markerId);
  }

  /**
   * すべてのマーカーを取得
   */
  getAllMarkers(): FloatMarker[] {
    return Array.from(this.markers.values());
  }

  /**
   * すべてのマーカーをクリア
   */
  clearAllMarkers(): void {
    this.markers.forEach((_, id) => this.removeMarker(id));
  }

  /**
   * ユニークなマーカーIDを生成
   */
  private generateMarkerId(): string {
    return `ernst_marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}