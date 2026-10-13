@echo off
rem Weekly M.M Bags backup (run by Windows Task Scheduler — see scripts/backup/README.md).
cd /d "%~dp0..\.."
if not exist "%USERPROFILE%\MM-Bags-Backups" mkdir "%USERPROFILE%\MM-Bags-Backups"
echo ==== %date% %time% ==== >> "%USERPROFILE%\MM-Bags-Backups\backup.log"
node scripts\backup\export-data.mjs >> "%USERPROFILE%\MM-Bags-Backups\backup.log" 2>&1
echo exit code %errorlevel% >> "%USERPROFILE%\MM-Bags-Backups\backup.log"
