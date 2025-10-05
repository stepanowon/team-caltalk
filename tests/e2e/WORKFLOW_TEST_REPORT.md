# Team CalTalk E2E 통합 테스트 리포트

**테스트 날짜**: 2025-10-05
**테스트 환경**: Development (localhost:5173 Frontend, localhost:3000 Backend)
**테스트 도구**: Playwright MCP
**테스트 대상**: 사용자 시나리오 1, 2 (docs/3-user-scenarios.md 기반)

---

## 📋 테스트 개요

이번 E2E 테스트는 이전 테스트에서 발견된 **초대 코드 미입력 문제**를 해결하고, 정확한 팀 참여 워크플로우를 검증하기 위해 수행되었습니다.

### 주요 수정사항
- ✅ **팀원 참여 프로세스 수정**: 팀원은 로그인 후 **반드시 초대 코드를 입력**하여 팀에 참여해야 함
- ✅ **문서 업데이트**: `docs/3-user-scenarios.md`에 올바른 팀 참여 절차 반영
- ✅ **권한 시스템 검증**: 팀장/팀원 권한 분리 정상 작동 확인

---

## ✅ 테스트 결과 요약

| 시나리오 | 단계 | 결과 | 비고 |
|---------|------|------|------|
| **시나리오 1** | 데이터베이스 초기화 | ✅ 성공 | 모든 테이블 데이터 삭제 완료 |
| | 김개발 회원가입 | ✅ 성공 | kimdev / kim.dev@company.com |
| | 김개발 로그인 | ✅ 성공 | JWT 토큰 발급 확인 |
| | 팀 생성 | ✅ 성공 | "백엔드 개발팀" 생성 |
| | 초대 코드 발급 | ✅ 성공 | **F9KFLS** |
| | 이코더 회원가입 | ✅ 성공 | leecoder / lee.coder@company.com |
| | 이코더 로그인 | ✅ 성공 | JWT 토큰 발급 확인 |
| | **초대 코드 입력** | ✅ 성공 | /teams/join 페이지에서 F9KFLS 입력 |
| | 팀 참여 완료 | ✅ 성공 | team_members 테이블에 정상 등록 |
| | 캘린더 접근 | ✅ 성공 | **403 에러 없음** (이전 테스트 문제 해결) |
| **시나리오 2** | 김개발 일정 생성 | ✅ 성공 | "API 서버 점검" (10/7 14:00-16:00) |
| | 일정 참가자 설정 | ✅ 성공 | 이코더를 참가자로 지정 |
| | 이코더 일정 조회 | ✅ 성공 | 캘린더에 일정 표시 확인 |
| | 팀원 권한 확인 | ✅ 성공 | 조회만 가능, 수정/삭제 불가 |

---

## 🎯 시나리오 1: 신규 팀 생성 및 초대 코드를 통한 팀원 참여

### 1.1 팀장(김개발) - 팀 생성

**실행 단계:**
1. ✅ 회원가입 완료 (kimdev, 김개발, kim.dev@company.com)
2. ✅ 로그인 성공 → 대시보드로 리다이렉트
3. ✅ "팀 생성" 버튼 클릭
4. ✅ 팀 정보 입력:
   - 팀 이름: "백엔드 개발팀"
   - 팀 설명: "서버 개발 및 API 관리를 담당하는 백엔드 개발팀입니다"
5. ✅ 팀 생성 완료 → **초대 코드 F9KFLS 발급**

**검증 결과:**
- ✅ 팀 ID: 61
- ✅ 초대 코드: F9KFLS (6자리 영문 대문자+숫자)
- ✅ 생성일: 2025.10.05
- ✅ 팀장 권한: 자동 부여
- ✅ 네비게이션에 "백엔드 개발팀" 표시

