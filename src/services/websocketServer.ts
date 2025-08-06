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

  constructor(port: number = 8765) {
    this.port = port;
  }

  /**
   * WebSocketサーバーを開始
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({
          port: this.port,
          host: 'localhost'
        });

        this.wss.on('listening', () => {
          console.log(`🚀 Ernst WebSocket Server started on port ${this.port}`);
          this.isRunning = true;
          resolve();
        });

        this.wss.on('connection', (ws: WebSocket, request) => {
          console.log('🔌 Blender client connected');
          this.clients.add(ws);

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
            console.log('🔌 Blender client disconnected');
            this.clients.delete(ws);
          });

          ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error);
            this.clients.delete(ws);
          });
        });

        this.wss.on('error', (error) => {
          console.error('❌ WebSocket Server error:', error);
          reject(error);
        });

      } catch (error) {
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
        this.wss.close(() => {
          console.log('🛑 Ernst WebSocket Server stopped');
          this.isRunning = false;
          this.clients.clear();
          resolve();
        });
      } else {
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
      console.log(`📨 Received from Blender: ${data.type}`, data.data);

      switch (data.type) {
        case 'ping':
          // ping応答
          this.sendPong(ws, data.data as PingData);
          break;

        case 'pong':
          // pong受信（ヘルスチェック成功）
          console.log('💓 Pong received from Blender');
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
    console.log(`🎛️ Sending uniform to Blender: u_inline1f = ${value}`);
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
}

// シングルトンインスタンス
export const webSocketServer = new ErnstWebSocketServer();