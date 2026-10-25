import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Locate the packaged binary inside dist/ or out/
 */
function findPackagedExecutable() {
  const candidates = [
    // Windows unpacked
    join(process.cwd(), 'dist', 'win-unpacked', 'Electron Foundation.exe'),
    join(process.cwd(), 'dist', 'win-unpacked', 'electron-foundation.exe'),
    // Linux unpacked
    join(process.cwd(), 'dist', 'linux-unpacked', 'electron-foundation'),
    // macOS
    join(
      process.cwd(),
      'dist',
      'mac',
      'Electron Foundation.app',
      'Contents',
      'MacOS',
      'Electron Foundation'
    ),
    join(
      process.cwd(),
      'dist',
      'mac-arm64',
      'Electron Foundation.app',
      'Contents',
      'MacOS',
      'Electron Foundation'
    )
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  // Check dist directory dynamically
  const distDir = join(process.cwd(), 'dist')
  if (existsSync(distDir)) {
    const entries = readdirSync(distDir, { recursive: true, withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.exe') || entry.name === 'electron-foundation')) {
        return join(entry.parentPath || distDir, entry.name)
      }
    }
  }

  return null
}

async function main() {
  const targetPath = process.argv[2] || findPackagedExecutable()

  if (!targetPath || !existsSync(targetPath)) {
    console.warn(
      `[fuses] No packaged binary found to flip fuses at: ${targetPath || 'default dist locations'}`
    )
    console.warn('[fuses] Fuses will be applied during packaging (npm run package).')
    return
  }

  console.info(`[fuses] Flipping security fuses on: ${targetPath}`)

  try {
    await flipFuses(targetPath, {
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: process.platform === 'darwin',
      [FuseV1Options.RunAsNode]: 0,
      [FuseV1Options.EnableCookieEncryption]: 1,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: 0,
      [FuseV1Options.EnableNodeCliInspectArguments]: 0,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: 1,
      [FuseV1Options.OnlyLoadAppFromAsar]: 1
    })
    console.info('[fuses] Successfully flipped all 5 security fuses.')
  } catch (error) {
    console.error('[fuses] Failed to flip fuses:', error)
    process.exit(1)
  }
}

void main()
