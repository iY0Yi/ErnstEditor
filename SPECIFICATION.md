# Ernst Editor - 完全仕様書

## プロジェクト概要

**Ernst Editor** は、Blenderとの連携機能を持つ高度なGLSLシェーダーエディタです。リアルタイムでのユニフォーム値変更とBlender Viewport更新を実現する革新的なワークフローを提供します。

## 技術スタック

### コア技術
- **Electron 37.1.0** - デスクトップアプリケーション基盤
- **React 19.1.0** - UI フレームワーク
- **TypeScript 5.8.3** - 型安全な開発
- **Monaco Editor 0.52.2** - コードエディタエンジン
- **WebSocket (ws 8.18.3)** - Blender通信

### UI/UX ライブラリ
- **react-arborist 3.4.3** - ファイルツリー表示
- **Material Symbols** - アイコンシステム
- **カスタムフォント**: Mulish (UI) + Overpass Mono (コード)



## 主要機能詳細

### 1. 🎯 インラインスライダー機能（コア機能）
```glsl
float myValue = 0.5; // ダブルクリック → スライダー表示
```

**動作フロー:**
1. 浮動小数点数をダブルクリック
2. `0.5+u_inline1f` マーカー自動追加
3. インタラクティブスライダー表示
4. リアルタイム値変更 → Blender送信
5. スライダーをダブルクリックで確定 → マーカー削除、新しい値保存
6. または、スライダーの領域外をダブルクリックで破棄 → マーカー削除、古い値を保持

**技術実装:**
- `src/components/gui/InlineFloat/` - スライダーUI
- Monaco Editor Widget として実装
- CSS Overlay でプレビューの値を表示
- `BlenderService` 経由でWebSocket通信

### 2. 🔗 Blender連携システム
**WebSocket通信 (Port 8765):**
```typescript
interface BlenderMessage {
  type: 'update_uniform' | 'ping' | 'pong' | 'error';
  data: UniformData | PingData | ErrorData;
}
```

**サポート機能:**
- ユニフォーム値のリアルタイム送信
- 接続状態監視
- ping/pong ヘルスチェック
- エラーハンドリング

<!--
### 3. 📁 ファイル管理システム
**ファイルエクスプローラー:**
- react-arborist ベースのツリー表示
- ファイル/フォルダのリネーム (F2キー)
- ドラッグ&ドロップによる移動
- Material Icons による視覚的ファイルタイプ判別

**対応ファイル形式:**
- `.glsl`, `.frag`, `.vert` - シェーダーファイル
- `.js`, `.ts` - スクリプトファイル
- `.json` - 設定ファイル

### 4. 📋 タブ管理システム
**機能:**
- 複数ファイル同時編集
- 未保存変更トラッキング (`isDirty`)
- タブの並び替え (ドラッグ&ドロップ)
- セッション保存・復元
-->

**セッション管理詳細:**
```typescript
interface SessionData {
  openTabs: SessionTab[];
  projectPath: string;
  lastModified: number;
}

interface SessionTab {
  filePath: string;
  isActive: boolean;
  lastEditLine?: number;
}
```

**セッション保存場所:**
```
プロジェクトディレクトリ/
└── .ernst/
    └── session.json
```

**セッション管理フロー:**
1. **自動保存タイミング:**
   - プロジェクト切り替え時
   - タブ開閉時
   - アプリケーション終了時
   - 定期保存 (5分間隔)

2. **復元条件:**
   - プロジェクト再オープン時
   - セッションデータの妥当性チェック合格
   - ファイル存在確認

3. **除外対象:**
   - untitledファイル (未保存の新規ファイル)
   - 存在しなくなったファイル

**Recent Projects管理:**
```typescript
interface RecentProject {
  name: string;
  path: string;
  lastOpened: number;
}
```

**Recent Projects仕様:**
- 最大10件まで保持
- 最近アクセス順でソート
- 存在しないパスは自動削除
- グローバル設定として保存

<!--
### 5. 🔍 検索システム
**プロジェクト内検索:**
- 正規表現サポート
- 大文字小文字区別切り替え
- 単語単位検索
- ファイル種別フィルタリング

