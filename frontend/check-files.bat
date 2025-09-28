@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend\src"
echo 현재 위치: %cd%
echo.
echo src 디렉토리 내용:
dir /b /s *.ts *.tsx 2>nul
echo.
echo 주요 폴더들:
if exist "services" echo [✓] services 폴더 존재
if exist "stores" echo [✓] stores 폴더 존재
if exist "pages" echo [✓] pages 폴더 존재
if exist "components" echo [✓] components 폴더 존재
if exist "test" echo [✓] test 폴더 존재