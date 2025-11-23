param(
    [string]$InputFile,
    [string]$OutputFile
)

$ErrorActionPreference = 'Stop'

# Basic validation to avoid null/empty path errors
if ([string]::IsNullOrWhiteSpace($InputFile) -or [string]::IsNullOrWhiteSpace($OutputFile)) {
    return
}

$result = [pscustomobject]@{
    Succeeded = @()
    Failed    = @()
}

try {
    if (-not (Test-Path -LiteralPath $InputFile)) {
        throw "Input file not found: $InputFile"
    }

    $paths = Get-Content -LiteralPath $InputFile | Where-Object { $_ -and $_.Trim() -ne "" }

    foreach ($p in $paths) {
        $path = $p.Trim()

        try {
            if ([System.IO.Directory]::Exists($path)) {
                [System.IO.Directory]::Delete($path, $true)
                $result.Succeeded += $path
            } else {
                $result.Failed += $path
            }
        } catch {
            $result.Failed += $path
        }
    }
}
catch {
    $result.Failed += "WORKER ERROR: $($_.Exception.Message)"
}

# Write JSON summary
try {
    $json = $result | ConvertTo-Json -Depth 5
    $json | Set-Content -LiteralPath $OutputFile -Encoding UTF8
} catch {
    # ignore
}
