# Pusht den aktuellen Stand und stößt die Pages-Auslieferung ausdrücklich an.
# Grund: Pushes lösen den Workflow bei diesem Repo nicht zuverlässig aus (geprüft 06.08.2026,
# Actions aktiv und Workflow scharf, trotzdem null Läufe). Der ausdrückliche Aufruf macht die
# Auslieferung unabhängig davon.
param([string]$Nachricht = "data: Aktualisierung")

$ErrorActionPreference = "Stop"
Set-Location "F:\Projekte\audible-dashboard"

if (git status --porcelain) {
  git add -A
  git commit -m $Nachricht | Out-Null
}
git push | Out-Null

gh workflow run "pages.yml" --repo CrypBase09/audible-dashboard --ref main | Out-Null
Start-Sleep 12

$k = @{ "Accept" = "application/vnd.github+json"; "User-Agent" = "ps" }
for ($i = 0; $i -lt 30; $i++) {
  $l = (Invoke-WebRequest -Uri "https://api.github.com/repos/CrypBase09/audible-dashboard/actions/workflows/pages.yml/runs?per_page=1" -Headers $k -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json
  $r = $l.workflow_runs[0]
  if ($r.status -eq "completed") {
    Write-Output "Auslieferung: $($r.conclusion)"
    if ($r.conclusion -ne "success") { exit 1 }
    exit 0
  }
  Start-Sleep 15
}
Write-Output "Auslieferung nach 7 Minuten noch nicht abgeschlossen"
exit 1
