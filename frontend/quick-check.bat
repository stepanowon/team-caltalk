@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"

echo 기본 파일 존재 확인:
if exist "src" echo [✓] src
if exist "package.json" echo [✓] package.json
if exist "tsconfig.json" echo [✓] tsconfig.json
if exist "vite.config.ts" echo [✓] vite.config.ts
if exist "node_modules" echo [✓] node_modules

echo.
echo npm 스크립트 확인:
npm run