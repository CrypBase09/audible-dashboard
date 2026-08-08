param([Parameter(Mandatory = $true)][string]$Quelle)
$ErrorActionPreference = 'Stop'
$pin = (Get-Content 'F:\Projekte\audible-dashboard-privat\pin.txt' -Raw).Trim()
$rumpf = [System.IO.File]::ReadAllBytes($Quelle)
$r = Invoke-WebRequest -Uri 'https://hoerbuch-sync.crypbase09.workers.dev/state' -Method Put `
  -Headers @{ 'X-Pin' = $pin; 'Content-Type' = 'application/json; charset=utf-8' } `
  -Body $rumpf -UseBasicParsing
Write-Output ("PUT " + $r.StatusCode)
