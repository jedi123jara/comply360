/**
 * Structured JSON logger for COMPLY360.
 * Replaces console.error/log with structured output.
 * In production, these can be piped to a log aggregator.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: string
  stack?: string
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  }

  if (error instanceof Error) {
    entry.error = error.message
    entry.stack = error.stack
  } else if (error) {
    entry.error = String(error)
  }

  const output = JSON.stringify(entry)

  switch (level) {
    case 'error':
      console.error(output)
      break
    case 'warn':
      console.warn(output)
      break
    case 'debug':
      if (process.env.NODE_ENV === 'development') console.debug(output)
      break
    default:
      console.log(output)
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (message: string, context?: Record<string, unknown>, error?: unknown) => log('error', message, context, error),
}
