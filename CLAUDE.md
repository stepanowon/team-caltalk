# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 오버엔지니어링 절대 금지

## 프로젝트 개요

Team CalTalk은 5일 MVP 개발 목표를 가진 팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼입니다. 3,000개 팀(30,000명 사용자)을 목표로 하며 React 18 + TypeScript + Node.js + Express + PostgreSQL 기술 스택을 사용합니다.

## 데이터베이스

### 연결 정보
- 데이터베이스: `team_caltalk`
- 사용자: `team_caltalk_user` / 비밀번호: `team_caltalk_2024!`
- 연결 문자열: `postgresql://team_caltalk_user:team_caltalk_2024!@localhost:5432/team_caltalk`

### 스키마 관리
- 완전한 스키마: `database/schema.sql`
- 6개 핵심 테이블: users, teams, team_members, schedules, schedule_participants, messages
- 21개 성능 인덱스 (일정 충돌 감지용 GIST 인덱스 포함)
- 3개 유틸리티 함수: `update_updated_at_column()`, `check_schedule_conflict()`, `generate_invite_code()`

### 테스트 데이터
- 사용자 100명, 팀 50개, 팀원 431명
- 일정 372개, 참가자 1,600명, 메시지 5,577개

## 아키텍처

### 핵심 비즈니스 로직
- **역할 기반 권한**: 팀장은 팀 일정 CRUD 가능, 팀원은 조회만 가능하며 변경 요청은 채팅을 통해서만
- **일정 충돌 감지**: PostgreSQL range 타입과 btree_gist 확장 사용
- **실시간 메시징**: 날짜별 채팅 분리, Long Polling 구현 목표
- **일정-채팅 연동**: 일정 변경 요청이 채팅 이력에 추적됨

### 주요 제약 조건
- 응답 시간: 일정 조회 <2초, 메시지 <1초
- 일정 기간: 최대 7일
- 메시지 길이: 최대 500자
- 사용자 이름: 2-30자

## 개발 명령어

### 데이터베이스 작업
```bash
# 데이터베이스 연결 (psql 사용 가능한 경우)
psql postgresql://team_caltalk_user:team_caltalk_2024!@localhost:5432/team_caltalk

# 스키마 적용
psql -f database/schema.sql postgresql://postgres:asdf!2345@localhost:5432/team_caltalk
```

### Mock API 서버
```bash
cd mockup
npm install
npm start  # Swagger 기반 Mock 서버 시작
```

### GitHub Issues 자동 생성
```bash
# Windows 사용자 (추천)
scripts\quick-setup.bat          # 빠른 설정 (모든 확인 포함)
scripts\create-github-issues.bat # 직접 실행

# Linux/Mac 사용자
chmod +x scripts/create-github-issues.sh
./scripts/create-github-issues.sh
```

## 개발 진행 상황

현재 상태: **프론트엔드 다크모드 구현 완료** (2025-10-25 기준)

### ✅ 1단계 완료 (데이터베이스 구성)
- ✅ PostgreSQL 17.6 설치 및 최적화
- ✅ 스키마 적용 (모든 테이블, 인덱스, 함수)
- ✅ 성능 튜닝 (shared_buffers=512MB, max_connections=300)
- ✅ 테스트 데이터 생성

### ✅ GitHub Issues 관리 체계 구축
- ✅ **16개 라벨 시스템**: 영역별, 우선순위별, 단계별, 기술스택별 분류
- ✅ **4개 마일스톤**: Day 2~5 일정별 관리
- ✅ **9개 핵심 Issues**: 실행 계획서 기반 체계적 작업 분해
- ✅ **자동화 스크립트**: Windows/Linux 환경 지원

### ✅ 프론트엔드 다크모드 구현
- ✅ **테마 상태 관리**: Zustand 기반 theme-store
- ✅ **테마 토글 UI**: ThemeToggle 컴포넌트 (헤더 우측)
- ✅ **시스템 테마 감지**: prefers-color-scheme 자동 적용
- ✅ **설정 유지**: localStorage 기반 테마 설정 저장
- ✅ **전체 페이지 적용**: 모든 페이지 및 컴포넌트 다크모드 지원
  - 페이지: Home, Login, Register, Dashboard, Teams, Calendar, CreateTeam, JoinTeam
  - UI 컴포넌트: Dialog, Input, Textarea, Card, Button 등
  - 캘린더: BigCalendar, ScheduleModal, ScheduleRequestMessage
- ✅ **CSS 변수 시스템**: index.css에 다크모드 색상 변수 정의
- ✅ **브라우저 네이티브 지원**: date/time picker 다크모드 지원

### 🔄 다음 단계: 2단계 (백엔드 기반 구조 및 인증 시스템)
- 📋 GitHub Issues에서 진행 상황 추적: https://github.com/stepanowon/team-caltalk/issues
- 🎯 마일스톤별 목표: https://github.com/stepanowon/team-caltalk/milestones
- 📊 상세 로드맵: `docs/7-execution-plan.md` 참조

## 중요 파일

### 📋 기획 및 설계 문서
- `docs/7-execution-plan.md`: 5일 개발 로드맵 및 작업 분해
- `docs/2-PRD.md`: 제품 요구사항 정의서
- `docs/1-domain-definition.md`: 비즈니스 규칙 및 엔티티 정의

### 🗄️ 데이터베이스
- `database/schema.sql`: 주석이 포함된 완전한 PostgreSQL 스키마
- `.env`: 데이터베이스 연결 설정

### 🎨 프론트엔드 핵심 파일
- `frontend/src/stores/theme-store.ts`: Zustand 기반 테마 상태 관리
- `frontend/src/components/Layout/ThemeToggle.tsx`: 다크모드 토글 버튼
- `frontend/src/index.css`: 다크모드 CSS 변수 시스템

### 🔧 개발 도구 및 스크립트
- `scripts/create-github-issues.bat`: Windows용 GitHub Issues 자동 생성
- `scripts/create-github-issues.sh`: Linux/Mac용 GitHub Issues 자동 생성
- `scripts/quick-setup.bat`: Windows용 빠른 설정 스크립트
- `scripts/README.md`: 스크립트 사용 가이드

### 📄 API 명세
- `swagger/swagger.json`: API 명세

## 프로젝트 관리

### GitHub 링크
- **저장소**: https://github.com/stepanowon/team-caltalk
- **Issues**: https://github.com/stepanowon/team-caltalk/issues
- **마일스톤**: https://github.com/stepanowon/team-caltalk/milestones
- **프로젝트 보드**: GitHub Projects 활용 권장

### 개발 워크플로우
1. GitHub Issues에서 작업 선택
2. 새 브랜치 생성 (`feature/issue-번호`)
3. 개발 완료 후 PR 생성
4. 코드 리뷰 후 main 브랜치에 머지
5. Issue 완료 처리