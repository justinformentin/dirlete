Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ---------- Form ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = "Dirlete"
$form.Size = New-Object System.Drawing.Size(800, 600)
$form.StartPosition = "CenterScreen"

# ---------- Root folder ----------
$lblRoot = New-Object System.Windows.Forms.Label
$lblRoot.Text = "Root folder:"
$lblRoot.Location = New-Object System.Drawing.Point(10, 15)
$lblRoot.AutoSize = $true
$form.Controls.Add($lblRoot)

$txtRoot = New-Object System.Windows.Forms.TextBox
$txtRoot.Location = New-Object System.Drawing.Point(90, 10)
$txtRoot.Size = New-Object System.Drawing.Size(550, 20)
$form.Controls.Add($txtRoot)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Text = "Browse..."
$btnBrowse.Location = New-Object System.Drawing.Point(650, 8)
$btnBrowse.Size = New-Object System.Drawing.Size(100, 24)
$form.Controls.Add($btnBrowse)

# ---------- Folder names ----------
$lblNames = New-Object System.Windows.Forms.Label
$lblNames.Text = "Folder names to delete (comma-separated):"
$lblNames.Location = New-Object System.Drawing.Point(10, 45)
$lblNames.AutoSize = $true
$form.Controls.Add($lblNames)

$txtNames = New-Object System.Windows.Forms.TextBox
$txtNames.Location = New-Object System.Drawing.Point(10, 65)
$txtNames.Size = New-Object System.Drawing.Size(740, 20)
$txtNames.Text = "node_modules, .next"
$form.Controls.Add($txtNames)

# ---------- Buttons ----------
$btnScan = New-Object System.Windows.Forms.Button
$btnScan.Text = "Scan"
$btnScan.Location = New-Object System.Drawing.Point(10, 95)
$btnScan.Size = New-Object System.Drawing.Size(80, 30)
$form.Controls.Add($btnScan)

$btnDelete = New-Object System.Windows.Forms.Button
$btnDelete.Text = "Delete Selected"
$btnDelete.Location = New-Object System.Drawing.Point(100, 95)
$btnDelete.Size = New-Object System.Drawing.Size(110, 30)
$btnDelete.Enabled = $false
$form.Controls.Add($btnDelete)

$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Text = "Close"
$btnClose.Location = New-Object System.Drawing.Point(220, 95)
$btnClose.Size = New-Object System.Drawing.Size(80, 30)
$form.Controls.Add($btnClose)

$btnSelectAll = New-Object System.Windows.Forms.Button
$btnSelectAll.Text = "Select All"
$btnSelectAll.Location = New-Object System.Drawing.Point(310, 95)
$btnSelectAll.Size = New-Object System.Drawing.Size(80, 30)
$btnSelectAll.Enabled = $false
$form.Controls.Add($btnSelectAll)

$btnDeselectAll = New-Object System.Windows.Forms.Button
$btnDeselectAll.Text = "Deselect All"
$btnDeselectAll.Location = New-Object System.Drawing.Point(400, 95)
$btnDeselectAll.Size = New-Object System.Drawing.Size(90, 30)
$btnDeselectAll.Enabled = $false
$form.Controls.Add($btnDeselectAll)

# ---------- Progress bar ----------
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(10, 135)
$progressBar.Size = New-Object System.Drawing.Size(740, 20)
$progressBar.Style = 'Blocks'
$form.Controls.Add($progressBar)

# ---------- Status label ----------
$lblStatus = New-Object System.Windows.Forms.Label
$lblStatus.Text = "Status: Idle"
$lblStatus.Location = New-Object System.Drawing.Point(10, 160)
$lblStatus.AutoSize = $true
$form.Controls.Add($lblStatus)

# ---------- Results list (checkable) ----------
$lblResults = New-Object System.Windows.Forms.Label
$lblResults.Text = "Found folders (check those you want to delete):"
$lblResults.Location = New-Object System.Drawing.Point(10, 185)
$lblResults.AutoSize = $true
$form.Controls.Add($lblResults)

$listBox = New-Object System.Windows.Forms.CheckedListBox
$listBox.Location = New-Object System.Drawing.Point(10, 205)
$listBox.Size = New-Object System.Drawing.Size(740, 320)
$listBox.HorizontalScrollbar = $true
$listBox.CheckOnClick = $true
$form.Controls.Add($listBox)

# ---------- Timer + worker globals ----------
$workerTimer = New-Object System.Windows.Forms.Timer
$workerTimer.Interval = 500  # ms
$global:workerProcess    = $null
$global:workerOutputFile = $null

