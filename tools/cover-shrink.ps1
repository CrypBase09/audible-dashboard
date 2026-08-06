param([string]$Manifest = "data/covers-manifest.json", [string]$Ziel = "covers", [int]$Breite = 200)
Add-Type -AssemblyName System.Drawing
$eintraege = Get-Content $Manifest -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force $Ziel | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq "image/jpeg"
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]80)
$fehler = 0
$neu = 0
foreach ($e in $eintraege.PSObject.Properties) {
  $ausgabe = Join-Path $Ziel "$($e.Name).jpg"
  if (Test-Path $ausgabe) { continue }
  try {
    $tmp = [System.IO.Path]::GetTempFileName()
    Invoke-WebRequest $e.Value -OutFile $tmp -UseBasicParsing -TimeoutSec 30
    $bild = [System.Drawing.Image]::FromFile($tmp)
    $hoehe = [int]($bild.Height * ($Breite / $bild.Width))
    $klein = New-Object System.Drawing.Bitmap $Breite, $hoehe
    $g = [System.Drawing.Graphics]::FromImage($klein)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($bild, 0, 0, $Breite, $hoehe)
    $klein.Save($ausgabe, $codec, $params)
    $g.Dispose(); $klein.Dispose(); $bild.Dispose(); Remove-Item $tmp -ErrorAction SilentlyContinue
    $neu++
  } catch { Write-Warning "Cover fehlgeschlagen: $($e.Name) - $($_.Exception.Message)"; $fehler++ }
}
Write-Output "Fertig. Neu geladen: $neu, fehlgeschlagen: $fehler"
