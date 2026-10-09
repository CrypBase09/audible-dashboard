param(
  [string]$InFile = "F:\Projekte\audible-dashboard\verify-in.txt",
  [string]$OutFile = "F:\Projekte\audible-dashboard\verify-out.txt"
)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$lines = Get-Content -Path $InFile -Encoding UTF8
$results = @()
foreach ($line in $lines) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $asin = $line.Trim()
  $url = "https://www.audible.de/pd/$asin"
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 40 -Headers @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    $sr = New-Object System.IO.StreamReader($r.RawContentStream, [System.Text.Encoding]::UTF8)
    $html = $sr.ReadToEnd()
    $titleMatch = [regex]::Match($html, '<title>([^<]+)</title>')
    $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value } else { "(kein Titel gefunden)" }
    $results += "$asin`tOK`t$($r.StatusCode)`t$title"
  } catch {
    $results += "$asin`tFEHLER`t$($_.Exception.Message)"
  }
}
[System.IO.File]::WriteAllLines($OutFile, $results, [System.Text.Encoding]::UTF8)
