# 네이버 캘린더 스타일 가이드

Team CalTalk 프론트엔드 앱에 적용된 네이버 캘린더 스타일 시스템 가이드입니다.

## 📦 적용된 변경사항

### 1. Tailwind Config (`tailwind.config.js`)

네이버 캘린더 색상 팔레트와 커스텀 설정이 추가되었습니다.

#### 색상 시스템
```js
naver: {
  green: '#10b981',    // 로고, 오늘 날짜
  blue: '#3b82f6',     // 토요일, 강조 버튼
  red: '#ef4444',      // 일요일, 공휴일
  purple: '#7c3aed',   // 특별 일정
  gray: {...}          // 배경, 테두리
}
```

#### 커스텀 폰트 크기
```js
'calendar-date': '14px',
'calendar-schedule': '12px',
'sidebar-menu': '14px',
'header-brand': '18px'
```

#### 커스텀 간격
```js
'sidebar': '256px',
'header': '64px',
'calendar-cell': '120px'
```

### 2. 전역 CSS (`src/index.css`)

#### CSS 변수
```css
--naver-green: 16 185 129;
--naver-blue: 59 130 246;
--naver-red: 239 68 68;
--primary: var(--naver-green);
--accent: var(--naver-blue);
```

#### 컴포넌트 클래스
- `.naver-header`: 헤더 스타일
- `.naver-logo`: 로고 스타일
- `.naver-sidebar`: 사이드바 스타일
- `.naver-create-button`: 생성 버튼
- `.naver-calendar-cell`: 캘린더 셀
- `.naver-today-badge`: 오늘 날짜 배지
- `.naver-schedule-red/purple/blue`: 일정 배지
- `.naver-icon-button`: 아이콘 버튼
- `.naver-menu-item`: 메뉴 아이템

### 3. 스타일 유틸리티 (`src/styles/naver-calendar.ts`)

재사용 가능한 스타일 객체와 헬퍼 함수 제공:

```typescript
import { naverStyles, getScheduleStyle } from '@/styles/naver-calendar';

// 사용 예시
<header className={naverStyles.header.container}>
<div className={getScheduleStyle('red')}>일정</div>
```

## 🎨 사용 방법

### 방법 1: Tailwind 클래스 직접 사용

```tsx
<div className="bg-naver-green text-white">
  <span className="text-naver-blue">토요일</span>
  <span className="text-naver-red">일요일</span>
</div>
```

### 방법 2: CSS 컴포넌트 클래스 사용

```tsx
<header className="naver-header">
  <div className="naver-logo">N</div>
</header>

<button className="naver-create-button">
  일정 쓰기
</button>
```

### 방법 3: 스타일 유틸리티 객체 사용

```tsx
import { naverStyles } from '@/styles/naver-calendar';

<div className={naverStyles.header.container}>
  <div className={naverStyles.header.logo}>N</div>
</div>
```

### 방법 4: 헬퍼 함수 사용

```tsx
import { getScheduleStyle, getDateStyle } from '@/styles/naver-calendar';

// 일정 색상
<div className={getScheduleStyle(schedule.color)}>
  {schedule.title}
</div>

// 날짜 스타일
<div className={getDateStyle(dayOfWeek, isCurrentMonth, isToday)}>
  {date}
</div>
```

## 🎯 컴포넌트별 적용 가이드

### 헤더 컴포넌트
```tsx
<header className="naver-header">
  <div className="flex items-center gap-3">
    <div className="naver-logo">N</div>
    <span className="text-header-brand">캘린더</span>
  </div>
</header>
```

### 사이드바 컴포넌트
```tsx
<aside className="naver-sidebar">
  <button className="naver-create-button">
    <Plus className="w-5 h-5" />
    <span>일정 쓰기</span>
  </button>
</aside>
```

### 캘린더 그리드
```tsx
<div className="naver-calendar-cell">
  {isToday ? (
    <div className="naver-today-badge">{date}</div>
  ) : (
    <div className={getDateStyle(dayOfWeek, isCurrentMonth, isToday)}>
      {date}
    </div>
  )}
</div>
```

### 일정 배지
```tsx
<div className="naver-schedule-red">공휴일</div>
<div className="naver-schedule-purple">생일</div>
<div className="naver-schedule-blue">회의</div>
```

## 🔄 기존 코드 마이그레이션

### Before (기존)
```tsx
<div className="bg-blue-500 text-white p-4">
  <h1 className="text-2xl font-bold">Title</h1>
</div>
```

### After (네이버 스타일)
```tsx
<div className="bg-naver-blue text-white p-4">
  <h1 className="text-2xl font-bold text-naver-green">Title</h1>
</div>
```

## 📊 색상 매핑 테이블

| 기존 Tailwind | 네이버 스타일 | 용도 |
|--------------|--------------|------|
| `blue-500` | `naver-blue` | 강조, 토요일 |
| `green-500` | `naver-green` | 로고, 오늘 |
| `red-500` | `naver-red` | 일요일, 공휴일 |
| `purple-500` | `naver-purple` | 특별 일정 |
| `gray-100` | `naver-gray-100` | 배경 |
| `gray-200` | `naver-gray-200` | 테두리 |

## 🚀 다음 단계

1. **컴포넌트 업데이트**: 기존 컴포넌트에 네이버 스타일 적용
2. **일관성 검증**: 모든 페이지에서 스타일 통일성 확인
3. **반응형 테스트**: 다양한 화면 크기에서 동작 확인
4. **다크모드**: 필요시 다크모드 변수 추가

## 📝 참고 문서

- `docs/screen-design.jsx`: Tailwind 기반 참고 디자인
- `docs/screen-design2.jsx`: 인라인 스타일 참고 디자인
- `tailwind.config.js`: 커스텀 테마 설정
- `src/index.css`: 전역 스타일 및 컴포넌트 클래스
- `src/styles/naver-calendar.ts`: 스타일 유틸리티 및 헬퍼
