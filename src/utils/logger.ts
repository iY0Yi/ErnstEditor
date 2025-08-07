/**
 * ログシステム
 * ログレベル制御付きの統一ロガー
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  enableFileLogging?: boolean;
  enableTimestamp?: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = { level: LogLevel.INFO }) {
    this.config = {
      enableTimestamp: true,
      enableFileLogging: false,
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.config.level;
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.config.enableTimestamp ? new Date().toISOString() : '';
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const timestampStr = timestamp ? `[${timestamp}]` : '';

    return `${timestampStr}${prefix}[${level}] ${message}`;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  trace(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.TRACE)) {
      console.log(this.formatMessage('TRACE', message), ...args);
    }
  }
}

// デフォルトロガー
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  prefix: 'Ernst'
});

// 特定モジュール用ロガー作成関数
export function createLogger(prefix: string, level?: LogLevel): Logger {
  return new Logger({
    level: level || (process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO),
    prefix,
    enableTimestamp: true
  });
}

// 便利な短縮関数
export const log = {
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  trace: (message: string, ...args: any[]) => logger.trace(message, ...args)
};
