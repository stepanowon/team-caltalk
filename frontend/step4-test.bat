@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo [4/5] 빠른 테스트 실행 중...
echo ========================================
npm run test:quick
echo.
echo 테스트 완료. 종료 코드: %errorlevel%