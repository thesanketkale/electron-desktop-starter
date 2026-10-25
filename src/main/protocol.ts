import { protocol, net } from 'electron'
import { join, normalize } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROTOCOL_SCHEME } from '../shared/constants'

/**
 * Register custom privileged schemes.
 * MUST be invoked before app.whenReady().
 */
export function registerPrivilegedSchemes(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: PROTOCOL_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ])
}

/**
 * Set up the app:// protocol handler.
 * Maps app://-/<path> to the renderer build output directory.
 */
export function setupProtocolHandler(rendererDistPath: string): void {
  protocol.handle(PROTOCOL_SCHEME, (request) => {
    try {
      const url = new URL(request.url)
      // Normalize pathname to prevent directory traversal
      let pathname = decodeURIComponent(url.pathname)

      if (pathname === '/' || pathname === '') {
        pathname = '/index.html'
      }

      // Security check: prevent directory traversal
      const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
      const targetFilePath = join(rendererDistPath, safePath)

      return net.fetch(pathToFileURL(targetFilePath).toString())
    } catch {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }
  })
}