### 6. 🎨 テーマ・設定システム

**設定階層:**
```
base.json (基本設定)
├── development.json (開発環境)
├── production.json (本番環境)
└── themes/
    ├── ernst-dark.json
    └── ernst-monotone.json
```

**拡張テーマシステム:**
```json
{
  "name": "Ernst Dark",
  "type": "dark",
  "ui": { /* UI色設定 */ },
  "syntax": { /* シンタックス色 */ },
  "editor": { /* エディタ色 */ },
  "opacity": { /* 透明度設定 */ }
}
```

### 7. 🔧 GLSL言語サポート
**Monaco Editor統合:**
- カスタムGLSLシンタックスハイライト
- 組み込み関数・変数の認識
- オートコンプリート
- エラー検出

**サポート要素:**
- 組み込み関数: `abs`, `cos`, `texture`, etc.
- データ型: `vec2`, `mat4`, `sampler2D`, etc.
- 組み込み変数: `gl_Position`, `gl_FragColor`, etc.
-->

## アーキテクチャ構造

### フロントエンド階層
```
src/renderer/App.tsx
├── components/
│   ├── CodeEditor.tsx
│   ├── TabManager.tsx
│   ├── FileExplorer.tsx
│   ├── SidebarPanel.tsx
│   └── gui/InlineFloat/
├── hooks/
│   ├── useTabManager.ts
│   ├── useProjectManager.ts
│   └── useFileOperations.ts
└── services/
    ├── blenderService.ts
    ├── fileService.ts
    └── sessionService.ts
```

### バックエンド構造
```
src/main.ts
├── services/
│   └── websocketServer.ts
├── config/
│   ├── ConfigManager.ts
│   └── presets/
└── types/
    └── index.ts
```

<!--
## ビルド・開発環境

### Webpack設定
- **開発サーバー**: `http://localhost:9101`
- **ホットリロード**: 有効
- **Monaco Editor Plugin**: GLSL言語サポート
- **ソースマップ**: 開発時有効

### NPMスクリプト
```bash
npm run dev-electron    # 開発環境起動
npm run build-all      # 全体ビルド
npm run dist          # 配布用パッケージ作成
```

## 設定システム詳細

### 設定ファイル優先順位
1. **ユーザー設定** (`userData/config/`)
2. **デフォルト設定** (`src/config/presets/`)
3. **ハードコードデフォルト** (ConfigManager内)

### リアルタイム設定更新
- ファイル監視 (500ms ポーリング)
- 設定変更の自動反映
- CSS変数による即座のUI更新

## ⚙️ 現在の実装状況

### 完全実装済み
- ✅ Monaco Editor統合
- ✅ GLSL言語サポート
- ✅ ファイルツリー表示
- ✅ タブ管理UI
- ✅ テーマシステム
- ✅ WebSocket通信基盤

### 部分実装
- 🔄 **インラインスライダー** - UI実装済み、Blender通信は動作するが安定性に課題
- 🔄 **設定システム** - 基本機能は動作するが複雑すぎる構造
- 🔄 **セッション管理** - 上位ロジック実装済み、ファイルI/O層が未実装

### 未実装・問題あり
- ❌ **エラーハンドリング** - 断片的な対応のみ
- ❌ **単体テスト** - 全く存在しない
- ❌ **セッション永続化** - FileService層で未実装
- ❌ **WebSocket自動復旧** - 接続断時の復旧機能なし

## 🚨 既存の問題点・改善ポイント

### 1. **アーキテクチャ課題**
- 設定システムが過度に複雑
- コンポーネント間の責任境界が曖昧
- エラーハンドリングが断片的

### 2. **パフォーマンス課題**
- 大容量ファイルツリーでの表示遅延
- Monaco Editor初期化の重複処理
- メモリリークの可能性

### 3. **安定性課題**
- WebSocket接続断時の自動復旧なし
- ファイル操作時のレースコンディション
- セッション復元の失敗ケース未対応
- セッション管理のファイルI/O層が未実装

### 4. **UX課題**
- 設定変更のフィードバック不足
- エラーメッセージの国際化なし
- キーボードショートカットの不統一

