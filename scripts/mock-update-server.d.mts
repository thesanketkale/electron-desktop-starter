import type http from 'node:http'

export declare function createMockUpdateServer(
  version?: string,
  port?: number
): Promise<{
  server: http.Server
  url: string
  close: () => Promise<void>
}>
