# Liest Produktseiten von audible.de und zieht die Cover-URL heraus.
# Eingabe: Textdatei, je Zeile "ASIN<TAB>Produktseiten-URL".
# Aufruf: powershell -File tools/cover-suchen.ps1 -Liste pfad\zur\liste.tsv
param([Parameter(Mandatory = $true)][string]$Liste)
$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
foreach ($zeile in (Get-Content $Liste)) {
  if (-not $zeile.Trim()) { continue }
  $teile = $zeile -split "`t"
  $asin = $teile[0].Trim()
  $url = $teile[1].Trim()
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 40 -Headers @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    $sr = New-Object System.IO.StreamReader($r.RawContentStream, [System.Text.Encoding]::UTF8)
    $html = $sr.ReadToEnd()
    $m = [regex]::Matches($html, 'https://m\.media-amazon\.com/images/I/[A-Za-z0-9%+._-]+\._SL500_\.jpg')
    if ($m.Count -gt 0) { Write-Output ($asin + "`t" + $m[0].Value) } else { Write-Output ($asin + "`tKEIN-COVER") }
  } catch { Write-Output ($asin + "`tFEHLER " + $_.Exception.Message) }
}
