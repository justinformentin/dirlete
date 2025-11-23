$input  = "dirlete.ps1"
$output = "dirlete.exe"
$icon   = "dirlete.ico"

# Read version from file
$versionFile = "version.txt"

if (-Not (Test-Path $versionFile)) {
    "1.0.0.0" | Set-Content $versionFile
}

$version = [Version](Get-Content $versionFile)

# Increment the build number
$newVersion = "{0}.{1}.{2}.{3}" -f $version.Major, $version.Minor, $version.Build, ($version.Revision + 1)

Set-Content $versionFile $newVersion

Invoke-ps2exe `
  -inputFile $input `
  -outputFile $output `
  -iconFile $icon `
  -title "Dirlete" `
  -description "Remove directories" `
  -company "Formentin" `
  -product "Dirlete" `
  -version $version `
  -copyright "© Formentin"