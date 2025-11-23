Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ---------- Form ----------
$form = New-Object System.Windows.Forms.Form
$form.Text = "Folder Cleaner"
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
$btnDelete.Size = New-Object System.Drawing.Size(100, 30)
$btnDelete.Enabled = $false
$form.Controls.Add($btnDelete)

$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Text = "Close"
$btnClose.Location = New-Object System.Drawing.Point(210, 95)
$btnClose.Size = New-Object System.Drawing.Size(80, 30)
$form.Controls.Add($btnClose)

# Optional: Select All / Deselect All
$btnSelectAll = New-Object System.Windows.Forms.Button
$btnSelectAll.Text = "Select All"
$btnSelectAll.Location = New-Object System.Drawing.Point(300, 95)
$btnSelectAll.Size = New-Object System.Drawing.Size(80, 30)
$btnSelectAll.Enabled = $false
$form.Controls.Add($btnSelectAll)

$btnDeselectAll = New-Object System.Windows.Forms.Button
$btnDeselectAll.Text = "Deselect All"
$btnDeselectAll.Location = New-Object System.Drawing.Point(390, 95)
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

# ---------- Browse handler ----------
$btnBrowse.Add_Click({
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "Select the root folder to scan"
    $dialog.ShowNewFolderButton = $false
    if ($dialog.ShowDialog() -eq "OK") {
        $txtRoot.Text = $dialog.SelectedPath
    }
})

# ---------- Helper: disable/enable UI while running ----------
function Set-UIBusy([bool]$busy, [string]$statusText) {
    if ($busy) {
        $form.Cursor = [System.Windows.Forms.Cursors]::WaitCursor
        $progressBar.Style = 'Marquee'
    } else {
        $form.Cursor = [System.Windows.Forms.Cursors]::Default
        $progressBar.Style = 'Blocks'
        $progressBar.Value = 0
    }
    $btnScan.Enabled = -not $busy
    $btnDelete.Enabled = ( (-not $busy) -and ($listBox.Items.Count -gt 0) )
    $btnBrowse.Enabled = -not $busy
    $txtRoot.Enabled = -not $busy
    $txtNames.Enabled = -not $busy
    $btnSelectAll.Enabled = ( (-not $busy) -and ($listBox.Items.Count -gt 0) )
    $btnDeselectAll.Enabled = ( (-not $busy) -and ($listBox.Items.Count -gt 0) )

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

# ---------- Scan handler ----------
$btnScan.Add_Click({
    $root = $txtRoot.Text.Trim()
    if (-not (Test-Path $root)) {
        [System.Windows.Forms.MessageBox]::Show("Please select a valid root folder.",
            "Invalid folder", 'OK', 'Error') | Out-Null
        return
    }

    $nameInput = $txtNames.Text
    $names = $nameInput.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    if ($names.Count -eq 0) {
        [System.Windows.Forms.MessageBox]::Show("Please enter at least one folder name to delete.",
            "No folder names", 'OK', 'Error') | Out-Null
        return
    }

    $listBox.Items.Clear()
    Set-UIBusy $true "Scanning..."

    try {
        # Use custom recursive function that stops recursing once a match is found
        $dirs = Get-MatchingFoldersTopLevel -RootPath $root -Names $names

        foreach ($d in $dirs) {
            [void]$listBox.Items.Add($d, $true) # default to checked
        }

        $count = $listBox.Items.Count
        Set-UIBusy $false "Scan complete. Found $count folder(s)."
    } catch {
        Set-UIBusy $false "Error during scan."
        [System.Windows.Forms.MessageBox]::Show(
            "An error occurred during scan:`r`n$($_.Exception.Message)",
            "Error", 'OK', 'Error'
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

# ---------- Delete handler ----------
$btnDelete.Add_Click({
    $checked = @($listBox.CheckedItems)
    if ($checked.Count -eq 0) {
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

    Set-UIBusy $true "Deleting folders..."
    $progressBar.Style = 'Blocks'
    $progressBar.Minimum = 0
    $progressBar.Maximum = $checked.Count
    $progressBar.Value = 0

    $deleted = 0
    $errors = 0

    foreach ($path in $checked) {
        try {
            if (Test-Path $path) {
                Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction Stop
                $deleted++
            }
        } catch {
            $errors++
        }

        if ($progressBar.Value -lt $progressBar.Maximum) {
            $progressBar.Value++
        }

        # Let the UI process messages so it doesn't show "Not Responding"
        [System.Windows.Forms.Application]::DoEvents()
    }

    # After we're done deleting, remove checked items from the list
    for ($i = $listBox.Items.Count - 1; $i -ge 0; $i--) {
        if ($listBox.GetItemChecked($i)) {
            $listBox.Items.RemoveAt($i)
        }
    }

    Set-UIBusy $false "Delete complete. Deleted $deleted, errors $errors."

    if ($errors -gt 0) {
        [System.Windows.Forms.MessageBox]::Show(
            "Finished deleting with $errors error(s). Some folders may have been locked or protected.",
            "Completed with errors",
            'OK',
            'Information'
        ) | Out-Null
    }
})

# ---------- Close handler ----------
$btnClose.Add_Click({
    $form.Close()
})

# ---------- Run ----------
[void]$form.ShowDialog()
