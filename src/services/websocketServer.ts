import { WebSocketServer, WebSocket } from 'ws';

export interface BlenderMessage {
  type: 'update_uniform' | 'ping' | 'pong' | 'error';
  data: UniformData | PingData | ErrorData;
}

export interface UniformData {
  value: number; // Blender側では uniform名が u_inline1f に固定されているため、値のみ送信
}

export interface PingData {
  message?: string;
  timestamp?: number;
}

export interface ErrorData {
  message: string;
  code?: string;
}

export class ErnstWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number = 8765;
  private isRunning: boolean = false;
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();

  constructor(port: number = 8765) {
    this.port = port;
  }

  /**
   * WebSocketサーバーを開始
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {

        // 既に起動している場合はスキップ
        if (this.wss && this.isRunning) {
          resolve();
          return;
        }

        this.wss = new WebSocketServer({
          port: this.port,
          host: 'localhost'
        });

        this.wss.on('listening', () => {
          this.isRunning = true;
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket, request) => {
          this.clients.add(ws);

          // 接続状態変更を通知
          this.notifyConnectionChange(true);

          // 接続確認のpingを送信
          this.sendPing(ws);

          ws.on('message', (data: Buffer) => {
            try {
              const message = data.toString();
              this.handleMessage(ws, message);
            } catch (error) {
              console.error('❌ Error handling message:', error);
              this.sendError(ws, 'Invalid message format');
            }
          });

          ws.on('close', () => {
            this.clients.delete(ws);

            // 接続状態変更を通知（クライアントがいなくなった場合のみ）
            if (this.clients.size === 0) {
              this.notifyConnectionChange(false);
            }
          });

          ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
            this.clients.delete(ws);
          });
        });

        this.wss.on('error', (error) => {
          console.error('❌ WebSocket Server error:', error);
          this.isRunning = false;
          reject(error);
        });

        // タイムアウト処理を追加
        const timeout = setTimeout(() => {
          console.error('⏰ WebSocket Server startup timeout');
          this.isRunning = false;
          reject(new Error('WebSocket Server startup timeout'));
        }, 5000);

        // 成功時はタイムアウトをクリア
        this.wss.on('listening', () => {
          clearTimeout(timeout);
        });

      } catch (error) {
        console.error('❌ WebSocket Server creation failed:', error);
        this.isRunning = false;
        reject(error);
      }
    });
  }

  /**
   * WebSocketサーバーを停止
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        // すべてのクライアント接続を強制終了
        this.clients.forEach(client => {
          if (client.readyState === client.OPEN) {
            client.close();
          }
        });
        this.clients.clear();

        // サーバーを停止
        this.wss.close((error) => {
          if (error) {
            console.error('❌ Error closing WebSocket server:', error);
          } else {
          }
          this.isRunning = false;
          this.wss = null;
          resolve();
        });

        // タイムアウト設定（1秒で強制終了）
        setTimeout(() => {
          this.isRunning = false;
          this.wss = null;
          resolve();
        }, 1000);
      } else {
        this.isRunning = false;
        resolve();
      }
    });
  }

  /**
   * メッセージ処理
   */
  private handleMessage(ws: WebSocket, message: string): void {
    try {
      const data: BlenderMessage = JSON.parse(message);

      switch (data.type) {
        case 'ping':
          // ping応答
          this.sendPong(ws, data.data as PingData);
          break;

        case 'pong':
          // pong受信（ヘルスチェック成功）
          break;

        case 'error':
          // エラー受信
          const errorData = data.data as ErrorData;
          console.error('❌ Error from Blender:', errorData.message);
          break;

        default:
          console.warn('⚠️ Unknown message type:', data.type);
          this.sendError(ws, `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
      this.sendError(ws, 'Invalid JSON format');
    }
  }

  /**
   * ユニフォーム値をBlenderに送信
   */
  sendUniformUpdate(value: number): void {
    const message: BlenderMessage = {
      type: 'update_uniform',
      data: { value }
    };

    this.broadcastMessage(message);
  }

  /**
   * pingをBlenderに送信
   */
  private sendPing(ws: WebSocket): void {
    const message: BlenderMessage = {
      type: 'ping',
      data: {
        message: 'Hello from Ernst Editor!',
        timestamp: Date.now()
      }
    };

    this.sendMessage(ws, message);
  }

  /**
   * pongをBlenderに送信
   */
  private sendPong(ws: WebSocket, pingData: PingData): void {
    const message: BlenderMessage = {
      type: 'pong',
      data: {
        ...pingData,
        timestamp: Date.now()
      }
    };

    this.sendMessage(ws, message);
  }

  /**
   * エラーをBlenderに送信
   */
  private sendError(ws: WebSocket, errorMessage: string): void {
    const message: BlenderMessage = {
      type: 'error',
      data: {
        message: errorMessage,
        code: 'ERNST_ERROR'
      }
    };

    this.sendMessage(ws, message);
  }

  /**
   * 単一クライアントにメッセージ送信
   */
  private sendMessage(ws: WebSocket, message: BlenderMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    }
  }

  /**
   * 全クライアントにメッセージ送信
   */
  private broadcastMessage(message: BlenderMessage): void {
    this.clients.forEach(ws => {
      this.sendMessage(ws, message);
    });
  }

  /**
   * 接続状態を取得
   */
  getConnectionStatus(): { isRunning: boolean; clientCount: number } {
    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size
    };
  }

  /**
   * 接続されているBlenderクライアント数
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * サーバーが動作しているかどうか
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 接続状態変更のコールバックを登録
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.add(callback);

    // 現在の接続状態を即座に通知
    callback(this.clients.size > 0);

    // アンサブスクライブ関数を返す
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * 接続状態変更を通知（内部使用）
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('❌ Error in connection callback:', error);
      }
    });
  }
}

// シングルトンインスタンス
export const webSocketServer = new ErnstWebSocketServer();