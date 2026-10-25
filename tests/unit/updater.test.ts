import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createMockUpdateServer } from '../../scripts/mock-update-server.mjs'

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.1.0'
  }
}))

describe('Auto-Update Pipeline with Local Mock Server', () => {
  let mockServer: { server: unknown; url: string; close: () => Promise<void> }

  beforeAll(async () => {
    mockServer = await createMockUpdateServer('0.3.0', 8098)
  })

  afterAll(async () => {
    if (mockServer) {
      await mockServer.close()
    }
  })

  it('serves valid latest.yml and latest-mac.yml manifests', async () => {
    const resWindows = await fetch(`${mockServer.url}/latest.yml`)
    expect(resWindows.status).toBe(200)
    const textWindows = await resWindows.text()
    expect(textWindows).toContain('version: 0.3.0')
    expect(textWindows).toContain('ElectronFoundation-Setup-0.3.0.exe')

    const resMac = await fetch(`${mockServer.url}/latest-mac.yml`)
    expect(resMac.status).toBe(200)
    const textMac = await resMac.text()
    expect(textMac).toContain('version: 0.3.0')
    expect(textMac).toContain('ElectronFoundation-0.3.0-mac.zip')
  })

  it('serves binary files with octet-stream Content-Type', async () => {
    const res = await fetch(`${mockServer.url}/ElectronFoundation-Setup-0.3.0.exe`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    const buffer = await res.arrayBuffer()
    expect(buffer.byteLength).toBe(1024)
  })
})