# ---------- Helper: disable/enable UI while running ----------
function Set-UIBusy([bool]$busy, [string]$statusText) {
    if ($busy) {
        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
    } else {
        $form.Cursor = [System.Windows.Forms.Cursors]::Default
        $progressBar.Style = 'Blocks'
        $progressBar.Value = 0
    }

    $hasItems = ($listBox.Items.Count -gt 0)

    $btnScan.Enabled        = -not $busy
    $btnDelete.Enabled      = ( (-not $busy) -and $hasItems )
    $btnBrowse.Enabled      = -not $busy
    $txtRoot.Enabled        = -not $busy
    $txtNames.Enabled       = -not $busy
    $btnSelectAll.Enabled   = ( (-not $busy) -and $hasItems )
    $btnDeselectAll.Enabled = ( (-not $busy) -and $hasItems )

    if ($statusText) {
        $lblStatus.Text = "Status: $statusText"
    }
}

# ---------- Helper: recursive finder that stops at first match per branch ----------
function Get-MatchingFoldersTopLevel {
    param(
        [string]$RootPath,
        [string[]]$Names
    )

    $matches = New-Object System.Collections.Generic.List[string]

    function Recurse([string]$path, [string[]]$Names, $matches) {
        try {
            $dirs = Get-ChildItem -Path $path -Directory -Force -ErrorAction SilentlyContinue
        } catch {
            return
        }

        foreach ($d in $dirs) {
            if ($Names -contains $d.Name) {
                # Found a match: record it, but DO NOT recurse into it
                $matches.Add($d.FullName) | Out-Null
            } else {
                # Not a match: keep going deeper
                Recurse -path $d.FullName -Names $Names -matches $matches
            }
        }
    }

    Recurse -path $RootPath -Names $Names -matches $matches
    return $matches
}

# ---------- Browse handler ----------
$btnBrowse.Add_Click({
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Select the root folder to scan"
    $dialog.ShowNewFolderButton = $false
    if ($dialog.ShowDialog() -eq "OK") {
        $txtRoot.Text = $dialog.SelectedPath
    }
})

