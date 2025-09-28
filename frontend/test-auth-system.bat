@echo off
echo ========================================
echo 인증 시스템 테스트 시작
echo ========================================
echo.

cd /d "D:\dev\workspace_test\team-caltalk\frontend"

echo [1/5] ESLint 검사 시작...
echo ----------------------------------------
call npm run lint
if %errorlevel% neq 0 (
    echo ESLint 검사 실패!
    echo.
) else (
    echo ESLint 검사 성공!
    echo.
)

echo [2/5] Prettier 포맷 검사 시작...
echo ----------------------------------------
call npm run format:check
if %errorlevel% neq 0 (
    echo Prettier 포맷 검사 실패!
    echo.
) else (
    echo Prettier 포맷 검사 성공!
    echo.
)

echo [3/5] TypeScript 컴파일 검사 시작...
echo ----------------------------------------
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo TypeScript 컴파일 검사 실패!
    echo.
) else (
    echo TypeScript 컴파일 검사 성공!
    echo.
)

echo [4/5] 빠른 테스트 실행 시작...
echo ----------------------------------------
call npm run test:quick
if %errorlevel% neq 0 (
    echo 빠른 테스트 실패!
    echo.
) else (
    echo 빠른 테스트 성공!
    echo.
)

echo [5/5] 프로덕션 빌드 테스트 시작...
echo ----------------------------------------
call npm run build
if %errorlevel% neq 0 (
    echo 프로덕션 빌드 실패!
    echo.
) else (
    echo 프로덕션 빌드 성공!
    echo.
)

echo ========================================
echo 인증 시스템 테스트 완료
echo ========================================
pause