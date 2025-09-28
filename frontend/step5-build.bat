@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo [5/5] 프로덕션 빌드 실행 중...
echo ========================================
npm run build
echo.
echo 빌드 완료. 종료 코드: %errorlevel%