# ---------- Scan handler ----------
$btnScan.Add_Click({
    $root = $txtRoot.Text
    if ([string]::IsNullOrWhiteSpace($root)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Please select a root folder.",
            "Invalid folder",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    $root = $root.Trim()

    if (-not (Test-Path $root)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Please select a valid root folder.",
            "Invalid folder",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    $nameInput = $txtNames.Text
    $names = $nameInput.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    if ($names.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "Please enter at least one folder name to delete.",
            "No folder names",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    $listBox.Items.Clear()
    Set-UIBusy $true "Scanning..."
    $progressBar.Style = 'Marquee'

    try {
        $dirs = Get-MatchingFoldersTopLevel -RootPath $root -Names $names

        foreach ($d in $dirs) {
            [void]$listBox.Items.Add($d, $true)  # default to checked
        }

        $count = $listBox.Items.Count
        Set-UIBusy $false "Scan complete. Found $count folder(s)."
    } catch {
        Set-UIBusy $false "Error during scan."
        [System.Windows.Forms.MessageBox]::Show(
            "An error occurred during scan:`r`n$($_.Exception.Message)",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
    }
})

# ---------- Select All / Deselect All ----------
$btnSelectAll.Add_Click({
    for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
        $listBox.SetItemChecked($i, $true)
    }
})

$btnDeselectAll.Add_Click({
    for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
        $listBox.SetItemChecked($i, $false)
    }
})

$workerTimer.Add_Tick({
    if ($global:workerProcess -and $global:workerProcess.HasExited) {
        $workerTimer.Stop()

        $succeeded = @()
        $failed    = @()

        try {
            if (-not [string]::IsNullOrWhiteSpace($global:workerOutputFile) -and
                (Test-Path -LiteralPath $global:workerOutputFile)) {

                $json = Get-Content -LiteralPath $global:workerOutputFile -Raw
                if ($json) {
                    $result = $json | ConvertFrom-Json
                    if ($result.Succeeded) {
                        if ($result.Succeeded -is [System.Collections.IEnumerable] -and
                            -not ($result.Succeeded -is [string])) {
                            foreach ($s in $result.Succeeded) { $succeeded += $s }
                        } else {
                            $succeeded += $result.Succeeded
                        }
                    }
                    if ($result.Failed) {
                        if ($result.Failed -is [System.Collections.IEnumerable] -and
                            -not ($result.Failed -is [string])) {
                            foreach ($f in $result.Failed) { $failed += $f }
                        } else {
                            $failed += $result.Failed
                        }
                    }
                }
            } else {
                $failed += [pscustomobject]@{
                    Path  = "UNKNOWN"
                    Error = "Result file not found."
                    Attempts = @()
                    Notes    = @()
                }
            }
        } catch {
            $failed += [pscustomobject]@{
                Path  = "UNKNOWN"
                Error = "RESULT PARSE ERROR: $($_.Exception.Message)"
                Attempts = @()
                Notes    = @()
            }
        }

        # Remove succeeded
        foreach ($path in $succeeded) {
            $p = [string]$path
            $idx = $listBox.Items.IndexOf($p)
            if ($idx -ge 0) {
                $listBox.Items.RemoveAt($idx)
            }
        }

        # Mark failed with reasons
        $failedSummaryLines = @()

        foreach ($failure in $failed) {
            $p = [string]$failure.Path
            $err = $failure.Error
            if (-not $err -and $failure.Attempts -and $failure.Attempts.Count -gt 0) {
                $err = $failure.Attempts[0]
            }
            if (-not $err) {
                $err = "Unknown error"
            }

            $display = "[FAILED] $p — $err"

            # Try to update existing line if present
            $idx = $listBox.Items.IndexOf($p)
            if ($idx -ge 0) {
                $listBox.Items[$idx] = $display
                $listBox.SetItemChecked($idx, $false)
            } else {
                [void]$listBox.Items.Add($display, $false)
            }

            $failedSummaryLines += "$p : $err"
        }

        Set-UIBusy $false ("Delete complete. Deleted {0}, errors {1}." -f $succeeded.Count, $failed.Count)

        if ($failedSummaryLines.Count -gt 0) {
            $msg = "Finished deleting with $($failedSummaryLines.Count) error(s).`r`n`r`n" +
                   ($failedSummaryLines -join "`r`n")
            [System.Windows.Forms.MessageBox]::Show(
                $msg,
                "Completed with errors",
                'OK',
                'Information'
            ) | Out-Null
        }

        # Cleanup
        $global:workerProcess    = $null
        $global:workerOutputFile = $null
    }
})


# ---------- Delete handler (starts worker EXE) ----------
$btnDelete.Add_Click({
    # Prevent concurrent deletions
    if ($global:workerProcess -and -not $global:workerProcess.HasExited) {
        [System.Windows.Forms.MessageBox]::Show(
            "A delete operation is already in progress. Please wait for it to finish.",
            "Busy",
            'OK',
            'Information'
        ) | Out-Null
        return
    }

    # Build list of checked paths
    $paths = @()
    for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
        if ($listBox.GetItemChecked($i)) {
            $paths += [string]$listBox.Items[$i]
        }
    }

    if ($paths.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "No folders are selected. Please check at least one folder to delete.",
            "Nothing selected",
            'OK',
            'Information'
        ) | Out-Null
        return
    }

    $confirm = [System.Windows.Forms.MessageBox]::Show(
        "This will delete the selected folders and their contents. Are you sure?",
        "Confirm delete",
        'YesNo',
        'Warning'
    )

    if ($confirm -ne 'Yes') { return }

    # Determine app directory from current process exe
    $exePath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
    if ([string]::IsNullOrWhiteSpace($exePath)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Unable to determine application path.",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    $scriptDir = [System.IO.Path]::GetDirectoryName($exePath)

    if ([string]::IsNullOrWhiteSpace($scriptDir) -or -not (Test-Path -LiteralPath $scriptDir)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Unable to determine application directory.",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    # Worker EXE path
    $workerExe = Join-Path $scriptDir "dirlete-worker.exe"

    if (-not (Test-Path -LiteralPath $workerExe)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Worker EXE not found:`r`n$workerExe",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    # Temp input/output files
    $tempDir    = [System.IO.Path]::GetTempPath()
    $inputFile  = Join-Path $tempDir ("dirlete_input_"  + [guid]::NewGuid().ToString() + ".txt")
    $outputFile = Join-Path $tempDir ("dirlete_output_" + [guid]::NewGuid().ToString() + ".json")

    if ([string]::IsNullOrWhiteSpace($inputFile) -or [string]::IsNullOrWhiteSpace($outputFile)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Failed to create temporary file paths.",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    # Write paths to input file
    try {
        $paths | Set-Content -LiteralPath $inputFile -Encoding UTF8
    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            "Failed to write input file:`r`n$($_.Exception.Message)",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    # Remember output file for timer
    $global:workerOutputFile = $outputFile

    # Start worker process (no window)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $workerExe
    $psi.Arguments = '"' + $inputFile + '" "' + $outputFile + '"'
    $psi.CreateNoWindow = $true
    $psi.UseShellExecute = $false

    try {
        $global:workerProcess = [System.Diagnostics.Process]::Start($psi)
    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            "Failed to start worker:`r`n$($_.Exception.Message)",
            "Error",
            'OK',
            'Error'
        ) | Out-Null
        return
    }

    # UI updates while worker runs
    Set-UIBusy $true "Deleting folders..."
    $progressBar.Style = 'Marquee'
    $workerTimer.Start()
})

# ---------- Close handler ----------
$btnClose.Add_Click({
    $form.Close()
})

# ---------- Run ----------
[void]$form.ShowDialog()
