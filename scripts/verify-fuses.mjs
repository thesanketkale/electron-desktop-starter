import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { getCurrentFuseWire, FuseVersion } from '@electron/fuses'

/**
 * Locate the packaged binary inside dist/
 */
function findPackagedExecutable() {
  const candidates = [
    join(process.cwd(), 'dist', 'win-unpacked', 'Electron Foundation.exe'),
    join(process.cwd(), 'dist', 'win-unpacked', 'electron-foundation.exe'),
    join(process.cwd(), 'dist', 'linux-unpacked', 'electron-foundation'),
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

export async function verifyFusesInBinary(binaryPath) {
  const errors = []

  let wire
  try {
    wire = await getCurrentFuseWire(binaryPath, { version: FuseVersion.V1 })
  } catch (err) {
    errors.push(`Failed to read fuse wire: ${err instanceof Error ? err.message : String(err)}`)
    return { verified: false, errors }
  }

  // Fuse offsets in V1:
  // 0: RunAsNode (must be 48 = disabled)
  // 1: EnableCookieEncryption (must be 49 = enabled)
  // 2: EnableNodeOptionsEnvironmentVariable (must be 48 = disabled)
  // 3: EnableNodeCliInspectArguments (must be 48 = disabled)
  // 4: EnableEmbeddedAsarIntegrityValidation (must be 49 = enabled)
  // 5: OnlyLoadAppFromAsar (must be 49 = enabled)

  const isEnabled = (val) => val === 49 || val === 0x91 || val === 1
  const isDisabled = (val) => val === 48 || val === 0x90 || val === 0

  if (!isDisabled(wire[0])) {
    errors.push(`RunAsNode fuse not disabled (found ${wire[0]})`)
  }
  if (!isEnabled(wire[1])) {
    errors.push(`EnableCookieEncryption fuse not enabled (found ${wire[1]})`)
  }
  if (!isDisabled(wire[2])) {
    errors.push(`EnableNodeOptionsEnvironmentVariable fuse not disabled (found ${wire[2]})`)
  }
  if (!isDisabled(wire[3])) {
    errors.push(`EnableNodeCliInspectArguments fuse not disabled (found ${wire[3]})`)
  }
  if (!isEnabled(wire[4])) {
    errors.push(`EnableEmbeddedAsarIntegrityValidation fuse not enabled (found ${wire[4]})`)
  }
  if (!isEnabled(wire[5])) {
    errors.push(`OnlyLoadAppFromAsar fuse not enabled (found ${wire[5]})`)
  }

  return {
    verified: errors.length === 0,
    errors,
    wire
  }
}

async function main() {
  const targetPath = process.argv[2] || findPackagedExecutable()

  if (!targetPath || !existsSync(targetPath)) {
    console.error(`[fuses:verify] Target binary not found: ${targetPath || 'dist/win-unpacked'}`)
    console.error('Run "npm run package" before verifying fuses.')
    process.exit(1)
  }

  console.info(`[fuses:verify] Verifying security fuses on: ${targetPath}`)
  const result = await verifyFusesInBinary(targetPath)

  if (!result.verified) {
    console.error('[fuses:verify] FAIL - Fuse configuration differs from specification:')
    for (const err of result.errors) {
      console.error(`  - ${err}`)
    }
    process.exit(1)
  }

  console.info('[fuses:verify] PASS - All security fuses match specification exactly:')
  console.info('  ✓ RunAsNode: DISABLED')
  console.info('  ✓ EnableCookieEncryption: ENABLED')
  console.info('  ✓ EnableNodeOptionsEnvironmentVariable: DISABLED')
  console.info('  ✓ EnableNodeCliInspectArguments: DISABLED')
  console.info('  ✓ EnableEmbeddedAsarIntegrityValidation: ENABLED')
  console.info('  ✓ OnlyLoadAppFromAsar: ENABLED')
}

void main()
