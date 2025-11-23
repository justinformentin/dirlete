# build.ps1
# Build Dirlete GUI + Worker EXEs with ps2exe and auto-incrementing version

$ErrorActionPreference = 'Stop'

# Get script directory reliably
$scriptPath = $PSScriptRoot
if (-not $scriptPath) {
    $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
}
Set-Location -Path $scriptPath

Write-Host "Building in $scriptPath"

# ---- Version handling via version.txt ----
$versionFile = "version.txt"

if (-Not (Test-Path $versionFile)) {
    "1.0.0.0" | Set-Content $versionFile
}

$versionObj = [Version](Get-Content $versionFile)

# Increment the build number (Revision)
$newVersion = "{0}.{1}.{2}.{3}" -f $versionObj.Major, $versionObj.Minor, $versionObj.Build, ($versionObj.Revision + 1)
Set-Content $versionFile $newVersion

$version = $newVersion
Write-Host "Version: $version"

# ---- Ensure ps2exe is available ----
if (-not (Get-Command Invoke-ps2exe -ErrorAction SilentlyContinue)) {
    throw "Invoke-ps2exe not found. Install with: Install-Module ps2exe -Scope CurrentUser"
}

# ---- Kill any running instances so we can overwrite ----
foreach ($name in 'dirlete', 'dirlete-worker') {
    try {
        $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
        if ($procs) {
            Write-Host "Stopping running process: $name"
            $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # ignore
    }
}

# ---- Paths ----
$guiScript     = Join-Path $scriptPath 'dirlete.ps1'
$workerScript  = Join-Path $scriptPath 'dirlete-worker.ps1'
$guiExe        = Join-Path $scriptPath 'dirlete.exe'
$workerExe     = Join-Path $scriptPath 'dirlete-worker.exe'
$iconPath      = Join-Path $scriptPath 'dirlete.ico'

if (-not (Test-Path $guiScript)) {
    throw "GUI script not found: $guiScript"
}
if (-not (Test-Path $workerScript)) {
    throw "Worker script not found: $workerScript"
}
if (-not (Test-Path $iconPath)) {
    Write-Warning "Icon file not found at $iconPath. EXEs will be built without a custom icon."
}

# ---- Build GUI EXE ----
Write-Host "Building GUI: $guiExe"

$guiParams = @{
    inputFile   = $guiScript
    outputFile  = $guiExe
    title       = 'Dirlete'
    description = 'Remove directories'
    company     = 'Formentin'
    product     = 'Dirlete'
    version     = $version
    noConsole   = $true
}

if (Test-Path $iconPath) {
    $guiParams.iconFile = $iconPath
}

Invoke-ps2exe @guiParams

Write-Host "GUI build complete: $guiExe"
Write-Host ""

# ---- Build Worker EXE ----
Write-Host "Building worker: $workerExe"

$workerParams = @{
    inputFile   = $workerScript
    outputFile  = $workerExe
    title       = 'Dirlete Worker'
    description = 'Background directory deletion worker for Dirlete'
    company     = 'Formentin'
    product     = 'Dirlete'
    version     = $version
    noConsole   = $true
}

if (Test-Path $iconPath) {
    $workerParams.iconFile = $iconPath
}

Invoke-ps2exe @workerParams

Write-Host "Worker build complete: $workerExe"
Write-Host ""
Write-Host "All done ✅ (version $version)"
