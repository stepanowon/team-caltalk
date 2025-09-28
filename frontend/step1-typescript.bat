@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo [1/5] TypeScript 컴파일 검사 실행 중...
echo ========================================
npx tsc --noEmit --pretty
echo.
echo TypeScript 검사 완료. 종료 코드: %errorlevel%