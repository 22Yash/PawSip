$7za = "c:\Users\Administrator\OneDrive\Desktop\yash\hydration\pawsip\node_modules\7zip-bin\win\x64\7za.exe"
$cacheDir = "C:\Users\Administrator\AppData\Local\electron-builder\Cache\winCodeSign"
$dest = Join-Path $cacheDir "winCodeSign-2.6.0"

$archives = Get-ChildItem -Path $cacheDir -Filter "*.7z" | Sort-Object Length -Descending
if ($archives.Count -eq 0) {
    Write-Error "No .7z archive found in $cacheDir"
    exit 1
}

$archive = $archives[0].FullName
Write-Host "Found archive: $archive"

if (Test-Path $dest) {
    Remove-Item -Recurse -Force $dest
}

& $7za x $archive "-o$dest" "-x!darwin" -y
Write-Host "Extraction completed into: $dest"
Get-ChildItem -Path $dest
