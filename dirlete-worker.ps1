param(
    [string]$InputFile,
    [string]$OutputFile
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($InputFile) -or [string]::IsNullOrWhiteSpace($OutputFile)) {
    return
}

function Remove-DirWithFixes {
    param(
        [string]$Path
    )

    $failure = [pscustomobject]@{
        Path     = $Path
        Error    = $null
        Attempts = @()
        Notes    = @()
    }

    # Helper to add attempt note
    function Add-Attempt([string]$text) {
        $failure.Attempts += $text
    }

    # 0) Ensure it exists
    if (-not [System.IO.Directory]::Exists($Path)) {
        $failure.Error = "Directory does not exist"
        $failure.Notes += "Directory missing before delete."
        return [pscustomobject]@{ Success = $false; Details = $failure }
    }

    # 1) Normal delete
    try {
        [System.IO.Directory]::Delete($Path, $true)
        return [pscustomobject]@{ Success = $true; Details = $null }
    } catch {
        $failure.Error = $_.Exception.Message
        Add-Attempt "Initial delete failed: $($failure.Error)"
    }

    # 2) Clear attributes (hidden/readonly/system) and retry
    try {
        if (Test-Path -LiteralPath $Path) {
            Get-ChildItem -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue |
                ForEach-Object {
                    try { $_.Attributes = 'Normal' } catch {}
                }

            try {
                $rootItem = Get-Item -LiteralPath $Path -ErrorAction SilentlyContinue
                if ($rootItem) { $rootItem.Attributes = 'Normal' }
            } catch {}

            [System.IO.Directory]::Delete($Path, $true)
            return [pscustomobject]@{ Success = $true; Details = $null }
        }
    } catch {
        Add-Attempt "After clearing attributes: $($_.Exception.Message)"
    }

    # 3) Long path delete (use \\?\ prefix if needed)
    try {
        if (Test-Path -LiteralPath $Path) {
            $longPath = $Path
            if ($longPath.Length -gt 240 -and -not $longPath.StartsWith("\\?\")) {
                $failure.Notes += "Path appears long ($($longPath.Length) chars). Trying \\?\ prefix."
                $longPath = "\\?\$longPath"
            }

            [System.IO.Directory]::Delete($longPath, $true)
            return [pscustomobject]@{ Success = $true; Details = $null }
        }
    } catch {
        Add-Attempt "Long-path delete attempt failed: $($_.Exception.Message)"
    }

    # 4) Nuclear option: robocopy /MIR from empty dir, then delete
    try {
        if (Test-Path -LiteralPath $Path) {
            $tempRoot = [System.IO.Path]::GetTempPath()
            $emptyDir = Join-Path $tempRoot ("dirlete_empty_" + [guid]::NewGuid().ToString())
            New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null

            $rcArgs = @(
                ('"{0}"' -f $emptyDir),
                ('"{0}"' -f $Path),
                "/MIR", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1"
            )

            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = "robocopy.exe"
            $psi.Arguments = ($rcArgs -join " ")
            $psi.CreateNoWindow = $true
            $psi.UseShellExecute = $false
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError  = $true

            $proc   = [System.Diagnostics.Process]::Start($psi)
            $stdout = $proc.StandardOutput.ReadToEnd()
            $stderr = $proc.StandardError.ReadToEnd()
            $proc.WaitForExit()
            $code  = $proc.ExitCode

            Remove-Item -LiteralPath $emptyDir -Recurse -Force -ErrorAction SilentlyContinue

            $failure.Notes += "robocopy exit code $code."

            # robocopy: codes < 8 are "success-ish"
            if ($code -lt 8) {
                try {
                    if (Test-Path -LiteralPath $Path) {
                        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
                    }
                    return [pscustomobject]@{ Success = $true; Details = $null }
                } catch {
                    Add-Attempt "After robocopy mirror, final Remove-Item failed: $($_.Exception.Message)"
                }
            } else {
                Add-Attempt "robocopy /MIR failed with exit code $code. stderr: $stderr"
            }
        }
    } catch {
        Add-Attempt "robocopy attempt threw: $($_.Exception.Message)"
    }

    # 5) Locking-process hint (and optional handle.exe integration)
    $allMessages = ($failure.Attempts + $failure.Error) -join " "
    if ($allMessages -match "being used by another process") {
        $failure.Notes += "Likely locked by another process (editor, terminal, node, antivirus, etc.). Close tools using this folder and retry."

        if (Get-Command "handle.exe" -ErrorAction SilentlyContinue) {
            try {
                $handleOutput = & handle.exe -nobanner $Path 2>&1
                if ($handleOutput) {
                    $failure.Notes += "handle.exe output:`n$handleOutput"
                }
            } catch {
                $failure.Notes += "Tried handle.exe but it failed: $($_.Exception.Message)"
            }
        } else {
            $failure.Notes += "Install Sysinternals 'handle.exe' and make sure it's on PATH to see which processes hold locks."
        }
    }

    return [pscustomobject]@{ Success = $false; Details = $failure }
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
        $info = Remove-DirWithFixes -Path $path

        if ($info.Success) {
            $result.Succeeded += $path
        } elseif ($info.Details) {
            $result.Failed += $info.Details
        }
    }
}
catch {
    $result.Failed += [pscustomobject]@{
        Path     = "WORKER"
        Error    = $_.Exception.Message
        Attempts = @()
        Notes    = @("Catastrophic error in worker.")
    }
}

# Write JSON summary
try {
    $json = $result | ConvertTo-Json -Depth 6
    $json | Set-Content -LiteralPath $OutputFile -Encoding UTF8
} catch {
    # ignore
}
