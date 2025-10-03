# E2E 테스트 확장 계획

**작성일**: 2025-10-03
**현재 커버리지**: 기본 UI 및 인증 시나리오
**목표 커버리지**: 전체 P1 핵심 기능

---

## 🎯 다음 단계 테스트 시나리오

### 1. 팀 생성 및 관리 시나리오

**우선순위**: 높음
**예상 소요 시간**: 2-3시간

#### 테스트 케이스

```typescript
test('팀 생성 워크플로우', async ({ page }) => {
  // 1. 로그인
  await login(page, TEST_USER);

  // 2. 팀 생성 페이지 이동
  await page.click('text=팀 생성');

  // 3. 팀 정보 입력
  await page.fill('input[name="teamName"]', '테스트팀');
  await page.fill('textarea[name="description"]', '테스트 팀 설명');

  // 4. 팀 생성 제출
  await page.click('button[type="submit"]');

  // 5. 초대 코드 생성 확인
  const inviteCode = await page.textContent('.invite-code');
  expect(inviteCode).toMatch(/^[A-Z0-9]{8}$/);

  // 6. 스크린샷 캡처
  await page.screenshot({ path: 'team-creation-success.png' });
});

test('팀 참여 워크플로우', async ({ page }) => {
  // 1. 초대 코드로 팀 참여
  await page.goto('/join');
  await page.fill('input[name="inviteCode"]', INVITE_CODE);
  await page.click('button[type="submit"]');

  // 2. 팀 대시보드 접근 확인
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('.team-name')).toContainText('테스트팀');
});
```

**검증 항목**:
- ✅ 팀 생성 폼 정상 작동
- ✅ 초대 코드 생성 및 형식 검증
- ✅ 팀장 권한 자동 부여
- ✅ 팀 참여 프로세스 정상 작동
- ✅ 팀원 권한 자동 부여

---

### 2. 일정 관리 시나리오

**우선순위**: 높음
**예상 소요 시간**: 3-4시간

#### 2.1 개인 일정 CRUD

```typescript
test('개인 일정 생성', async ({ page }) => {
  await login(page, TEST_USER);

  // 캘린더에서 날짜 클릭
  await page.click('.calendar-cell[data-date="2025-10-10"]');

  // 일정 생성 모달 열림
  await expect(page.locator('.schedule-modal')).toBeVisible();

  // 일정 정보 입력
  await page.fill('input[name="title"]', '개인 미팅');
  await page.fill('input[name="startTime"]', '14:00');
  await page.fill('input[name="endTime"]', '15:00');
  await page.check('input[value="personal"]');

  // 일정 저장
  await page.click('button:has-text("저장")');

  // 캘린더에 일정 표시 확인
  await expect(page.locator('.calendar-event:has-text("개인 미팅")')).toBeVisible();
});

test('개인 일정 수정', async ({ page }) => {
  // 기존 일정 클릭
  await page.click('.calendar-event:has-text("개인 미팅")');

  // 수정 버튼 클릭
  await page.click('button:has-text("수정")');

  // 제목 변경
  await page.fill('input[name="title"]', '개인 미팅 (수정됨)');
  await page.click('button:has-text("저장")');

  // 변경 확인
  await expect(page.locator('.calendar-event')).toContainText('수정됨');
});

test('개인 일정 삭제', async ({ page }) => {
  await page.click('.calendar-event:has-text("개인 미팅")');
  await page.click('button:has-text("삭제")');

  // 확인 대화상자
  await page.click('button:has-text("확인")');

  // 삭제 확인
  await expect(page.locator('.calendar-event:has-text("개인 미팅")')).not.toBeVisible();
});
```

#### 2.2 팀 일정 관리 (팀장 전용)

```typescript
test('팀 일정 생성 및 충돌 감지', async ({ page }) => {
  await loginAsLeader(page);

  // 팀 일정 생성
  await page.click('.calendar-cell[data-date="2025-10-10"]');
  await page.fill('input[name="title"]', '팀 미팅');
  await page.check('input[value="team"]');

  // 참가자 선택
  await page.check('input[name="participant-1"]');
  await page.check('input[name="participant-2"]');

  // 시간 입력
  await page.fill('input[name="startTime"]', '14:00');
  await page.fill('input[name="endTime"]', '16:00');

  // 충돌 감지 확인
  const conflictWarning = page.locator('.conflict-warning');
  if (await conflictWarning.isVisible()) {
    console.log('충돌 감지됨:', await conflictWarning.textContent());

    // 충돌 세부 정보 확인
    await expect(conflictWarning).toContainText('개인 미팅');

    // 스크린샷 캡처
    await page.screenshot({ path: 'schedule-conflict-detected.png' });
  }
});
```

