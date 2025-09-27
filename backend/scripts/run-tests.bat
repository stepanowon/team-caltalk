@echo off
echo ====================================
echo Team CalTalk 백엔드 테스트 실행 스크립트
echo ====================================
echo.

:: 현재 디렉토리 확인
echo [INFO] 현재 디렉토리: %CD%
echo.

:: Node.js 및 npm 버전 확인
echo [INFO] Node.js 및 npm 버전 확인...
node --version
npm --version
echo.

:: 의존성 설치 확인
echo [INFO] 의존성 설치 확인...
if not exist "node_modules" (
    echo [INFO] node_modules가 없습니다. npm install을 실행합니다...
    npm install
    if errorlevel 1 (
        echo [ERROR] npm install 실패
        exit /b 1
    )
) else (
    echo [INFO] node_modules가 존재합니다.
)
echo.

:: 환경 변수 설정
echo [INFO] 테스트 환경 변수 설정...
set NODE_ENV=test
set JWT_SECRET=test-jwt-secret-key-very-long-and-secure
set JWT_EXPIRES_IN=1h
set BCRYPT_ROUNDS=10
echo.

:: 데이터베이스 연결 확인
echo [INFO] 테스트 데이터베이스 연결 확인...
psql -h localhost -p 5432 -U team_caltalk_user -d team_caltalk_test -c "SELECT 1;" 2>nul
if errorlevel 1 (
    echo [WARNING] 테스트 데이터베이스에 연결할 수 없습니다.
    echo [INFO] 테스트를 계속 진행하지만 일부 테스트가 실패할 수 있습니다.
) else (
    echo [INFO] 테스트 데이터베이스 연결 성공
)
echo.

:: 메뉴 출력
echo ====================================
echo 테스트 옵션을 선택하세요:
echo ====================================
echo 1. 모든 테스트 실행
echo 2. 단위 테스트만 실행
echo 3. 통합 테스트만 실행
echo 4. 보안 테스트만 실행
echo 5. 성능 테스트만 실행
echo 6. 커버리지 리포트 생성
echo 7. 감시 모드로 실행
echo 8. CI 모드로 실행
echo 9. 종료
echo ====================================

set /p choice="선택 (1-9): "

if "%choice%"=="1" goto run_all
if "%choice%"=="2" goto run_unit
if "%choice%"=="3" goto run_integration
if "%choice%"=="4" goto run_security
if "%choice%"=="5" goto run_performance
if "%choice%"=="6" goto run_coverage
if "%choice%"=="7" goto run_watch
if "%choice%"=="8" goto run_ci
if "%choice%"=="9" goto end
goto invalid_choice

:run_all
echo.
echo [INFO] 모든 테스트를 실행합니다...
npm test
goto show_results

:run_unit
echo.
echo [INFO] 단위 테스트를 실행합니다...
npm run test:unit
goto show_results

:run_integration
echo.
echo [INFO] 통합 테스트를 실행합니다...
npm run test:integration
goto show_results

:run_security
echo.
echo [INFO] 보안 테스트를 실행합니다...
npm run test:security
goto show_results

:run_performance
echo.
echo [INFO] 성능 테스트를 실행합니다...
npm run test:performance
goto show_results

:run_coverage
echo.
echo [INFO] 커버리지 리포트를 생성합니다...
npm run test:coverage
echo.
echo [INFO] 커버리지 리포트가 coverage/ 디렉토리에 생성되었습니다.
echo [INFO] coverage/lcov-report/index.html을 브라우저에서 열어 확인하세요.
goto end

:run_watch
echo.
echo [INFO] 감시 모드로 테스트를 실행합니다...
echo [INFO] 파일 변경 시 자동으로 테스트가 재실행됩니다.
echo [INFO] Ctrl+C로 종료할 수 있습니다.
npm run test:watch
goto end

:run_ci
echo.
echo [INFO] CI 모드로 테스트를 실행합니다...
npm run test:ci
goto show_results

:invalid_choice
echo.
echo [ERROR] 잘못된 선택입니다. 1-9 중에서 선택해주세요.
echo.
goto show_menu

:show_results
echo.
echo ====================================
echo 테스트 결과 요약
echo ====================================
if errorlevel 1 (
    echo [FAIL] 일부 테스트가 실패했습니다.
    echo [INFO] 실패한 테스트를 확인하고 수정해주세요.
) else (
    echo [PASS] 모든 테스트가 성공했습니다!
    echo [INFO] 코드 품질이 기준을 충족합니다.
)
echo.

:: 커버리지 정보 확인
if exist "coverage\coverage-summary.json" (
    echo [INFO] 커버리지 정보:
    findstr "lines\|statements\|functions\|branches" coverage\coverage-summary.json 2>nul
    echo [INFO] 자세한 커버리지 리포트: coverage\lcov-report\index.html
) else (
    echo [INFO] 커버리지 정보를 확인하려면 'npm run test:coverage'를 실행하세요.
)
echo.

:: 다음 단계 안내
echo ====================================
echo 다음 단계
echo ====================================
echo 1. 실패한 테스트가 있다면 코드를 수정하세요
echo 2. 커버리지가 80% 미만이면 테스트를 추가하세요
echo 3. 모든 테스트가 통과하면 코드 리뷰를 요청하세요
echo 4. 성능 테스트 결과를 확인하고 최적화하세요
echo ====================================
echo.

set /p continue="다른 테스트를 실행하시겠습니까? (y/n): "
if /i "%continue%"=="y" goto show_menu

:end
echo.
echo [INFO] 테스트 스크립트를 종료합니다.
echo [INFO] 좋은 코딩 되세요! 🚀
pause
exit /b 0