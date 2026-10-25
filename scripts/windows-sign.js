/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * scripts/windows-sign.js: Pluggable Windows signing hook for electron-builder.
 * Supports Azure Trusted Signing, standard PFX certificate (CSC_LINK), or unsigned fallback.
 */
const { execSync } = require('node:child_process')

exports.default = async function sign(configuration) {
  // 1. Check for Azure Trusted Signing configuration
  if (
    process.env.AZURE_KEY_VAULT_URI &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET &&
    process.env.AZURE_CERT_PROFILE_NAME
  ) {
    console.info(`[sign] Signing ${configuration.path} via Azure Trusted Signing...`)
    try {
      execSync(
        `Invoke-TrustedSigning -Endpoint "${process.env.AZURE_KEY_VAULT_URI}" -CertificateProfileName "${process.env.AZURE_CERT_PROFILE_NAME}" -FilePath "${configuration.path}"`,
        { shell: 'powershell.exe', stdio: 'inherit' }
      )
      return
    } catch (err) {
      console.error('[sign] Azure Trusted Signing failed:', err)
      throw err
    }
  }

  // 2. Check for traditional PFX environment variables handled natively by electron-builder
  if (process.env.CSC_LINK || process.env.WIN_CSC_LINK) {
    console.info(
      `[sign] Delegating ${configuration.path} to standard electron-builder Authenticode signing...`
    )
    // Returning undefined lets electron-builder proceed with default sign tool
    return
  }

  // 3. Fallback: Unsigned build
  console.info(
    `[sign] Notice: Code signing credentials not detected. ${configuration.path} remains unsigned.`
  )
}