**검증 항목**:
- ✅ 개인 일정 CRUD 정상 작동
- ✅ 팀 일정 생성 (팀장 권한)
- ✅ 참가자 선택 기능
- ✅ 일정 충돌 감지 알고리즘
- ✅ 충돌 경고 메시지 표시
- ✅ 캘린더 UI 업데이트

---

### 3. 실시간 채팅 시나리오

**우선순위**: 높음
**예상 소요 시간**: 2-3시간

#### 3.1 채팅 기본 기능

```typescript
test('채팅 메시지 전송 및 수신', async ({ browser }) => {
  // 2개 브라우저 컨텍스트 생성 (팀장, 팀원)
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // 팀장 로그인
  await loginAsLeader(page1);
  await page1.click('text=팀 채팅');

  // 팀원 로그인
  await loginAsMember(page2);
  await page2.click('text=팀 채팅');

  // 팀장이 메시지 전송
  const message = '안녕하세요, 팀 미팅 시간을 조정하고 싶습니다.';
  await page1.fill('.message-input', message);
  await page1.click('button:has-text("전송")');

  // 팀원 화면에서 메시지 수신 확인 (30초 폴링)
  await page2.waitForSelector(`.message:has-text("${message}")`, { timeout: 35000 });

  // 메시지 표시 확인
  const receivedMessage = await page2.locator('.message').last().textContent();
  expect(receivedMessage).toContain(message);

  // 스크린샷 캡처
  await page1.screenshot({ path: 'chat-sender-view.png' });
  await page2.screenshot({ path: 'chat-receiver-view.png' });
});
```

#### 3.2 날짜별 채팅 기능

```typescript
test('날짜별 채팅 필터링', async ({ page }) => {
  await login(page);
  await page.click('text=팀 채팅');

  // 특정 날짜 선택
  await page.click('.calendar-cell[data-date="2025-10-10"]');

  // 해당 날짜 채팅만 표시 확인
  const messages = await page.locator('.message[data-date="2025-10-10"]').count();
  console.log(`2025-10-10 메시지 수: ${messages}`);

  // 다른 날짜 메시지는 숨겨짐
  const otherMessages = await page.locator('.message:not([data-date="2025-10-10"])').count();
  expect(otherMessages).toBe(0);
});
```

#### 3.3 일정 변경 요청 워크플로우

```typescript
test('일정 변경 요청 및 승인', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const leaderPage = await context1.newPage();
  const memberPage = await context2.newPage();

  await loginAsLeader(leaderPage);
  await loginAsMember(memberPage);

  // 팀원: 일정 변경 요청
  await memberPage.click('.team-schedule');
  await memberPage.click('button:has-text("변경 요청")');
  await memberPage.fill('.change-request-message', '개인 일정과 겹쳐서 시간 조정 부탁드립니다.');
  await memberPage.click('button:has-text("요청 보내기")');

  // 팀장: 알림 수신 확인
  await leaderPage.waitForSelector('.notification-badge', { timeout: 35000 });
  await leaderPage.click('.notification-badge');

  // 팀장: 변경 요청 확인
  await expect(leaderPage.locator('.change-request')).toContainText('개인 일정과 겹쳐서');

  // 팀장: 요청 승인
  await leaderPage.click('button:has-text("승인")');

  // 승인 후 일정 수정 모달 표시
  await expect(leaderPage.locator('.schedule-modal')).toBeVisible();

  // 스크린샷
  await leaderPage.screenshot({ path: 'change-request-approval.png' });
});
```

**검증 항목**:
- ✅ 메시지 전송 기능
- ✅ Long Polling 메시지 수신 (< 1초)
- ✅ 날짜별 채팅 필터링
- ✅ 일정 변경 요청 워크플로우
- ✅ 알림 시스템
- ✅ 채팅 히스토리 보존

---

### 4. 권한 관리 시나리오

**우선순위**: 중간
**예상 소요 시간**: 1-2시간

