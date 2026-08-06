@echo off
cd /d F:\Projekte\audible-dashboard
claude -p "Lies tools/refresh-prompt.md und führe den Auffrisch-Lauf exakt danach aus." --permission-mode acceptEdits --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch" > "F:\Projekte\audible-dashboard-privat\letzter-lauf.log" 2>&1
