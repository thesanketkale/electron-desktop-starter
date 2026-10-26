# Release, Code Signing & Notarization Guide

This document details the code signing and manual release process configured in `electron-builder.yml`.

## Signing Architecture

Modern desktop operating systems (Windows and macOS) enforce strict reputation and signature checks. `electron-foundation` supports a **pluggable signing architecture**:

- **Unsigned by Default in CI**: Pull requests and forks build unsigned binaries without failing.
- **Pluggable Production Signing**: If signing credentials are provided as GitHub Environment or Repository secrets, release packages are signed and notarized automatically.

---

## Windows Code Signing

### Option A: Azure Trusted Signing (Recommended)

Microsoft Azure Trusted Signing is the modern, cloud-based standard for Windows Authenticode signing without physical hardware tokens.

#### Required Secrets:

| Secret Name               | Description                                  | Example / Format                     |
| ------------------------- | -------------------------------------------- | ------------------------------------ |
| `AZURE_KEY_VAULT_URI`     | Azure Trusted Signing account endpoint       | `https://eus.codesigning.azure.net/` |
| `AZURE_CERT_PROFILE_NAME` | Name of the certificate profile in Azure     | `PublicReleaseProfile`               |
| `AZURE_CLIENT_ID`         | App Registration Service Principal Client ID | UUID string                          |
| `AZURE_CLIENT_SECRET`     | App Registration Client Secret               | Secret string                        |

### Option B: Traditional PFX Authenticode Certificate

Standard PFX certificate file (OV or EV) exported with private key.

#### Required Secrets:

| Secret Name        | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `CSC_LINK`         | Base64-encoded string of the `.pfx` certificate file (or HTTPS URL) |
| `CSC_KEY_PASSWORD` | Password protecting the PFX file                                    |

---

## macOS Developer ID & Notarization

macOS Gatekeeper requires application bundles to be signed with an Apple Developer ID Application certificate and notarized through Apple's notary service (`notarytool`).

### Required Secrets:

| Secret Name        | Description                                                                    |
| ------------------ | ------------------------------------------------------------------------------ |
| `APPLE_API_KEY`    | App Store Connect API Key (`.p8` private key file content or path)             |
| `APPLE_API_KEY_ID` | 10-character Key ID (e.g. `2X9R4HXF34`)                                        |
| `APPLE_API_ISSUER` | App Store Connect Issuer ID UUID (e.g. `57246542-96fe-1a63-e053-0824d011072a`) |
| `APPLE_TEAM_ID`    | 10-character Apple Developer Team ID (e.g. `ABC123XYZ0`)                       |
| `CSC_LINK`         | Base64-encoded macOS Developer ID Application certificate (`.p12`)             |
| `CSC_KEY_PASSWORD` | Password for the `.p12` certificate                                            |

---

## Unsigned Build Behavior

When signing secrets are not configured, builds succeed and generate valid installers with the following platform behaviors:

### Windows SmartScreen

- Windows SmartScreen displays a blue banner: _"Windows protected your PC - Microsoft Defender SmartScreen prevented an unrecognized app from starting"_.
- **To run unsigned**: Click **More info**, then click **Run anyway**.
- **Acquiring reputation**: Once signed with an EV certificate or Azure Trusted Signing, SmartScreen warnings disappear immediately or after a short download volume threshold.

### macOS Gatekeeper

- macOS displays an alert: _"Electron Foundation can't be opened because Apple cannot check it for malicious software"_.
- **To run unsigned**: Right-click (or Control-click) the application in `/Applications`, select **Open**, and click **Open** in the confirmation dialog. Alternatively, navigate to **System Settings -> Privacy & Security -> Security** and click **Open Anyway**.

---

## Release Packaging (Manual)

To build release packages manually for publication:

1. Build and package the binaries locally: `npm run package:dist`.
2. Packages NSIS installers (`.exe`), macOS DMG & ZIP, and Linux AppImage.
3. Validate Electron fuses: `npm run fuses:verify`.
4. Generate SHA-256 checksums (`SHA256SUMS-*.txt`).
5. Upload assets and manifests to the GitHub Release manually (`gh release create`).