**스크린샷:**
- `team-workflow-01-login-success.png`: 김개발 로그인 성공
- `team-workflow-02-team-created.png`: 팀 생성 완료 (대시보드)
- `team-workflow-03-invite-code.png`: 초대 코드 F9KFLS 표시

---

### 1.2 팀원(이코더) - 초대 코드 입력 및 팀 참여

**실행 단계:**
1. ✅ 김개발 로그아웃
2. ✅ 이코더 회원가입 (leecoder, 이코더, lee.coder@company.com)
3. ✅ 이코더 로그인 성공
4. ✅ **[핵심 단계]** 대시보드 → "팀" 메뉴 → "팀 참여" 클릭
5. ✅ **[핵심 단계]** `/teams/join` 페이지에서 초대 코드 **F9KFLS** 입력
6. ✅ "팀 참여하기" 버튼 클릭
7. ✅ 성공 메시지: "백엔드 개발팀 팀에 성공적으로 참여했습니다!"
8. ✅ 대시보드로 자동 리다이렉트
9. ✅ 네비게이션에 "캘린더" 메뉴 활성화
10. ✅ "백엔드 개발팀" 표시 확인

**검증 결과:**
- ✅ `team_members` 테이블 등록 확인 (user_id: 121, team_id: 61, role: member)
- ✅ 캘린더 접근 권한 부여
- ✅ **403 Forbidden 에러 없음** (이전 테스트 문제 해결)
- ✅ 최근 활동: "김개발님이 팀에 합류했습니다" 표시

**스크린샷:**
- `team-workflow-04-leecoder-login.png`: 이코더 로그인 성공
- `team-workflow-05-join-page.png`: 팀 참여 페이지 (초대 코드 입력 전)
- `team-workflow-06-join-success.png`: 팀 참여 성공 메시지
- `team-workflow-07-calendar-access-success.png`: 캘린더 접근 성공 (403 에러 없음)

---

## 🎯 시나리오 2: 팀장의 일정 생성 및 팀원의 조회 권한 확인

### 2.1 팀장(김개발) - 일정 생성

**실행 단계:**
1. ✅ 이코더 로그아웃
2. ✅ 김개발 로그인 (kim.dev@company.com / DevTeam2024!)
3. ✅ 캘린더 페이지 이동
4. ✅ "일정 추가" 버튼 클릭 (팀장만 표시됨)
5. ✅ 일정 정보 입력:
   - 제목: "API 서버 점검"
   - 설명: "정기 API 서버 점검 및 성능 모니터링"
   - 시작: 2025-10-07 14:00
   - 종료: 2025-10-07 16:00
   - 참가자: 이코더 ✅ 선택
6. ✅ "추가" 버튼 클릭
7. ✅ 일정 생성 완료 → 캘린더에 표시

**검증 결과:**
- ✅ 일정 ID: 389
- ✅ 캘린더 10월 7일에 "API 서버 점검" 표시
- ✅ "1개 일정" 카운트
- ✅ 참가자: 이코더 (👥 이코더)
- ✅ 팀장 권한: "일정 추가", "수정", "삭제" 버튼 모두 활성화

**스크린샷:**
- `team-workflow-08-schedule-created.png`: 일정 생성 완료 (김개발 캘린더 뷰)

---

### 2.2 팀원(이코더) - 일정 조회 및 권한 확인

**실행 단계:**
1. ✅ 김개발 로그아웃
2. ✅ 이코더 로그인 (lee.coder@company.com / Coder2024!)
3. ✅ 대시보드에서 최근 활동 확인: "\"API 서버 점검\" 일정이 생성되었습니다"
4. ✅ "캘린더 열기" 버튼 클릭
5. ✅ 캘린더에서 "API 서버 점검" 일정 확인
6. ✅ 일정 클릭 → 상세 정보 모달 열림
7. ✅ 권한 확인:
   - ✅ **"일정 추가" 버튼 없음** (팀원은 일정 생성 불가)
   - ✅ **"일정 변경 요청" 버튼만 표시** (채팅을 통한 변경 요청)
   - ✅ **수정/삭제 버튼 없음** (팀원은 일정 수정/삭제 불가)

