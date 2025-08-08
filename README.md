# Ernst Editor

GLSL 向けの軽量エディタ。Blender と連携し、コード内の数値をインラインで調整できる。

## 概要
- Monaco Editor ベース
- Blender 連携（WebSocket サーバが自動起動、ポート 8765）
- インライン数値編集（Inline Nudgebox）
- プロジェクトツリー、タブ、セッション保存（開いているファイル・エディタ状態・サイドバー幅）

注: 旧実装の InlineFloat は deprecated。現行は InlineNudgebox を使用。

## 使い方
1. Ernst Editor を起動
2. 左サイドバーでフォルダを開く、またはファイルを開く
3. GLSL コード内の数値をダブルクリックするとインラインの数値エディタが表示される
4. 値を調整すると即時に Blender へ送信される

サイドバーは境界をドラッグして幅を変更できる。幅はセッションに保存・復元される。

## 開発
### セットアップ
```bash
git clone https://github.com/yourusername/ErnstEditor.git
cd ErnstEditor
npm install
```

### スクリプト
- `npm run dev-electron` 開発実行（ホットリロード）
- `npm run build` バンドルのみ
- `npm run build-exe` Windows 向け実行ファイルを生成

出力: `build/ErnstEditor-win32-x64/ErnstEditor.exe`

## Blender 連携
- WebSocket サーバはアプリ起動時に自動開始（ポート 8765）
- 値更新はリアルタイムに送信される

## CLI から開く
```bash
ErnstEditor.exe "path/to/shader.glsl"
```

## セッション保存
- 対象: 開いているタブ、アクティブタブ、エディタのフォントサイズ、サイドバー幅
- 仕組み: `SESSION_SAVE`/`SESSION_LOAD` IPC とファイルによる永続化

## 主要構成
- `src/renderer/App.tsx`: アプリのルート。サイドバー/タブ/エディタのオーケストレーション。
- `src/components/EditorContainer.tsx`: Monaco 初期化と統合。自動レイアウト、ミニマップ設定、リサイズ時の `editor.layout()`。
- `src/components/SidebarPanel.tsx`: ファイルツリー/検索パネル。
- `src/components/TabManager.tsx`: タブ UI。
- `src/components/gui/InlineNudgebox/*`: インライン数値編集の実装。
- `src/hooks/useBufferManager.ts`: タブ/保存/パス更新などの中心ロジック。
- `src/hooks/useSessionManager.ts`: セッション保存/復元（`editorFontSize`/`sidebarWidth` を含む）。
- `src/services/electronClient.ts`: `window.electronAPI` の型付きラッパー。
- `src/constants/ipc.ts`: IPC チャネル定義。

## 設定（Monaco 抜粋）
- `automaticLayout: true`
- ミニマップ有効、右表示、`showSlider: 'always'`
- `wordWrap: 'on'`

## トラブルシューティング
- Blender に反映されない: Blender を再起動して接続を確認
- 8765 が使用中: ポートの競合を解消

## 要件
- Windows 10 以降 (x64)
- Node.js 18+ / npm（開発時）

## ライセンス
MIT