```typescript
test('팀원 권한 제한 확인', async ({ page }) => {
  await loginAsMember(page);

  // 팀 일정 클릭
  await page.click('.team-schedule');

  // 팀원은 수정/삭제 버튼이 보이지 않음
  await expect(page.locator('button:has-text("수정")')).not.toBeVisible();
  await expect(page.locator('button:has-text("삭제")')).not.toBeVisible();

  // 변경 요청 버튼은 표시됨
  await expect(page.locator('button:has-text("변경 요청")')).toBeVisible();
});

test('팀장 권한 확인', async ({ page }) => {
  await loginAsLeader(page);

  // 팀 일정 클릭
  await page.click('.team-schedule');

  // 팀장은 모든 버튼 표시
  await expect(page.locator('button:has-text("수정")')).toBeVisible();
  await expect(page.locator('button:has-text("삭제")')).toBeVisible();

  // 팀원 관리 메뉴 접근 가능
  await page.click('text=팀 관리');
  await expect(page.locator('.team-members')).toBeVisible();
});
```

**검증 항목**:
- ✅ 역할 기반 접근 제어 (RBAC)
- ✅ 팀장 권한: 모든 일정 CRUD
- ✅ 팀원 권한: 개인 일정 CRUD, 팀 일정 R
- ✅ UI 요소 권한별 표시/숨김

---

### 5. 통합 시나리오

**우선순위**: 중간
**예상 소요 시간**: 2-3시간

```typescript
test('전체 워크플로우 통합 테스트', async ({ browser }) => {
  // 1. 팀장 계정 생성 및 팀 생성
  const leaderContext = await browser.newContext();
  const leaderPage = await leaderContext.newPage();

  await signup(leaderPage, LEADER_USER);
  const inviteCode = await createTeam(leaderPage, '통합테스트팀');

  // 2. 팀원 계정 생성 및 팀 참여
  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();

  await signup(memberPage, MEMBER_USER);
  await joinTeam(memberPage, inviteCode);

  // 3. 팀장: 팀 일정 생성
  await leaderPage.click('.calendar-cell[data-date="2025-10-15"]');
  await createTeamSchedule(leaderPage, {
    title: '스프린트 계획 미팅',
    startTime: '10:00',
    endTime: '12:00'
  });

  // 4. 팀원: 개인 일정 생성 (충돌 발생)
  await memberPage.click('.calendar-cell[data-date="2025-10-15"]');
  await createPersonalSchedule(memberPage, {
    title: '고객사 미팅',
    startTime: '11:00',
    endTime: '13:00'
  });

  // 5. 팀원: 충돌 감지 및 변경 요청
  await memberPage.click('text=충돌 해결');
  await memberPage.click('text=팀 일정 변경 요청');
  await sendChangeRequest(memberPage, '고객사 미팅과 겹칩니다. 시간 조정 부탁드립니다.');

  // 6. 팀장: 채팅에서 변경 요청 확인
  await leaderPage.waitForSelector('.notification-badge');
  await leaderPage.click('text=팀 채팅');
  await expect(leaderPage.locator('.change-request-message')).toBeVisible();

  // 7. 팀장: 일정 시간 변경
  await leaderPage.click('button:has-text("승인")');
  await updateScheduleTime(leaderPage, '14:00', '16:00');

  // 8. 팀원: 변경된 일정 확인
  await memberPage.reload();
  const schedule = await memberPage.locator('.team-schedule:has-text("스프린트 계획 미팅")');
  await expect(schedule).toContainText('14:00');

  // 9. 전체 스크린샷 캡처
  await leaderPage.screenshot({ path: 'integration-test-leader-final.png' });
  await memberPage.screenshot({ path: 'integration-test-member-final.png' });
});
```

**검증 항목**:
- ✅ 전체 사용자 여정 정상 작동
- ✅ 팀장-팀원 간 상호작용
- ✅ 일정 충돌 감지 및 해결 프로세스
- ✅ 실시간 데이터 동기화
- ✅ 채팅 기반 협의 프로세스

---

## 📊 성능 및 부하 테스트

### 6. 성능 테스트 시나리오

**우선순위**: 중간
**예상 소요 시간**: 1-2시간

