param([string]$InFile = "F:\Projekte\audible-dashboard\cover-urls.txt")
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
foreach ($line in Get-Content $InFile) {
  if (-not $line.Trim()) { continue }
  try {
    $r = Invoke-WebRequest -Uri $line.Trim() -Method Head -UseBasicParsing -TimeoutSec 20
    Write-Output "$line`t$($r.StatusCode)`t$($r.Headers['Content-Type'])"
  } catch {
    Write-Output "$line`tFEHLER`t$($_.Exception.Message)"
  }
}
