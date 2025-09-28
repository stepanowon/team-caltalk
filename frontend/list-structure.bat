@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo 프로젝트 구조:
tree /f /a src
echo.
echo 주요 설정 파일들:
if exist "tsconfig.json" echo - tsconfig.json 존재
if exist "vite.config.ts" echo - vite.config.ts 존재
if exist "vitest.config.ts" echo - vitest.config.ts 존재
if exist "eslint.config.js" echo - eslint.config.js 존재
if exist ".prettierrc" echo - .prettierrc 존재