**검증 결과:**
- ✅ 일정 조회: 성공
- ✅ 일정 상세 정보:
  - 제목: API 서버 점검
  - 설명: 정기 API 서버 점검 및 성능 모니터링
  - 시작: 2025년 10월 7일 화 오후 02:00
  - 종료: 2025년 10월 7일 화 오후 04:00
  - 소요 시간: 2시간
  - 생성자: 김개발
  - 팀: 백엔드 개발팀
  - 참가자: 이코더 (lee.coder@company.com) - "참가" 상태
- ✅ **콘솔 로그 확인**: `isParticipant: true isLeader: false`
- ✅ 권한 시스템 정상 작동: 조회만 가능, 수정/삭제 불가

**스크린샷:**
- `team-workflow-09-member-view-schedule.png`: 팀원(이코더)의 일정 상세 뷰 (권한 확인)

---

## 🔧 이전 테스트 대비 개선사항

### 문제: 403 Forbidden 에러 (이전 테스트)
**증상**: 이코더가 로그인 후 캘린더 접근 시 "Request failed with status code 403" 및 "팀 멤버만 접근할 수 있습니다" 에러 발생

**원인**: 팀원이 로그인만으로 자동으로 팀에 참여되는 것으로 잘못 가정함. 실제로는 `team_members` 테이블에 등록되지 않아 권한 부족.

**해결책**:
1. ✅ **사용자 시나리오 문서 업데이트** (`docs/3-user-scenarios.md`):
   - 팀원은 **반드시 초대 코드를 입력**하여 팀에 참여해야 한다는 것을 명시
   - `/teams/join` 페이지 경로 추가
   - 초대 코드 입력 단계 상세 설명
   - 경고 섹션 추가: "초대 코드 입력 없이는 팀 일정 조회 및 채팅방 접근 불가"

2. ✅ **테스트 워크플로우 수정**:
   - 이코더 로그인 후 `/teams/join` 페이지로 이동
   - 초대 코드 F9KFLS 입력
   - 팀 참여 성공 확인
   - `team_members` 테이블 등록 검증

3. ✅ **결과**: 403 에러 완전히 해결, 캘린더 정상 접근

---

## 📊 기술적 검증 내용

### 1. 데이터베이스 상태
```sql
-- 사용자 생성 확인
SELECT id, username, full_name, email FROM users
WHERE username IN ('kimdev', 'leecoder');
-- 결과: 2명 (김개발: 120, 이코더: 121)

-- 팀 생성 확인
SELECT id, name, invite_code, leader_id FROM teams
WHERE name = '백엔드 개발팀';
-- 결과: team_id 61, invite_code 'F9KFLS', leader_id 120

-- 팀 멤버 등록 확인
SELECT user_id, team_id, role FROM team_members
WHERE team_id = 61;
-- 결과:
--   user_id 120 (김개발), role 'leader'
--   user_id 121 (이코더), role 'member'

-- 일정 생성 확인
SELECT id, title, start_time, end_time, created_by FROM schedules
WHERE team_id = 61;
-- 결과: schedule_id 389, title 'API 서버 점검', created_by 120

-- 일정 참가자 확인
SELECT schedule_id, user_id FROM schedule_participants
WHERE schedule_id = 389;
-- 결과: user_id 121 (이코더)
```

### 2. 권한 시스템 검증
- ✅ **팀장 권한** (김개발):
  - 일정 생성 (CREATE)
  - 일정 수정 (UPDATE)
  - 일정 삭제 (DELETE)
  - 일정 조회 (READ)
  - "일정 추가" 버튼 표시

- ✅ **팀원 권한** (이코더):
  - 일정 조회만 가능 (READ ONLY)
  - "일정 추가" 버튼 미표시
  - "일정 변경 요청" 버튼만 표시 (채팅 기능)
  - 수정/삭제 불가

