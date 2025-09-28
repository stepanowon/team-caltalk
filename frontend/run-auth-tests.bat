@echo off
setlocal enabledelayedexpansion

cd /d "D:\dev\workspace_test\team-caltalk\frontend"

echo ========================================
echo GitHub Issue #13 인증 시스템 테스트
echo ========================================
echo 시작 시간: %date% %time%
echo 현재 위치: %cd%
echo.

:: 사전 확인
echo [사전 확인] 필수 파일 및 디렉토리
echo ----------------------------------------
set MISSING_FILES=0

if not exist "package.json" (
    echo [✗] package.json 없음
    set /a MISSING_FILES+=1
)
if not exist "src" (
    echo [✗] src 디렉토리 없음
    set /a MISSING_FILES+=1
)
if not exist "node_modules" (
    echo [✗] node_modules 없음 - npm install 필요
    set /a MISSING_FILES+=1
)

if !MISSING_FILES! gtr 0 (
    echo.
    echo !MISSING_FILES!개 필수 요소가 누락되었습니다.
    if not exist "node_modules" (
        echo npm install을 실행합니다...
        npm install
        if !errorlevel! neq 0 (
            echo npm install 실패
            pause
            exit /b 1
        )
    )
)

echo [✓] 사전 확인 완료
echo.

:: 1. TypeScript 컴파일 검사
echo [1/5] TypeScript 컴파일 검사
echo ----------------------------------------
call npx tsc --noEmit
set TSC_RESULT=!errorlevel!
if !TSC_RESULT! equ 0 (
    echo [✅] TypeScript 컴파일 성공
) else (
    echo [❌] TypeScript 컴파일 실패 ^(코드: !TSC_RESULT!^)
)
echo.

:: 2. ESLint 검사
echo [2/5] ESLint 검사
echo ----------------------------------------
call npm run lint
set LINT_RESULT=!errorlevel!
if !LINT_RESULT! equ 0 (
    echo [✅] ESLint 검사 성공
) else (
    echo [❌] ESLint 검사 실패 ^(코드: !LINT_RESULT!^)
)
echo.

:: 3. Prettier 포맷 검사
echo [3/5] Prettier 포맷 검사
echo ----------------------------------------
call npm run format:check
set PRETTIER_RESULT=!errorlevel!
if !PRETTIER_RESULT! equ 0 (
    echo [✅] Prettier 포맷 검사 성공
) else (
    echo [❌] Prettier 포맷 검사 실패 ^(코드: !PRETTIER_RESULT!^)
)
echo.

:: 4. 단위 테스트 실행
echo [4/5] 단위 테스트 실행
echo ----------------------------------------
call npm run test:quick
set TEST_RESULT=!errorlevel!
if !TEST_RESULT! equ 0 (
    echo [✅] 단위 테스트 성공
) else (
    echo [❌] 단위 테스트 실패 ^(코드: !TEST_RESULT!^)
)
echo.

:: 5. 프로덕션 빌드
echo [5/5] 프로덕션 빌드
echo ----------------------------------------
call npm run build
set BUILD_RESULT=!errorlevel!
if !BUILD_RESULT! equ 0 (
    echo [✅] 프로덕션 빌드 성공
) else (
    echo [❌] 프로덕션 빌드 실패 ^(코드: !BUILD_RESULT!^)
)
echo.

:: 결과 요약
echo ========================================
echo 📋 테스트 결과 요약
echo ========================================
echo 완료 시간: %date% %time%
echo.

set /a PASSED=0
set /a FAILED=0

echo 1. TypeScript 컴파일:
if !TSC_RESULT! equ 0 (
    echo    ✅ 통과
    set /a PASSED+=1
) else (
    echo    ❌ 실패 ^(오류 코드: !TSC_RESULT!^)
    set /a FAILED+=1
)

echo 2. ESLint 검사:
if !LINT_RESULT! equ 0 (
    echo    ✅ 통과
    set /a PASSED+=1
) else (
    echo    ❌ 실패 ^(오류 코드: !LINT_RESULT!^)
    set /a FAILED+=1
)

echo 3. Prettier 포맷:
if !PRETTIER_RESULT! equ 0 (
    echo    ✅ 통과
    set /a PASSED+=1
) else (
    echo    ❌ 실패 ^(오류 코드: !PRETTIER_RESULT!^)
    set /a FAILED+=1
)

echo 4. 단위 테스트:
if !TEST_RESULT! equ 0 (
    echo    ✅ 통과
    set /a PASSED+=1
) else (
    echo    ❌ 실패 ^(오류 코드: !TEST_RESULT!^)
    set /a FAILED+=1
)

echo 5. 프로덕션 빌드:
if !BUILD_RESULT! equ 0 (
    echo    ✅ 통과
    set /a PASSED+=1
) else (
    echo    ❌ 실패 ^(오류 코드: !BUILD_RESULT!^)
    set /a FAILED+=1
)

echo.
echo 📊 최종 결과:
echo    통과: !PASSED!/5
echo    실패: !FAILED!/5

if !FAILED! equ 0 (
    echo.
    echo 🎉 모든 테스트 통과! 인증 시스템이 정상적으로 구현되었습니다.
    set OVERALL_RESULT=0
) else (
    echo.
    echo 💥 !FAILED!개 테스트 실패. 문제를 해결해야 합니다.
    set OVERALL_RESULT=1
)

echo.
echo ========================================
pause

exit /b !OVERALL_RESULT!