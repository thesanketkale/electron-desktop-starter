# Verification Log: Owner-Verified Handoff

This document details the step-by-step instructions for the repository owner to complete the **Owner-Verified Acceptance Criteria** that require paid developer accounts, hardware tokens, or production secrets.

Estimated execution time: **< 10 minutes**.

---

## 1. Windows Code Signing Verification (AC-OV-01)

### Option A: Azure Trusted Signing

#### Required Environment Secrets:

```env
AZURE_KEY_VAULT_URI=https://<your-endpoint>.codesigning.azure.net/
AZURE_CERT_PROFILE_NAME=<profile-name>
AZURE_CLIENT_ID=<app-registration-client-id>
AZURE_CLIENT_SECRET=<app-registration-client-secret>
```

#### Verification Command (PowerShell):

```powershell
# Set test environment variables
$env:AZURE_KEY_VAULT_URI = "https://<your-endpoint>.codesigning.azure.net/"
$env:AZURE_CERT_PROFILE_NAME = "<profile-name>"
$env:AZURE_CLIENT_ID = "<client-id>"
$env:AZURE_CLIENT_SECRET = "<secret>"

# Build and package
npm run package:dist

# Verify binary signature
Get-AuthenticodeSignature "dist\win-unpacked\Electron Foundation.exe"
```

#### Expected Output:

```
SignerCertificate                         Status                                 Path
-----------------                         ------                                 ----
[Thumbprint] [Certificate Subject]        Valid                                  Electron Foundation.exe
```

---

### Option B: Traditional PFX Certificate

#### Verification Command (PowerShell):

```powershell
$env:CSC_LINK = "C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "your-password"

npm run package:dist

Get-AuthenticodeSignature "dist\win-unpacked\Electron Foundation.exe"
```

---

## 2. macOS Developer ID & Notarization Verification (AC-OV-02)

Execute on macOS hardware:

#### Required Environment Variables:

```bash
export APPLE_API_KEY="/path/to/AuthKey_XXXXXXXXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
export CSC_LINK="/path/to/developer_id_application.p12"
export CSC_KEY_PASSWORD="cert-password"
```

#### Verification Command (Terminal):

```bash
# Package and notarize
npm run package:dist

# Verify Gatekeeper acceptance
spctl --assess --type execute --verbose "dist/mac/Electron Foundation.app"
```

#### Expected Output:

```
dist/mac/Electron Foundation.app: accepted
source=Notarized Developer ID
```

---

## 3. Live GitHub Releases Auto-Update (AC-OV-03)

1. Create a release tag `v0.1.1` and push it:
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```
2. Wait for `.github/workflows/release.yml` to finish publishing the release.
3. Launch the existing local installed version (`v0.1.0`).
4. Click **Auto-Updater** in the sidebar.
5. Click **Check for Updates**.
6. Verify UI transitions to **Update Available (v0.1.1)**, downloads the binary, and prompts **Restart & Install Now**.
7. Confirm the app relaunches showing version `v0.1.1`.
