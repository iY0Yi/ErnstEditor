# Ernst Editor Icons

## アイコンの作成方法

### 1. ソース画像の準備
- `assets/icons/source/icon.png` に1024x1024px以上のPNG画像を配置してください
- アスペクト比は1:1（正方形）である必要があります
- 推奨サイズ：1024x1024px以上

### 2. アイコンの生成
以下のコマンドを実行してアイコンファイルを生成します：

```bash
npm run make-icons
```

### 3. 生成されるファイル
このコマンドを実行すると、以下のファイルが生成されます：

```
assets/icons/
├── mac/
│   └── icon.icns          # macOS用アイコン
├── win/
│   └── icon.ico           # Windows用アイコン
└── png/
    ├── 16x16.png
    ├── 24x24.png
    ├── 32x32.png
    ├── 48x48.png
    ├── 64x64.png
    ├── 96x96.png
    ├── 128x128.png
    ├── 256x256.png
    ├── 512x512.png
    └── 1024x1024.png      # 各サイズのPNGアイコン
```

### 4. アプリケーションでの使用
生成されたアイコンは、Electronアプリのビルド時に自動的に使用されます。

- Windows版: `assets/icons/win/icon.ico`
- macOS版: `assets/icons/mac/icon.icns`

### ライブラリ
アイコン生成には [electron-icon-maker](https://www.npmjs.com/package/electron-icon-maker) を使用しています。