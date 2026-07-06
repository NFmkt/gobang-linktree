@echo off
chcp 65001
cd /d "%~dp0"
start http://localhost:3939
npm run dev
