# Windowsタスクバーでの「Electron」表示問題 - 解決方法

## 問題
ErnstEditorアプリをWindowsで起動すると、タスクバーに「Electron」と表示され、デフォルトのアイコンが使用されてしまう問題。

## 原因
1. **`app.setAppUserModelId`が設定されていない** - Windowsがアプリを識別できない
2. **Windowsのアプリケーションキャッシュ** - 一度「Electron」として認識されるとキャッシュされる
3. **electron-builderの設定不足** - アイコンとアプリケーション名の設定が不完全

## 解決策

### 1. main.tsにsetAppUserModelIdを追加

```typescript
// アプリの準備完了
app.whenReady().then(() => {
  // アプリケーション名を設定
  app.setName('Ernst Editor');

  // WindowsでのアプリケーションID設定（重要！）
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.ernst-editor.app');
  }

  createWindow();
  initializeWebSocketServer();
});
```

### 2. package.jsonの設定確認

```json
{
  "name": "ernst-editor",
  "productName": "Ernst Editor",
  "build": {
    "appId": "com.ernst-editor.app",
    "productName": "Ernst Editor",
    "win": {
      "target": "portable",
      "icon": "assets/icons/icons/win/icon.ico",
      "requestedExecutionLevel": "asInvoker"
    }
  }
}
```

### 3. Windowsキャッシュのクリア

```powershell
# エクスプローラーを再起動してキャッシュクリア
taskkill /f /im explorer.exe
explorer.exe
```

### 4. クリーンビルド

```bash
# 既存のビルドファイルを削除
Remove-Item -Recurse -Force dist-electron

# 新しくビルド
npm run dist-win
```

## 重要ポイント

- **setAppUserModelId**: package.jsonのappIdと同じ値を設定
- **Windowsキャッシュ**: エクスプローラー再起動でクリア
- **アイコンパス**: 正しいパスと形式（.ico）を確認
- **クリーンビルド**: キャッシュをクリアしてから再ビルド

## 検証方法

1. 新しくビルドしたEXEファイルを実行
2. タスクバーで「Ernst Editor」と表示されることを確認
3. カスタムアイコンが表示されることを確認
4. Windowsファイアウォールダイアログで正しいアプリ名が表示されることを確認