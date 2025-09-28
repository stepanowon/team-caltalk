@echo off
cd /d "D:\dev\workspace_test\team-caltalk\frontend"
echo 인증 시스템 파일 확인...
echo.

if exist "src\services\auth.service.ts" (
    echo [✓] src\services\auth.service.ts 존재
) else (
    echo [✗] src\services\auth.service.ts 없음
)

if exist "src\stores\auth.store.ts" (
    echo [✓] src\stores\auth.store.ts 존재
) else (
    echo [✗] src\stores\auth.store.ts 없음
)

if exist "src\pages\Login.tsx" (
    echo [✓] src\pages\Login.tsx 존재
) else (
    echo [✗] src\pages\Login.tsx 없음
)

if exist "src\pages\Register.tsx" (
    echo [✓] src\pages\Register.tsx 존재
) else (
    echo [✗] src\pages\Register.tsx 없음
)

echo.
echo src 디렉토리 구조:
dir /b src