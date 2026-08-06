# Prüft den Sync-Speicher auf offene Hörbuch-Wünsche und startet die Recherche sofort.
# Läuft als Windows-Aufgabe "HoerbuchWunschWaechter" alle 3 Minuten.
$ErrorActionPreference = "Stop"
$repo = "F:\Projekte\audible-dashboard"
$privat = "F:\Projekte\audible-dashboard-privat"
$sperre = Join-Path $privat "waechter.lock"

# Doppelstart verhindern: eine Sperrdatei, die nach 45 Minuten als verwaist gilt.
if (Test-Path $sperre) {
  $alter = (Get-Date) - (Get-Item $sperre).LastWriteTime
  if ($alter.TotalMinutes -lt 45) { exit 0 }
  Remove-Item $sperre -Force
}

$pin = (Get-Content (Join-Path $privat "pin.txt") -Raw).Trim()
$workerZeile = Select-String -Path (Join-Path $repo "js\config.js") -Pattern 'https://[^"]+'
$worker = $workerZeile.Matches[0].Value
$kopf = @{ "X-Pin" = $pin }

try { $state = (Invoke-WebRequest -Uri "$worker/state" -Headers $kopf -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json }
catch { exit 0 }

$jetzt = Get-Date
$zuTun = $false
$geaendert = $false

foreach ($p in @("sie", "er")) {
  $wuensche = $state.profile.$p.wishes
  if (-not $wuensche) { continue }
  foreach ($w in $wuensche) {
    if ($w.status -eq "offen") {
      $w.status = "in_arbeit"
      $w | Add-Member -NotePropertyName "gestartet" -NotePropertyValue $jetzt.ToString("o") -Force
      $geaendert = $true; $zuTun = $true
    }
    elseif ($w.status -eq "in_arbeit") {
      # Hängengebliebene Läufe nach 30 Minuten erneut versuchen.
      $start = if ($w.PSObject.Properties["gestartet"]) { [datetime]::Parse($w.gestartet) } else { $jetzt.AddHours(-1) }
      if (($jetzt - $start).TotalMinutes -gt 30) {
        $versuche = if ($w.PSObject.Properties["versuche"]) { [int]$w.versuche } else { 0 }
        if ($versuche -ge 2) { $w.status = "beantwortet" }
        else {
          $w | Add-Member -NotePropertyName "versuche" -NotePropertyValue ($versuche + 1) -Force
          $w | Add-Member -NotePropertyName "gestartet" -NotePropertyValue $jetzt.ToString("o") -Force
          $zuTun = $true
        }
        $geaendert = $true
      } else { $zuTun = $true }
    }
  }
}

# Sofort-Antworten, die älter als 24 Stunden sind, aufräumen — sie stehen dann in der Datei.
if ($state.frisch) {
  $behalten = @($state.frisch | Where-Object {
    (-not $_.erzeugt_am) -or (($jetzt - [datetime]::Parse($_.erzeugt_am)).TotalHours -lt 24)
  })
  if ($behalten.Count -ne $state.frisch.Count) { $state.frisch = $behalten; $geaendert = $true }
}

if (-not $zuTun) {
  if ($geaendert) {
    $state.version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    Invoke-WebRequest -Uri "$worker/state" -Method PUT -Headers ($kopf + @{ "Content-Type" = "application/json" }) -Body ($state | ConvertTo-Json -Depth 12 -Compress) -UseBasicParsing -TimeoutSec 20 | Out-Null
  }
  exit 0
}

# Status "in_arbeit" hochladen, damit das Dashboard sofort „ich recherchiere gerade" zeigt.
$state.version = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-WebRequest -Uri "$worker/state" -Method PUT -Headers ($kopf + @{ "Content-Type" = "application/json" }) -Body ($state | ConvertTo-Json -Depth 12 -Compress) -UseBasicParsing -TimeoutSec 20 | Out-Null

New-Item -ItemType File -Path $sperre -Force | Out-Null
try {
  Set-Location $repo
  & claude -p "Lies tools/wunsch-prompt.md und beantworte den offenen Wunsch exakt danach." --permission-mode acceptEdits --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,PowerShell" *> (Join-Path $privat "letzter-wunsch-lauf.log")
} finally {
  Remove-Item $sperre -Force -ErrorAction SilentlyContinue
}
