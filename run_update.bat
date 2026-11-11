@echo off
rem Daily OGRA price update. OGRA blocks GitHub's servers (HTTP 403), so this runs on this PC.
cd /d "%~dp0"
"C:\Users\Ali Hassan\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\python.exe" -P update_prices.py || exit /b 1
git add prices.json prices.js
git diff --cached --quiet && exit /b 0
git -c user.name="FAR app" -c user.email="finops@mindstormstudios.com" commit -m "Update OGRA prices"
git pull --rebase -q origin main
git push -q origin main
