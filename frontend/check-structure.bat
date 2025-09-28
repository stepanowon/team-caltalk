@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo src 폴더 전체 구조:
tree /a src
echo.
echo package.json 의존성 확인:
echo.
echo Dependencies:
npm list --depth=0 2>nul
echo.
echo DevDependencies는 package.json에서 확인 가능