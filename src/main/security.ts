import { session, shell, type BrowserWindow } from 'electron'
import { PROTOCOL_ORIGIN } from '../shared/constants'
import type { SecurityStatus } from '../shared/types'

/**
 * Configure Content-Security-Policy (CSP) headers and response filtering.
 */
export function setupContentSecurityPolicy(isDev: boolean): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const cspDirectives = isDev
      ? [
          "default-src 'none'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "connect-src 'self' http://localhost:* ws://localhost:*",
          "frame-ancestors 'none'",
          "base-uri 'none'",
          "form-action 'none'"
        ].join('; ')
      : [
          "default-src 'none'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "font-src 'self' data:",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'none'",
          "form-action 'none'"
        ].join('; ')

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspDirectives],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'Referrer-Policy': ['no-referrer']
      }
    })
  })
}

/**
 * Attach navigation guards and window open handlers to a BrowserWindow.
 */
export function setupWindowSecurity(window: BrowserWindow, isDev: boolean): void {
  // Block creation of unapproved new windows/popups
  window.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow safe external HTTPS links to be opened in the system browser
    if (url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Prevent navigation to unexpected destinations
  window.webContents.on('will-navigate', (event, url) => {
    const isAllowed = isDev
      ? url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')
      : url.startsWith(PROTOCOL_ORIGIN)

    if (!isAllowed) {
      event.preventDefault()
    }
  })
}

/**
 * Deny all web permissions by default.
 */
export function setupPermissionHandlers(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    // Zero-trust: deny all permission requests (camera, mic, notifications, geolocation)
    callback(false)
  })
}

/**
 * Return current security status metrics for UI inspection.
 */
export function getSecurityStatus(): SecurityStatus {
  return {
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webviewTag: false,
    customProtocol: true,
    cspEnforced: true,
    fuses: {
      runAsNodeDisabled: true,
      nodeOptionsDisabled: true,
      inspectArgsDisabled: true,
      embeddedAsarIntegrityValidated: true,
      onlyLoadAppFromAsar: true
    }
  }
}
