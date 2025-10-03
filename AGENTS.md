# 저장소 지침

# 반드시 지켜야 할 규칙

모든 대화 출력은 한국어로 할 것

## 프로젝트 구조 및 모듈 구성

백엔드 Express 서비스는 `backend/src`에 있으며, 기능별 라우터는 `backend/api`, 공용 헬퍼는 `backend/src`에 있습니다. 백엔드 테스트는 `backend/tests` 디렉터리에 `unit`, `integration`, `security`, `performance` 하위 그룹으로 나뉘어 있습니다. React 클라이언트는 `frontend/src`에 위치하며, 도메인별로 `components`, `pages`, `stores`, `services`, `test`에 구성되어 있습니다. 데이터베이스 마이그레이션 SQL과 시드 데이터는 `database/`에 있으며, 제품 노트와 OpenAPI 명세는 `docs/` 및 `swagger/`에 있습니다.

## 빌드, 테스트 및 개발 명령어

`backend/` 디렉터리에서는 `npm run dev`로 핫 리로드 개발 서버를, `npm start`로 프로덕션 서버를 실행합니다. 데이터베이스 작업은 `npm run db:migrate`, `npm run db:seed`, `npm run db:reset` 명령으로 수행합니다. `npm run lint`와 `npm run lint:fix`는 백엔드 코드 품질을 유지합니다. `frontend/`에서는 `npm run dev`로 Vite 개발 서버를, `npm run build`로 프로덕션 번들을, `npm run preview`로 빌드된 결과물을 서비스합니다. 프런트엔드 린팅과 포매팅은 `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`를 사용합니다.

## 코딩 스타일 및 네이밍 규칙

백엔드 JavaScript는 ESLint 권장 규칙과 Prettier 설정(`printWidth` 100, 두 칸 들여쓰기, 작은따옴표, 세미콜론)을 따릅니다. 변수와 함수는 `camelCase`, 클래스는 `PascalCase`를 사용하며, 파일 이름은 `teamRoutes.js`처럼 의미가 드러나도록 지정합니다. 프런트엔드 TypeScript도 동일한 스타일을 따르며, `tsconfig.json`에서 엄격한 타입 검사와 Tailwind 스타일링을 적용합니다. 푸시 전에 반드시 린트와 포맷 명령을 실행합니다.

## 테스트 지침

백엔드 테스트는 Jest로 실행하며, 스펙 파일 이름은 `*.test.js` 또는 `*.spec.js`로 지정합니다. `npm run test:coverage`로 확인되는 80% 커버리지 목표를 유지하고, 필요에 따라 `npm run test:unit`, `npm run test:integration`, `npm run test:security`와 같은 대상별 스위트를 실행합니다. 프런트엔드는 Testing Library와 함께 Vitest를 사용하며, 컴포넌트 스펙은 `__tests__` 폴더나 컴포넌트와 같은 위치의 `.test.tsx` 파일에 둡니다. 워치 모드는 `npm run test`, V8 커버리지는 `npm run test:coverage`, 플레키 테스트가 있으면 `npm run test:clear`로 Vitest 캐시를 정리합니다.

## 커밋 및 풀 리퀘스트 지침

최근 커밋은 `feat:`, `fix:`, `refactor:`, `docs:`와 같은 Conventional Commits 패턴을 따릅니다. 커밋 제목은 명령형으로 72자 이내로 유지하고, 동작 변경이나 마이그레이션이 있을 경우 본문에서 설명합니다. 풀 리퀘스트에는 관련 이슈 링크, 기능 및 UI 변화 요약, 수행한 수동/자동 테스트 목록, UI 업데이트가 있을 경우 스크린샷 또는 녹화를 포함합니다. 리뷰어가 막히지 않도록 새로운 환경 변수나 마이그레이션 절차는 반드시 안내합니다.

## 보안 및 환경 설정 팁

`backend/.env.example`을 `backend/.env`로 복사한 뒤, 로컬 실행 전에 데이터베이스 자격 증명과 JWT 시크릿을 업데이트합니다. 값이 채워진 `.env` 파일은 절대 커밋하지 않습니다. 배포 전에 레이트 리밋과 CORS 설정을 확인하고, 프런트엔드의 `frontend/src/services` 서비스 클라이언트가 환경별로 올바른 API 호스트를 참조하는지 점검합니다. 계약이 변경되면 `swagger/`의 API 명세를 다시 생성합니다.
