# Pusht den aktuellen Stand und stößt die Pages-Auslieferung ausdrücklich an.
# Der ausdrückliche Aufruf ist ein Sicherheitsnetz: Am 06.08.2026 hat eine GitHub-Störung die
# Push-Webhooks auf ~15 % gedrosselt, sodass Pushes keine Läufe mehr erzeugten. Im Normalbetrieb
# löst der Push den Workflow selbst aus; dann läuft hier schlicht ein zweiter, harmloser Lauf.
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
