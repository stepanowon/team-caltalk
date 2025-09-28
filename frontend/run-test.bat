@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo 현재 디렉토리: %cd%
echo.

echo [1/5] ESLint 검사...
npm run lint
echo ESLint 결과: %errorlevel%
echo.

echo [2/5] Prettier 포맷 검사...
npm run format:check
echo Prettier 결과: %errorlevel%
echo.

echo [3/5] 빠른 테스트...
npm run test:quick
echo 빠른 테스트 결과: %errorlevel%
echo.

echo [4/5] 프로덕션 빌드...
npm run build
echo 빌드 결과: %errorlevel%
echo.