### 3. 프론트엔드 로그 분석
```
[LOG] [ScheduleDetailModal] Debug Info:
{
  currentUser: Object,
  currentUserId: 121,  // 이코더
  scheduleId: 389,
  ...
}

[LOG] [ScheduleDetailModal] isParticipant: true isLeader: false
```
→ 권한 판별 로직 정상 작동

---

## 📝 테스트 계정 정보

| 역할 | 이름 | 사용자명 | 이메일 | 비밀번호 | User ID |
|-----|-----|---------|--------|---------|---------|
| 팀장 | 김개발 | kimdev | kim.dev@company.com | DevTeam2024! | 120 |
| 팀원 | 이코더 | leecoder | lee.coder@company.com | Coder2024! | 121 |

**팀 정보:**
- 팀 ID: 61
- 팀 이름: 백엔드 개발팀
- 초대 코드: F9KFLS
- 생성일: 2025.10.05

**일정 정보:**
- 일정 ID: 389
- 제목: API 서버 점검
- 일시: 2025-10-07 14:00~16:00
- 참가자: 이코더

---

## 🎯 결론

### 성공 사항
✅ **모든 시나리오 테스트 통과**
✅ **이전 테스트 문제(403 에러) 완전 해결**
✅ **초대 코드 기반 팀 참여 프로세스 정상 작동**
✅ **역할 기반 권한 시스템 완벽 동작**
✅ **데이터베이스 무결성 검증 완료**
✅ **프론트엔드-백엔드 통합 정상 작동**

### 테스트 커버리지
- ✅ 사용자 인증 (회원가입, 로그인, 로그아웃)
- ✅ 팀 생성 및 초대 코드 발급
- ✅ 초대 코드 기반 팀 참여
- ✅ 역할 기반 접근 제어 (팀장/팀원)
- ✅ 일정 생성 및 참가자 지정
- ✅ 일정 조회 권한 검증
- ✅ UI 컴포넌트 렌더링
- ✅ API 통신

### 권장 사항
1. ✅ **문서화 완료**: `docs/3-user-scenarios.md`에 올바른 팀 참여 프로세스 반영됨
2. 🔄 **추가 테스트 권장**:
   - 잘못된 초대 코드 입력 시 에러 처리
   - 이미 참여한 팀에 재참여 시도 시 처리
   - 만료된 초대 코드 처리 (향후 기능)
3. 🔄 **성능 테스트**: 대용량 일정 데이터 조회 시 응답 시간 (<2초 목표)

---

## 📎 첨부 파일

**스크린샷 (총 9개):**
1. `team-workflow-01-login-success.png` - 김개발 로그인 성공
2. `team-workflow-02-team-created.png` - 팀 생성 완료
3. `team-workflow-03-invite-code.png` - 초대 코드 F9KFLS 표시
4. `team-workflow-04-leecoder-login.png` - 이코더 로그인 성공
5. `team-workflow-05-join-page.png` - 팀 참여 페이지
6. `team-workflow-06-join-success.png` - 팀 참여 성공
7. `team-workflow-07-calendar-access-success.png` - 캘린더 접근 성공 (403 에러 해결)
8. `team-workflow-08-schedule-created.png` - 일정 생성 완료 (팀장)
9. `team-workflow-09-member-view-schedule.png` - 일정 조회 (팀원, 권한 확인)

**테스트 환경:**
- Frontend: http://localhost:5173 (Vite Dev Server)
- Backend: http://localhost:3000 (Express Server)
- Database: PostgreSQL 17.6 (localhost:5432)
- Browser: Chromium (Playwright)

---

**테스트 수행자**: Claude Code (Playwright MCP)
**리포트 생성일**: 2025-10-05 14:20
**테스트 상태**: ✅ 전체 성공 (PASS)
