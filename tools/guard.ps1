# tools/guard.ps1: Clean-room and security audit guard for electron-foundation
$ErrorActionPreference = "Stop"

Write-Host "==> Running Guard: Clean-room & Security Audit..." -ForegroundColor Cyan

$root = git rev-parse --show-toplevel 2>$null
if (-not $root) { $root = Get-Location }
Set-Location $root

$failed = $false

# 1. Clean-room check: forbidden private entities
$forbiddenPatterns = @(
    'VueXR',
    'Trium Designs',
    'Fudge3d'
)

Write-Host "-> Checking clean-room compliance (forbidden entity names)..."
foreach ($pattern in $forbiddenPatterns) {
    $matches = git grep -I -i $pattern -- ':!.pipeline' ':!tools/guard.*' ':!Open Source Repository Specs.md' 2>$null
    if ($matches) {
        Write-Host "FAIL: Clean-room violation! Found '$pattern' in:" -ForegroundColor Red
        $matches | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        $failed = $true
    }
}

if (-not $failed) {
    Write-Host "  [OK] Zero references to private entities found." -ForegroundColor Green
}

# 2. Secret check: unredacted private keys or tokens
Write-Host "-> Checking for exposed secrets or credentials..."
$secretPatterns = @(
    'BEGIN .*PRIVATE KEY',
    'ghp_[A-Za-z0-9]{36}',
    'AKIA[0-9A-Z]{16}'
)

foreach ($pattern in $secretPatterns) {
    $matches = git grep -I -E $pattern -- ':!.pipeline' ':!tools/guard.*' 2>$null
    if ($matches) {
        Write-Host "FAIL: Potential secret leak detected for pattern: $pattern" -ForegroundColor Red
        $matches | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        $failed = $true
    }
}

# 3. Action SHA Pinning check
Write-Host "-> Checking GitHub Actions 40-character SHA pinning..."
$workflowFiles = Get-ChildItem -Path ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue
foreach ($file in $workflowFiles) {
    $lines = Get-Content $file.FullName
    $lineNum = 0
    foreach ($line in $lines) {
        $lineNum++
        if ($line -match 'uses:\s+([^@\s]+)@([^\s#]+)') {
            $action = $Matches[1]
            $ref = $Matches[2]
            if (-not $action.StartsWith('./')) {
                if ($ref -notmatch '^[0-9a-f]{40}$') {
                    Write-Host "FAIL: Action '$action' in $($file.Name):$lineNum is not pinned to a 40-char SHA (found '$ref')" -ForegroundColor Red
                    $failed = $true
                }
            }
        }
    }
}

if ($failed) {
    Write-Host "==> Guard check FAILED." -ForegroundColor Red
    exit 1
}

Write-Host "==> Guard check PASSED. Repository is clean." -ForegroundColor Green
exit 0
