@echo off
REM Daily TaejaWorld news pipeline runner
REM Calls the PowerShell script with fixed parameters.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "E:\02_Workspace\run_news_pipeline.ps1" -BaseUrl "http://127.0.0.1:3000" -ItemsPerFeed 8 -Limit 8