### 5. **開発効率課題**
- 単体テストの不在
- 型定義の不完全性
- デバッグ情報の過多

## 推奨リアーキテクチャ方針

### 1. **セッション管理の完全実装**
- FileService層でのファイルI/O実装
- main.tsでのIPCハンドラー追加
- セッション競合解決機能
- セッション破損時の復旧機能
- 定期保存とバックアップ機能

### 2. **設定システム簡素化**
- 設定ファイル構造の平坦化
- デフォルト値の一元管理
- 設定変更APIの統一

### 3. **コンポーネント再設計**
- 単一責任原則の徹底
- カスタムフックの活用
- 状態管理の中央集権化

### 4. **エラーハンドリング強化**
- グローバルエラーバウンダリ
- ユーザーフレンドリーなエラー表示
- ログシステムの構築
- WebSocket自動復旧機能

### 5. **パフォーマンス最適化**
- 仮想化によるファイルツリー高速化
- Monaco Editor遅延読み込み
- メモリ使用量の監視

### 6. **開発基盤整備**
- Jest + React Testing Library
- ESLint + Prettier 統一
- CI/CD パイプライン構築

---

## 次のステップ

この詳細仕様書をベースに、以下の順序で再構築を推奨：

1. **セッション管理完全実装** - ファイルI/O層の実装、永続化機能
2. **コア機能の安定化** - インラインスライダー機能の安定性向上
3. **アーキテクチャ整理** - 責任境界の明確化、設定システム簡素化
4. **エラーハンドリング強化** - 堅牢性の向上、WebSocket自動復旧
5. **パフォーマンス最適化** - ユーザー体験の改善
6. **開発環境整備** - テストフレームワーク、保守性向上

### 🎯 優先実装項目

**Phase 1 (基盤安定化):**
- セッションファイルI/O実装
- WebSocket自動復旧機能
- グローバルエラーハンドリング

**Phase 2 (機能強化):**
- インラインスライダー安定性改善
- ファイルツリー仮想化
- 設定システム再設計

**Phase 3 (開発効率):**
- 単体テスト導入
- ESLint/Prettier設定
- CI/CDパイプライン -->


