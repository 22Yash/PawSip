Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pawsipDir = Split-Path -Parent $scriptDir
$srcPath = Join-Path $pawsipDir "public\assets\dog\asking.png"
$buildDir = Join-Path $pawsipDir "build"
$destIco = Join-Path $buildDir "icon.ico"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
}

Write-Host "Loading source image from: $srcPath"
$srcImg = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Original dimensions: $($srcImg.Width) x $($srcImg.Height)"

# Sizes to generate: 16, 24, 32, 48, 64, 128, 256
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$entries = @()
$payloads = @()

# Aspect ratio of puppy: width 500, height 373
$origW = $srcImg.Width
$origH = $srcImg.Height

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Scale to fit within $size x $size with 4% padding
    $pad = [Math]::Max(1, [int][Math]::Round($size * 0.04))
    $availW = $size - ($pad * 2)
    $availH = $size - ($pad * 2)

    $scale = [Math]::Min($availW / $origW, $availH / $origH)
    $targetW = [int][Math]::Round($origW * $scale)
    $targetH = [int][Math]::Round($origH * $scale)
    $targetX = [int][Math]::Round(($size - $targetW) / 2)
    $targetY = [int][Math]::Round(($size - $targetH) / 2)

    $destRect = New-Object System.Drawing.Rectangle($targetX, $targetY, $targetW, $targetH)
    $g.DrawImage($srcImg, $destRect, 0, 0, $origW, $origH, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    # For sizes <= 48, generate DIB format (uncompressed 32bpp BMP). For >= 64, generate PNG.
    if ($size -le 48) {
        # DIB payload: 40 bytes BITMAPINFOHEADER + BGRA pixels (bottom-to-top) + 1bpp AND mask
        $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
        $bmpData = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        
        $rowBytes = $size * 4
        $pixelBytes = New-Object byte[] ($rowBytes * $size)
        
        # Bottom-up row order
        for ($row = 0; $row -lt $size; $row++) {
            $srcPtr = [IntPtr]::Add($bmpData.Scan0, ($size - 1 - $row) * $bmpData.Stride)
            [System.Runtime.InteropServices.Marshal]::Copy($srcPtr, $pixelBytes, $row * $rowBytes, $rowBytes)
        }
        $bmp.UnlockBits($bmpData)

        # AND mask: 1 bit per pixel, each row padded to 32 bits (4 bytes)
        $andRowBytes = [int][Math]::Ceiling($size / 32.0) * 4
        $andMaskBytes = New-Object byte[] ($andRowBytes * $size)
        # For 32-bit icons with alpha channel, AND mask is 0 (all visible, alpha channel handles transparency)

        # Header: 40 bytes
        $ms = New-Object System.IO.MemoryStream
        $bw = New-Object System.IO.BinaryWriter($ms)
        $bw.Write([uint32]40)              # biSize
        $bw.Write([int32]$size)            # biWidth
        $bw.Write([int32]($size * 2))      # biHeight (doubled for XOR + AND masks)
        $bw.Write([uint16]1)               # biPlanes
        $bw.Write([uint16]32)              # biBitCount
        $bw.Write([uint32]0)               # biCompression (BI_RGB)
        $bw.Write([uint32]($pixelBytes.Length + $andMaskBytes.Length)) # biSizeImage
        $bw.Write([int32]0)                # biXPelsPerMeter
        $bw.Write([int32]0)                # biYPelsPerMeter
        $bw.Write([uint32]0)               # biClrUsed
        $bw.Write([uint32]0)               # biClrImportant

        $bw.Write($pixelBytes, 0, $pixelBytes.Length)
        $bw.Write($andMaskBytes, 0, $andMaskBytes.Length)
        $bw.Flush()
        $payload = $ms.ToArray()
        $bw.Dispose()
        $ms.Dispose()
    } else {
        # PNG payload
        $ms = New-Object System.IO.MemoryStream
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $payload = $ms.ToArray()
        $ms.Dispose()
    }

    $payloads += ,$payload

    $entry = [PSCustomObject]@{
        Width = if ($size -ge 256) { 0 } else { [byte]$size }
        Height = if ($size -ge 256) { 0 } else { [byte]$size }
        ColorCount = [byte]0
        Reserved = [byte]0
        Planes = [uint16]1
        BitCount = [uint16]32
        BytesInRes = [uint32]$payload.Length
        ImageOffset = [uint32]0 # will calculate below
    }
    $entries += $entry

    $bmp.Dispose()
    Write-Host "Prepared size $size x $size (Payload: $($payload.Length) bytes)"
}

$srcImg.Dispose()

# Calculate offsets
# Header size = 6 bytes
# Directory entries size = 16 bytes * count
$currentOffset = 6 + (16 * $entries.Count)
for ($i = 0; $i -lt $entries.Count; $i++) {
    $entries[$i].ImageOffset = [uint32]$currentOffset
    $currentOffset += $payloads[$i].Length
}

# Write ICO file
$fs = New-Object System.IO.FileStream($destIco, [System.IO.FileMode]::Create)
$outWriter = New-Object System.IO.BinaryWriter($fs)

# Write ICONDIR
$outWriter.Write([uint16]0)                # idReserved
$outWriter.Write([uint16]1)                # idType (1 for icon)
$outWriter.Write([uint16]$entries.Count)   # idCount

# Write ICONDIRENTRY array
foreach ($entry in $entries) {
    $outWriter.Write([byte]$entry.Width)
    $outWriter.Write([byte]$entry.Height)
    $outWriter.Write([byte]$entry.ColorCount)
    $outWriter.Write([byte]$entry.Reserved)
    $outWriter.Write([uint16]$entry.Planes)
    $outWriter.Write([uint16]$entry.BitCount)
    $outWriter.Write([uint32]$entry.BytesInRes)
    $outWriter.Write([uint32]$entry.ImageOffset)
}

# Write image payloads
foreach ($p in $payloads) {
    $outWriter.Write($p, 0, $p.Length)
}

$outWriter.Flush()
$outWriter.Dispose()
$fs.Dispose()

Write-Host "Successfully generated icon.ico at: $destIco"
Write-Host "File size: $((Get-Item $destIco).Length) bytes"
