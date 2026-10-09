param([string]$Url, [string]$OutFile)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
  $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 40 -Headers @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  $sr = New-Object System.IO.StreamReader($r.RawContentStream, [System.Text.Encoding]::UTF8)
  $html = $sr.ReadToEnd()
  [System.IO.File]::WriteAllText($OutFile, $html, [System.Text.Encoding]::UTF8)
  Write-Output "OK $($r.StatusCode) bytes=$($html.Length)"
} catch {
  Write-Output "FEHLER $($_.Exception.Message)"
}
