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
  private originalConsoleError: (...args: unknown[]) => void;
  private isLogging = false;

  constructor() {
    this.originalConsoleError = console.error.bind(console);
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
    console.error = (...args: unknown[]) => {
      this.logError('CONSOLE', args.join(' '));
      this.originalConsoleError(...args);
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
    if (this.isLogging) {
      this.originalConsoleError('[ErrorLoggingService] Re-entrant logError prevented', {
        source,
        message,
        error,
        context,
      });
      return;
    }

    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'ERROR',
      source,
      message,
      error,
      context,
    };

    this.isLogging = true;
    try {
      this.addLog(log);
      this.logToConsole(log);
    } catch (loggingError) {
      this.originalConsoleError('[ErrorLoggingService] Failed to process logError', loggingError);
    } finally {
      this.isLogging = false;
    }
  }

  /**
   * Log a warning
   */
  logWarn(
    source: string,
    message: string,
    context?: Record<string, any>,
  ): void {
    if (this.isLogging) {
      this.originalConsoleError('[ErrorLoggingService] Re-entrant logWarn prevented', {
        source,
        message,
        context,
      });
      return;
    }

    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'WARN',
      source,
      message,
      context,
    };

    this.isLogging = true;
    try {
      this.addLog(log);
      this.logToConsole(log);
    } catch (loggingError) {
      this.originalConsoleError('[ErrorLoggingService] Failed to process logWarn', loggingError);
    } finally {
      this.isLogging = false;
    }
  }

  /**
   * Log info
   */
  logInfo(
    source: string,
    message: string,
    context?: Record<string, any>,
  ): void {
    if (this.isLogging) {
      this.originalConsoleError('[ErrorLoggingService] Re-entrant logInfo prevented', {
        source,
        message,
        context,
      });
      return;
    }

    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'INFO',
      source,
      message,
      context,
    };

    this.isLogging = true;
    try {
      this.addLog(log);
    } catch (loggingError) {
      this.originalConsoleError('[ErrorLoggingService] Failed to process logInfo', loggingError);
    } finally {
      this.isLogging = false;
    }
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
    if (this.isLogging) {
      this.originalConsoleError('[ErrorLoggingService] Re-entrant logCritical prevented', {
        source,
        message,
        error,
        context,
      });
      return;
    }

    const log: ErrorLog = {
      timestamp: new Date(),
      level: 'CRITICAL',
      source,
      message,
      error,
      context,
    };

    this.isLogging = true;
    try {
      this.addLog(log);
      this.logToConsole(log);

      // In production, send to error tracking service
      this.reportToErrorTracking(log);
    } catch (loggingError) {
      this.originalConsoleError('[ErrorLoggingService] Failed to process logCritical', loggingError);
    } finally {
      this.isLogging = false;
    }
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
        this.originalConsoleError(`${prefix}:`, log.message, log.error, log.context);
        break;
      case 'WARN':
        console.warn(`${prefix}:`, log.message, log.context);
        break;
      case 'CRITICAL':
        this.originalConsoleError(`🔴 CRITICAL: ${prefix}:`, log.message, log.error, log.context);
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
