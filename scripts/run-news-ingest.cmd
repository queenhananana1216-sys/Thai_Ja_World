@echo off
setlocal
cd /d "%~dp0.."
call npx --yes tsx scripts/run-news-ingest-once.ts
exit /b %ERRORLEVEL%
