param([string]$Url)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
try {
  $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 40 -Headers @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  $sr = New-Object System.IO.StreamReader($r.RawContentStream, [System.Text.Encoding]::UTF8)
  $html = $sr.ReadToEnd()
  $titleMatch = [regex]::Match($html, '<title>([^<]+)</title>')
  $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value } else { "(kein Titel gefunden)" }
  Write-Output "OK`t$($r.StatusCode)`t$title"
} catch {
  Write-Output "FEHLER`t$($_.Exception.Message)"
}
