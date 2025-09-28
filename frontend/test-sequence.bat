@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"

echo ========================================
echo 인증 시스템 테스트 시퀀스 실행
echo ========================================
echo.

echo [사전 확인] 프로젝트 구조 및 파일 확인
echo ----------------------------------------
if exist "src" (
    echo [✓] src 디렉토리 존재
) else (
    echo [✗] src 디렉토리 없음 - 테스트 중단
    pause
    exit /b 1
)

if exist "package.json" (
    echo [✓] package.json 존재
) else (
    echo [✗] package.json 없음 - 테스트 중단
    pause
    exit /b 1
)

if exist "node_modules" (
    echo [✓] node_modules 존재
) else (
    echo [✗] node_modules 없음 - npm install 필요
    echo npm install 실행 중...
    npm install
    if %errorlevel% neq 0 (
        echo npm install 실패
        pause
        exit /b 1
    )
)

echo.
echo [1/5] TypeScript 컴파일 검사
echo ----------------------------------------
npx tsc --noEmit
set TSC_RESULT=%errorlevel%
if %TSC_RESULT% equ 0 (
    echo [✓] TypeScript 컴파일 성공
) else (
    echo [✗] TypeScript 컴파일 실패 (오류 코드: %TSC_RESULT%)
)

echo.
echo [2/5] ESLint 검사
echo ----------------------------------------
npm run lint
set LINT_RESULT=%errorlevel%
if %LINT_RESULT% equ 0 (
    echo [✓] ESLint 검사 성공
) else (
    echo [✗] ESLint 검사 실패 (오류 코드: %LINT_RESULT%)
)

echo.
echo [3/5] Prettier 포맷 검사
echo ----------------------------------------
npm run format:check
set PRETTIER_RESULT=%errorlevel%
if %PRETTIER_RESULT% equ 0 (
    echo [✓] Prettier 포맷 검사 성공
) else (
    echo [✗] Prettier 포맷 검사 실패 (오류 코드: %PRETTIER_RESULT%)
)

echo.
echo [4/5] 빠른 테스트 실행
echo ----------------------------------------
npm run test:quick
set TEST_RESULT=%errorlevel%
if %TEST_RESULT% equ 0 (
    echo [✓] 빠른 테스트 성공
) else (
    echo [✗] 빠른 테스트 실패 (오류 코드: %TEST_RESULT%)
)

echo.
echo [5/5] 프로덕션 빌드
echo ----------------------------------------
npm run build
set BUILD_RESULT=%errorlevel%
if %BUILD_RESULT% equ 0 (
    echo [✓] 프로덕션 빌드 성공
) else (
    echo [✗] 프로덕션 빌드 실패 (오류 코드: %BUILD_RESULT%)
)

echo.
echo ========================================
echo 테스트 결과 요약
echo ========================================
echo TypeScript 컴파일: %TSC_RESULT%
echo ESLint:            %LINT_RESULT%
echo Prettier:          %PRETTIER_RESULT%
echo 테스트:            %TEST_RESULT%
echo 빌드:              %BUILD_RESULT%

set /a TOTAL_ERRORS=%TSC_RESULT%+%LINT_RESULT%+%PRETTIER_RESULT%+%TEST_RESULT%+%BUILD_RESULT%

if %TOTAL_ERRORS% equ 0 (
    echo.
    echo [🎉] 모든 테스트 통과!
) else (
    echo.
    echo [💥] 일부 테스트 실패 (총 오류 수: %TOTAL_ERRORS%)
)

echo.
pause