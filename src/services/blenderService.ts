import { webSocketServer } from './websocketServer';

export class BlenderService {
  private static instance: BlenderService | null = null;
  private connectionCallbacks: Set<(connected: boolean) => void> = new Set();
  private valueCallbacks: Set<(value: number) => void> = new Set();

  private constructor() {
    // シングルトンパターン
  }

  /**
   * BlenderServiceのシングルトンインスタンスを取得
   */
  static getInstance(): BlenderService {
    if (!BlenderService.instance) {
      BlenderService.instance = new BlenderService();
    }
    return BlenderService.instance;
  }

  /**
   * Blenderサービスを開始
   */
  async start(): Promise<void> {
    try {
      await webSocketServer.start();

      // WebSocketサーバーの接続状態変更を監視
      webSocketServer.onConnectionChange((connected) => {
        console.log('🔗 WebSocket connection state changed:', connected);
        this.notifyConnectionChange(connected);
      });

      console.log('✅ Blender Service started successfully');
    } catch (error) {
      console.error('❌ Failed to start Blender Service:', error);
      throw error;
    }
  }

  /**
   * Blenderサービスを停止
   */
  async stop(): Promise<void> {
    try {
      await webSocketServer.stop();
      console.log('🛑 Blender Service stopped');
    } catch (error) {
      console.error('❌ Failed to stop Blender Service:', error);
      throw error;
    }
  }

  /**
   * ユニフォーム値をBlenderに送信
   * @param value - 送信する浮動小数点値
   */
  sendUniformValue(value: number): void {
    if (!this.isConnected()) {
      console.warn('⚠️ Cannot send uniform value: No Blender clients connected');
      return;
    }

    try {
      webSocketServer.sendUniformUpdate(value);

      // 値変更コールバックを実行
      this.valueCallbacks.forEach(callback => {
        try {
          callback(value);
        } catch (error) {
          console.error('❌ Error in value callback:', error);
        }
      });

      console.log(`📤 Uniform value sent to Blender: ${value}`);
    } catch (error) {
      console.error('❌ Failed to send uniform value:', error);
    }
  }

  /**
   * Blenderが接続されているかどうか
   */
  isConnected(): boolean {
    return webSocketServer.isServerRunning() && webSocketServer.getClientCount() > 0;
  }

  /**
   * 接続状態を取得
   */
  getConnectionStatus(): {
    isServerRunning: boolean;
    isBlenderConnected: boolean;
    clientCount: number;
  } {
    const status = webSocketServer.getConnectionStatus();
    return {
      isServerRunning: status.isRunning,
      isBlenderConnected: status.clientCount > 0,
      clientCount: status.clientCount
    };
  }

  /**
   * 接続状態変更のコールバックを登録
   * @param callback - 接続状態が変更された時に呼ばれる関数
   */
  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.add(callback);

    // 現在の接続状態を即座に通知
    callback(this.isConnected());

    // アンサブスクライブ関数を返す
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * 値変更のコールバックを登録
   * @param callback - 値が変更された時に呼ばれる関数
   */
  onValueChange(callback: (value: number) => void): () => void {
    this.valueCallbacks.add(callback);

    // アンサブスクライブ関数を返す
    return () => {
      this.valueCallbacks.delete(callback);
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

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    serverStatus: any;
    callbackCounts: {
      connection: number;
      value: number;
    };
  } {
    return {
      serverStatus: webSocketServer.getConnectionStatus(),
      callbackCounts: {
        connection: this.connectionCallbacks.size,
        value: this.valueCallbacks.size
      }
    };
  }
}

// デフォルトエクスポート
export const blenderService = BlenderService.getInstance();