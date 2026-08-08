param([string]$Ziel = 'F:\Projekte\audible-dashboard-privat\state-now.json')
$ErrorActionPreference = 'Stop'
$pin = (Get-Content 'F:\Projekte\audible-dashboard-privat\pin.txt' -Raw).Trim()
$r = Invoke-WebRequest -Uri 'https://hoerbuch-sync.crypbase09.workers.dev/state' -Headers @{ 'X-Pin' = $pin } -UseBasicParsing
$sr = New-Object System.IO.StreamReader($r.RawContentStream, [System.Text.Encoding]::UTF8)
$txt = $sr.ReadToEnd()
[System.IO.File]::WriteAllText($Ziel, $txt, (New-Object System.Text.UTF8Encoding($false)))
Write-Output ("OK " + $r.StatusCode + " " + $txt.Length + " Zeichen -> " + $Ziel)
