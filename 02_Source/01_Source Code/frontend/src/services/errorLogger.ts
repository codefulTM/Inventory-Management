/**
 * Error and Logging Service
 * Centralized error handling and logging for the application
 */

interface ErrorLog {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  source: string;
  message: string;
  error?: Error;
  context?: Record<string, any>;
}

class ErrorLoggingService {
  private logs: ErrorLog[] = [];
  private maxLogs = 1000;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError(
        'GLOBAL',
        `Unhandled Promise Rejection: ${event.reason}`,
        event.reason as Error,
      );
    });

    // Handle console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      this.logError('CONSOLE', args.join(' '));
      originalError.apply(console, args);
    };
  }

  /**
   * Log an error
   */
  logError(
    source: string,
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): void {
    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'ERROR',
      source,
      message,
      error,
      context,
    };

    this.addLog(log);
    this.logToConsole(log);
  }

  /**
   * Log a warning
   */
  logWarn(
    source: string,
    message: string,
    context?: Record<string, any>,
  ): void {
    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'WARN',
      source,
      message,
      context,
    };

    this.addLog(log);
    this.logToConsole(log);
  }

  /**
   * Log info
   */
  logInfo(
    source: string,
    message: string,
    context?: Record<string, any>,
  ): void {
    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'INFO',
      source,
      message,
      context,
    };

    this.addLog(log);
  }

  /**
   * Log critical error
   */
  logCritical(
    source: string,
    message: string,
    error?: Error,
    context?: Record<string, any>,
  ): void {
    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'CRITICAL',
      source,
      message,
      error,
      context,
    };

    this.addLog(log);
    this.logToConsole(log);
    
    // In production, send to error tracking service
    this.reportToErrorTracking(log);
  }

  /**
   * Add log to internal storage
   */
  private addLog(log: ErrorLog): void {
    this.logs.push(log);

    // Keep only recent logs to avoid memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Log to console with styling
   */
  private logToConsole(log: ErrorLog): void {
    const timestamp = log.timestamp.toISOString();
    const prefix = `[${log.level}] [${log.source}] ${timestamp}`;

    switch (log.level) {
      case 'ERROR':
        console.error(`${prefix}:`, log.message, log.error, log.context);
        break;
      case 'WARN':
        console.warn(`${prefix}:`, log.message, log.context);
        break;
      case 'CRITICAL':
        console.error(`🔴 CRITICAL: ${prefix}:`, log.message, log.error, log.context);
        break;
      case 'INFO':
        console.log(`${prefix}:`, log.message, log.context);
        break;
    }
  }

  /**
   * Report to error tracking service (Sentry, etc.)
   */
  private reportToErrorTracking(_log: ErrorLog): void {
    // TODO: Integrate with error tracking service (Sentry, Rollbar, etc.)
    if (window.location.hostname !== 'localhost') {
      // Only report in production
      // Example: Sentry.captureException(log.error, { tags: { source: log.source } });
    }
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: ErrorLog['level']): ErrorLog[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
export const errorLogger = new ErrorLoggingService();

/**
 * Safe API call wrapper with error handling
 * Prevents silent failures from mock data fallbacks
 */
export async function safeApiCall<T>(
  source: string,
  apiCall: () => Promise<T>,
  fallbackData?: T,
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Always log the error
    errorLogger.logError(
      source,
      `API call failed: ${errorMessage}`,
      error as Error,
    );

    // If fallback data is provided, log warning and return it
    if (fallbackData !== undefined) {
      errorLogger.logWarn(
        source,
        `Using fallback data due to API failure`,
        { originalError: errorMessage },
      );
      return fallbackData;
    }

    // Otherwise, throw the error
    throw error;
  }
}