```typescript
test('대량 일정 조회 성능', async ({ page }) => {
  await login(page);

  // 100개 일정이 있는 월 로드
  const startTime = Date.now();
  await page.goto('/calendar?month=2025-10');
  await page.waitForSelector('.calendar-event', { timeout: 10000 });
  const loadTime = Date.now() - startTime;

  console.log(`100개 일정 로드 시간: ${loadTime}ms`);
  expect(loadTime).toBeLessThan(2000); // PRD 요구사항: < 2초
});

test('채팅 메시지 전송 응답 시간', async ({ page }) => {
  await login(page);
  await page.click('text=팀 채팅');

  const startTime = Date.now();
  await page.fill('.message-input', '성능 테스트 메시지');
  await page.click('button:has-text("전송")');
  await page.waitForSelector('.message:last-child:has-text("성능 테스트 메시지")');
  const responseTime = Date.now() - startTime;

  console.log(`메시지 전송 응답 시간: ${responseTime}ms`);
  expect(responseTime).toBeLessThan(1000); // PRD 요구사항: < 1초
});
```

### 7. 동시성 테스트

```typescript
test('동시 사용자 테스트', async ({ browser }) => {
  const contexts = [];
  const pages = [];

  // 10명의 동시 사용자 시뮬레이션
  for (let i = 0; i < 10; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    contexts.push(context);
    pages.push(page);

    await login(page, { email: `user${i}@test.com`, password: 'password' });
  }

  // 모든 사용자가 동시에 일정 생성
  await Promise.all(
    pages.map((page, i) =>
      createSchedule(page, { title: `일정 ${i}` })
    )
  );

  // 모든 일정이 정상 생성되었는지 확인
  for (const page of pages) {
    const scheduleCount = await page.locator('.calendar-event').count();
    expect(scheduleCount).toBeGreaterThanOrEqual(1);
  }
});
```

---

## 🔧 테스트 유틸리티 함수

**파일**: `tests/e2e/utils/helpers.ts`

```typescript
export async function login(page: Page, user: User) {
  await page.goto('/login');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function signup(page: Page, user: User) {
  await page.goto('/register');
  await page.fill('input[name="username"]', user.username);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
}

export async function createTeam(page: Page, teamName: string): Promise<string> {
  await page.click('text=팀 생성');
  await page.fill('input[name="teamName"]', teamName);
  await page.click('button[type="submit"]');

  const inviteCode = await page.locator('.invite-code').textContent();
  return inviteCode || '';
}

export async function joinTeam(page: Page, inviteCode: string) {
  await page.goto('/join');
  await page.fill('input[name="inviteCode"]', inviteCode);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

export async function createSchedule(page: Page, schedule: Schedule) {
  await page.click('.calendar-cell[data-date]');
  await page.fill('input[name="title"]', schedule.title);
  await page.fill('input[name="startTime"]', schedule.startTime);
  await page.fill('input[name="endTime"]', schedule.endTime);
  await page.click('button:has-text("저장")');
}

export async function sendMessage(page: Page, message: string) {
  await page.fill('.message-input', message);
  await page.click('button:has-text("전송")');
}
```

---

## 📋 테스트 체크리스트

### 기능 테스트
- [x] 사용자 인증 (회원가입/로그인)
- [x] 반응형 레이아웃
- [x] 네비게이션
- [x] 백엔드 API 헬스체크
- [ ] 팀 생성 및 참여
- [ ] 개인 일정 CRUD
- [ ] 팀 일정 CRUD
- [ ] 일정 충돌 감지
- [ ] 실시간 채팅
- [ ] 날짜별 채팅
- [ ] 일정 변경 요청
- [ ] 권한 관리

### 비기능 테스트
- [x] 페이지 로드 성능
- [ ] API 응답 시간
- [ ] 동시성 처리
- [ ] 크로스 브라우저 (Firefox, Safari)
- [ ] 접근성 (ARIA, 키보드 네비게이션)
- [ ] 모바일 터치 제스처

### 통합 테스트
- [ ] 전체 사용자 여정
- [ ] 팀장-팀원 상호작용
- [ ] 데이터 동기화

---

## 🚀 실행 우선순위

### Phase 1 (즉시 - 1주 이내)
1. ✅ 기본 UI 검증 (완료)
2. ✅ 사용자 인증 (완료)
3. 팀 생성 및 참여
4. 개인 일정 CRUD

### Phase 2 (2주차)
5. 팀 일정 CRUD
6. 일정 충돌 감지
7. 권한 관리

### Phase 3 (3주차)
8. 실시간 채팅
9. 일정 변경 요청
10. 통합 시나리오

### Phase 4 (4주차)
11. 성능 테스트
12. 부하 테스트
13. 크로스 브라우저 테스트

---

**작성자**: Quality Engineer Agent
**작성일**: 2025-10-03
