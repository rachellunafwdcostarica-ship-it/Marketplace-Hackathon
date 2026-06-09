type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogPayload {
  [key: string]: unknown
}

function log(level: LogLevel, message: string, payload?: LogPayload): void {
  const entry = {
    level,
    message,
    ...(payload ?? {}),
  }
  const serialized = JSON.stringify(entry)
  if (level === 'error') {
    console.error(serialized)
  } else if (level === 'warn') {
    console.warn(serialized)
  } else {
    console.log(serialized)
  }
}

export const logger = {
  info: (message: string, payload?: LogPayload) =>
    log('info', message, payload),
  warn: (message: string, payload?: LogPayload) =>
    log('warn', message, payload),
  error: (message: string, payload?: LogPayload) =>
    log('error', message, payload),
  debug: (message: string, payload?: LogPayload) =>
    log('debug', message, payload),
}