## Blender側の実装
```python
class ErnstEditorConnection:
    """Ernst EditorとBlenderを接続するクラス（標準ライブラリ版）"""

    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.socket = None
        self.connected = False
        self.running = False

        sgd.current_shader_values = {}

    def _generate_websocket_key(self):
        """WebSocketキーを生成"""
        import random
        import string
        key = ''.join(random.choice(string.ascii_letters + string.digits) for _ in range(16))
        return base64.b64encode(key.encode()).decode()

    def _create_websocket_handshake(self):
        """WebSocketハンドシェイクを作成"""
        key = self._generate_websocket_key()
        request = f"GET / HTTP/1.1\r\n"
        request += f"Host: {self.host}:{self.port}\r\n"
        request += "Upgrade: websocket\r\n"
        request += "Connection: Upgrade\r\n"
        request += f"Sec-WebSocket-Key: {key}\r\n"
        request += "Sec-WebSocket-Version: 13\r\n"
        request += "\r\n"
        return request.encode(), key

    def _parse_frame(self, data):
        """WebSocketフレームを解析"""
        if len(data) < 2:
            return None, data

        first_byte = data[0]
        second_byte = data[1]

        fin = (first_byte & 0x80) != 0
        opcode = first_byte & 0x0f
        masked = (second_byte & 0x80) != 0
        payload_length = second_byte & 0x7f

        offset = 2

        # 拡張ペイロード長
        if payload_length == 126:
            if len(data) < offset + 2:
                return None, data
            payload_length = struct.unpack('>H', data[offset:offset+2])[0]
            offset += 2
        elif payload_length == 127:
            if len(data) < offset + 8:
                return None, data
            payload_length = struct.unpack('>Q', data[offset:offset+8])[0]
            offset += 8

        # マスクキー
        if masked:
            if len(data) < offset + 4:
                return None, data
            mask_key = data[offset:offset+4]
            offset += 4

        # ペイロード
        if len(data) < offset + payload_length:
            return None, data

        payload = data[offset:offset+payload_length]

        if masked:
            payload = bytearray(payload)
            for i in range(len(payload)):
                payload[i] ^= mask_key[i % 4]
            payload = bytes(payload)

        remaining_data = data[offset+payload_length:]

        if opcode == 1:  # テキストフレーム
            return payload.decode('utf-8'), remaining_data
        elif opcode == 8:  # クローズフレーム
            return 'CLOSE', remaining_data

        return None, remaining_data


    def _create_frame(self, message):
        """WebSocketフレームを作成"""
        import random
        message_bytes = message.encode('utf-8')
        length = len(message_bytes)

        # フレームヘッダー
        frame = bytearray()
        frame.append(0x81)  # FIN=1, opcode=1 (text)

        # マスクビットを設定
        if length < 126:
            frame.append(0x80 | length)  # MASK=1
        elif length < 65536:
            frame.append(0x80 | 126)     # MASK=1
            frame.extend(struct.pack('>H', length))
        else:
            frame.append(0x80 | 127)     # MASK=1
            frame.extend(struct.pack('>Q', length))

        # マスクキーを生成（4バイト）
        mask_key = bytes([random.randint(0, 255) for _ in range(4)])
        frame.extend(mask_key)

        # ペイロードをマスク
        masked_payload = bytearray()
        for i, byte in enumerate(message_bytes):
            masked_payload.append(byte ^ mask_key[i % 4])

        frame.extend(masked_payload)
        return bytes(frame)


    def connect(self):
        """WebSocketサーバーに接続"""
        try:
            print(f"🔌 Connecting to Ernst Editor at {self.host}:{self.port}")

            # ソケット接続
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.connect((self.host, self.port))

            # WebSocketハンドシェイク
            handshake, key = self._create_websocket_handshake()
            self.socket.send(handshake)

            # レスポンス受信
            response = self.socket.recv(1024).decode()
            if "101 Switching Protocols" in response:
                self.connected = True
                print("✅ Connected to Ernst Editor!")

                # 別スレッドでメッセージ受信開始
                self.running = True
                self.thread = threading.Thread(target=self._listen_for_messages)
                self.thread.daemon = True
                self.thread.start()

                # 接続確認のpingを送信
                self.send_message("ping", {"message": "Hello from Blender!"})
                sgd.is_editor_connected = True
            else:
                print("❌ WebSocket handshake failed")
                self.socket.close()
                sgd.is_editor_connected = False
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            if self.socket:
                self.socket.close()
                sgd.is_editor_connected = False

    def _listen_for_messages(self):
        """メッセージの受信ループ"""
        buffer = b''

        while self.running and self.connected:
            try:
                data = self.socket.recv(1024)
                if not data:
                    break

                buffer += data

                while buffer:
                    message, buffer = self._parse_frame(buffer)
                    if message is None:
                        break

                    if message == 'CLOSE':
                        self.connected = False
                        break

                    self._handle_message(message)

            except socket.timeout:
                continue
            except Exception as e:
                print(f"❌ Error receiving message: {e}")
                break

        self.connected = False
        sgd.is_editor_connected = False

    def _handle_message(self, message):
        """メッセージ処理"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            message_data = data.get("data", {})

            print(f"📨 Received: {message_type} -> {message_data}")

            if message_type == "ping":
                # ping応答
                self.send_message("pong", message_data)

            elif message_type == "update_uniform":
                # ユニフォーム値の更新
                self.handle_uniform_update(message_data)

        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse message: {e}")

    def disconnect(self):
        """接続を切断"""
        self.running = False
        self.connected = False
        if self.socket:
            try:
                # WebSocketクローズフレームを送信
                close_frame = bytearray([0x88, 0x00])  # FIN=1, opcode=8, length=0
                self.socket.send(close_frame)
            except:
                pass
            self.socket.close()
        sgd.is_editor_connected = False

    def send_message(self, msg_type, data):
        """メッセージ送信"""
        if self.socket and self.connected:
            try:
                message = json.dumps({"type": msg_type, "data": data})
                frame = self._create_frame(message)
                self.socket.send(frame)
            except Exception as e:
                print(f"❌ Failed to send message: {e}")

    def handle_uniform_update(self, data):
        """ユニフォーム値更新の処理"""
        uniform_name = 'u_inline1f'#data.get("name", "u_sliderValue")
        value = data.get("value", 0.0)

        print(f"🎛️ Updating uniform: {uniform_name} = {value}")

                # 値をキャッシュ
        sgd.current_shader_values[uniform_name] = value

        # 画面更新を強制
        try:
            # 方法1: 全エリアの再描画をタグ付け
            for window in bpy.data.window_managers[0].windows:
                for area in window.screen.areas:
                    area.tag_redraw()
        except Exception as e:
            try:
                # 方法2: ビューレイヤーを更新
                bpy.context.view_layer.update()
            except Exception as e2:
                try:
                    # 方法3: 現在のフレームを再設定
                    current_frame = bpy.context.scene.frame_current
                    bpy.context.scene.frame_set(current_frame)
                except Exception as e3:
                    print(f"Failed to force redraw: {e}, {e2}, {e3}")

# グローバル接続インスタンス
ernst_connection = None

def start_ernst_connection():
    """Ernst Editorとの接続を開始"""
    global ernst_connection

    if ernst_connection and ernst_connection.connected:
        print("⚠️ Already connected to Ernst Editor")
        return

    ernst_connection = ErnstEditorConnection()
    ernst_connection.connect()

def stop_ernst_connection():
    """Ernst Editorとの接続を停止"""
    global ernst_connection

    if ernst_connection:
        ernst_connection.disconnect()
        ernst_connection = None
        print("🔌 Ernst Editor connection stopped")

def get_connection_status():
    """接続状況を取得"""
    global ernst_connection

    if ernst_connection and ernst_connection.connected:
        return "Connected ✅"
    else:
        return "Disconnected ❌"

# Blenderのオペレーター定義
class ERNST_OT_connect(bpy.types.Operator):
    """Ernst Editorに接続"""
    bl_idname = "ernst.connect_to_editor"
    bl_label = "Connect to Ernst Editor"

    def execute(self, context):
        start_ernst_connection()
        self.report({'INFO'}, "Connecting to Ernst Editor...")
        return {'FINISHED'}

class ERNST_OT_disconnect(bpy.types.Operator):
    """Ernst Editorから切断"""
    bl_idname = "ernst.disconnect"
    bl_label = "Disconnect from Ernst Editor"

    def execute(self, context):
        stop_ernst_connection()
        self.report({'INFO'}, "Disconnected from Ernst Editor")
        return {'FINISHED'}

# 3Dビューポートヘッダーに接続状況を表示する関数
def draw_editor_connection_status(self, context):
    """3Dビューポートのヘッダーに Ernst Editor の接続状況を表示"""
    layout = self.layout

    # Ernst エンジンが有効な場合のみ表示
    if context.scene.render.engine == 'ERNST':
        layout.separator()

        row = layout.row(align=True)
        col = row.column(align=True)
        col.label(text="Ernst Editor")
        col = row.column(align=True)
        if sgd.is_editor_connected:
            col.alert = True
            col.operator(ERNST_OT_disconnect.bl_idname, text="", icon='UNLINKED', emboss=False)
        else:
            col.operator(ERNST_OT_connect.bl_idname, text="", icon='LINKED', emboss=False)
```


## session.json
```json
{
  "openTabs": [
    {
      "filePath": "C:\\Users\\atsuh\\Dropbox\\pworks\\BalloonFight\\track\\uber_scripts\\pmod\\pmod_assign_gcp_torso_chest.frag",
      "isActive": false
    },
    {
      "filePath": "C:\\Users\\atsuh\\Dropbox\\pworks\\BalloonFight\\track\\uber_scripts\\sdf3d\\inc_cliff.glsl",
      "isActive": true
    }
  ],
  "projectPath": "C:\\Users\\atsuh\\Dropbox\\pworks\\BalloonFight\\track",
  "lastModified": 1754292613123
}
```