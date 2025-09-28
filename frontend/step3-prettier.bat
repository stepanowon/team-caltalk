@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo [3/5] Prettier 포맷 검사 실행 중...
echo ========================================
npm run format:check
echo.
echo Prettier 검사 완료. 종료 코드: %errorlevel%