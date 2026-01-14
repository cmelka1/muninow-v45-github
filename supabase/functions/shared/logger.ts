
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/**
 * Structured logging utility for Edge Functions.
 * 
 * All log methods accept `any` for the data parameter intentionally.
 * This allows logging of arbitrary data structures including:
 * - Plain objects
 * - Arrays
 * - Error objects
 * - Primitives
 * - Circular references (safely handled)
 * 
 * The data is serialized to JSON for structured logging in production.
 */
export class Logger {
  /**
   * Formats a log message with timestamp, level, and optional data.
   * @param level - The log level (DEBUG, INFO, WARN, ERROR)
   * @param message - The log message
   * @param data - Optional data to include (intentionally `any` for logging flexibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional: logging accepts any serializable data
  private static formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      data: data || undefined,
    };
    try {
      return JSON.stringify(logEntry);
    } catch (e) {
      // Fallback for circular references or other stringify errors
      const safeEntry = {
        ...logEntry,
        data: '[Unable to stringify data - likely circular reference]',
        error: String(data)
      };
      return JSON.stringify(safeEntry);
    }
  }

  /**
   * Log a debug message. May be suppressed in production.
   * @param message - The debug message
   * @param data - Optional data to include (intentionally `any` for logging flexibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional: logging accepts any serializable data
  static debug(message: string, data?: any) {
    // In production, we might want to suppress DEBUG logs, or strictly filter them
    // For now, we'll allow them but ensure they are structured
    console.log(this.formatMessage(LogLevel.DEBUG, message, data));
  }

  /**
   * Log an informational message.
   * @param message - The info message
   * @param data - Optional data to include (intentionally `any` for logging flexibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional: logging accepts any serializable data
  static info(message: string, data?: any) {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  /**
   * Log a warning message.
   * @param message - The warning message
   * @param data - Optional data to include (intentionally `any` for logging flexibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional: logging accepts any serializable data
  static warn(message: string, data?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  /**
   * Log an error message. Automatically extracts error properties if an Error object is passed.
   * @param message - The error message
   * @param error - Optional error object or data (intentionally `any` for logging flexibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentional: logging accepts any serializable data
  static error(message: string, error?: any) {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : error;
    console.error(this.formatMessage(LogLevel.ERROR, message, errorData));
  }
}
