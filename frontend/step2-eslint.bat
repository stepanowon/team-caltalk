@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo [2/5] ESLint 검사 실행 중...
echo ========================================
npm run lint
echo.
echo ESLint 검사 완료. 종료 코드: %errorlevel%