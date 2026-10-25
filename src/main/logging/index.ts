import log from 'electron-log'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { redactSensitiveData, redactObject } from './redaction'

export interface LogEntry {
  timestamp: string
  level: string
  message: string
}

const memoryLogs: LogEntry[] = []
const MAX_MEMORY_LOGS = 500

/**
 * Configure electron-log with rotating file transports and sensitive data redaction.
 */
export function setupLogging(userDataPath: string): void {
  // Redact console messages
  log.hooks.push((message, _transport) => {
    message.data = message.data.map((item) => redactObject(item))
    return message
  })

  // In-memory buffer for renderer live log viewer
  log.hooks.push((message) => {
    const formattedMessage = message.data
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(' ')

    memoryLogs.push({
      timestamp: new Date().toISOString(),
      level: message.level,
      message: redactSensitiveData(formattedMessage)
    })

    if (memoryLogs.length > MAX_MEMORY_LOGS) {
      memoryLogs.shift()
    }
    return message
  })

  log.transports.file.resolvePathFn = () => join(userDataPath, 'logs', 'app.log')
  log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB rotation
}

/**
 * Retrieve recent in-memory log entries.
 */
export function getRecentLogs(limit = 100): LogEntry[] {
  return memoryLogs.slice(-limit)
}

/**
 * Generate a complete diagnostics bundle without sensitive information.
 */
export function generateDiagnosticsBundle(
  userDataPath: string,
  extraMetadata: Record<string, unknown> = {}
): { exportPath: string; generatedAt: string; entriesCount: number } {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const exportPath = join(userDataPath, `diagnostics-${timestamp}.json`)

  let diskLogs = ''
  const logFilePath = join(userDataPath, 'logs', 'app.log')
  if (existsSync(logFilePath)) {
    try {
      diskLogs = readFileSync(logFilePath, 'utf-8')
    } catch {
      diskLogs = '(Unable to read disk log file)'
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome
    },
    metadata: redactObject(extraMetadata),
    memoryLogEntries: memoryLogs,
    diskLogsRedacted: redactSensitiveData(diskLogs)
  }

  writeFileSync(exportPath, JSON.stringify(payload, null, 2), 'utf-8')

  return {
    exportPath,
    generatedAt: payload.generatedAt,
    entriesCount: memoryLogs.length
  }
}

export { log }
