// Centralized logging utility
interface LogContext {
  [key: string]: unknown;
}

export const logger = {
  error: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[ERROR] ${message}`, context || '');
    }
    // In production, you might want to send to error tracking service
    // e.g., Sentry, LogRocket, etc.
  },

  warn: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[WARN] ${message}`, context || '');
    }
  },

  info: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[INFO] ${message}`, context || '');
    }
  },

  debug: (message: string, context?: LogContext) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  },
};

export default logger;