import http from 'node:http'

export function createMockUpdateServer(version = '0.2.0', port = 8089) {
  const latestYml = `version: ${version}
files:
  - url: ElectronFoundation-Setup-${version}.exe
    sha512: dGVzdC1zaGE1MTItY2hlY2tzdW0=
    size: 65536000
path: ElectronFoundation-Setup-${version}.exe
sha512: dGVzdC1zaGE1MTItY2hlY2tzdW0=
releaseDate: '2026-10-25T12:00:00.000Z'
releaseNotes: 'Mock update release for automated test verification'
`

  const latestMacYml = `version: ${version}
files:
  - url: ElectronFoundation-${version}-mac.zip
    sha512: dGVzdC1zaGE1MTItY2hlY2tzdW0=
    size: 65536000
path: ElectronFoundation-${version}-mac.zip
sha512: dGVzdC1zaGE1MTItY2hlY2tzdW0=
releaseDate: '2026-10-25T12:00:00.000Z'
releaseNotes: 'Mock update release for macOS'
`

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      console.info(`[mock-update-server] ${req.method} ${req.url}`)

      if (req.url === '/latest.yml') {
        res.writeHead(200, { 'Content-Type': 'text/yaml' })
        res.end(latestYml)
      } else if (req.url === '/latest-mac.yml') {
        res.writeHead(200, { 'Content-Type': 'text/yaml' })
        res.end(latestMacYml)
      } else if (
        req.url?.endsWith('.exe') ||
        req.url?.endsWith('.zip') ||
        req.url?.endsWith('.blockmap')
      ) {
        // Return dummy bytes for mock binary download test
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': '1024'
        })
        res.end(Buffer.alloc(1024, 0x42))
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })

    server.listen(port, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${port}`
      console.info(`[mock-update-server] Listening at ${url}`)
      resolve({
        server,
        url,
        close: () =>
          new Promise((resolveClose) => {
            server.close(() => resolveClose())
          })
      })
    })
  })
}

// Standalone execution
if (process.argv[1]?.endsWith('mock-update-server.mjs')) {
  const port = parseInt(process.env.PORT || '8089', 10)
  createMockUpdateServer('0.2.0', port).then(() => {
    console.info(`Mock update server running on port ${port}. Press Ctrl+C to stop.`)
  })
}
