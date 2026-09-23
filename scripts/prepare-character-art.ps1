Add-Type -AssemblyName System.Drawing

$sourceRoot = Join-Path $PSScriptRoot '..\assets\source\characters'
$targetRoot = Join-Path $PSScriptRoot '..\public\assets\characters'
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$sprites = @(
  @{ Name = 'player-idle'; Width = 64; Height = 72 },
  @{ Name = 'player-run-contact'; Width = 64; Height = 72 },
  @{ Name = 'player-forward'; Width = 64; Height = 72 },
  @{ Name = 'player-run'; Width = 64; Height = 72 },
  @{ Name = 'player-jump'; Width = 64; Height = 72 },
  @{ Name = 'player-crouch'; Width = 64; Height = 72 },
  @{ Name = 'player-up'; Width = 64; Height = 72 },
  @{ Name = 'player-diagonal-up'; Width = 64; Height = 72 },
  @{ Name = 'player-diagonal-down'; Width = 64; Height = 72 },
  @{ Name = 'player-death'; Width = 96; Height = 56 },
  @{ Name = 'player-victory'; Width = 64; Height = 96 },
  @{ Name = 'infantry'; Width = 56; Height = 64 },
  @{ Name = 'infantry-walk'; Width = 56; Height = 64 },
  @{ Name = 'rifle-soldier'; Width = 56; Height = 64 },
  @{ Name = 'rifle-soldier-walk'; Width = 56; Height = 64 },
  @{ Name = 'heavy-gunner'; Width = 68; Height = 68 },
  @{ Name = 'heavy-gunner-walk'; Width = 68; Height = 68 },
  @{ Name = 'shield-soldier'; Width = 60; Height = 64 },
  @{ Name = 'shield-soldier-walk'; Width = 60; Height = 64 },
  @{ Name = 'flying-drone'; Width = 72; Height = 48 },
  @{ Name = 'turret'; Width = 68; Height = 52 },
  @{ Name = 'jungle-siege-walker'; Width = 256; Height = 192 }
)

foreach ($sprite in $sprites) {
  $inputPath = Join-Path $sourceRoot ($sprite.Name + '.png')
  $outputPath = Join-Path $targetRoot ($sprite.Name + '.png')
  $source = [System.Drawing.Bitmap]::new($inputPath)
  try {
    $left = $source.Width
    $top = $source.Height
    $right = 0
    $bottom = 0
    for ($y = 0; $y -lt $source.Height; $y += 2) {
      for ($x = 0; $x -lt $source.Width; $x += 2) {
        if ($source.GetPixel($x, $y).A -le 20) { continue }
        if ($x -lt $left) { $left = $x }
        if ($x -gt $right) { $right = $x }
        if ($y -lt $top) { $top = $y }
        if ($y -gt $bottom) { $bottom = $y }
      }
    }
    if ($left -ge $right -or $top -ge $bottom) { throw "No opaque pixels in $inputPath" }
    $crop = [System.Drawing.Rectangle]::new(
      [Math]::Max(0, $left - 2), [Math]::Max(0, $top - 2),
      [Math]::Min($source.Width - [Math]::Max(0, $left - 2), $right - $left + 5),
      [Math]::Min($source.Height - [Math]::Max(0, $top - 2), $bottom - $top + 5)
    )
    $scale = [Math]::Min($sprite.Width / $crop.Width, $sprite.Height / $crop.Height)
    $drawWidth = [Math]::Max(1, [Math]::Round($crop.Width * $scale))
    $drawHeight = [Math]::Max(1, [Math]::Round($crop.Height * $scale))
    $destX = [Math]::Floor(($sprite.Width - $drawWidth) / 2)
    $destY = $sprite.Height - $drawHeight
    $result = [System.Drawing.Bitmap]::new($sprite.Width, $sprite.Height,
      [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($result)
      try {
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $destination = [System.Drawing.Rectangle]::new($destX, $destY, $drawWidth, $drawHeight)
        $graphics.DrawImage($source, $destination, $crop, [System.Drawing.GraphicsUnit]::Pixel)
      } finally { $graphics.Dispose() }
      $result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $result.Dispose() }
  } finally { $source.Dispose() }
}

Get-ChildItem -LiteralPath $targetRoot -File | Select-Object Name, Length
