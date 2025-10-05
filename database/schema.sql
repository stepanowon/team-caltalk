-- Team CalTalk Database Schema
-- PostgreSQL DDL for team-based schedule management and real-time chat

-- Extension for Range Types (for schedule conflict detection)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- 1. users (사용자)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(name) BETWEEN 2 AND 30),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. teams (팀)
CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL CHECK (LENGTH(name) BETWEEN 2 AND 30),
    description TEXT,
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. team_members (팀 멤버)
CREATE TABLE team_members (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- 4. schedules (일정)
CREATE TABLE schedules (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL CHECK (LENGTH(title) BETWEEN 2 AND 100),
    content TEXT CHECK (LENGTH(content) <= 1000),
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('personal', 'team')),
    creator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 제약 조건
    CHECK (end_datetime > start_datetime),
    CHECK (end_datetime <= start_datetime + INTERVAL '7 days'),
    CHECK ((schedule_type = 'team' AND team_id IS NOT NULL) OR
           (schedule_type = 'personal' AND team_id IS NULL))
);

-- 5. schedule_participants (일정 참가자)
CREATE TABLE schedule_participants (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participation_status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
        CHECK (participation_status IN ('confirmed', 'pending', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, user_id)
);

-- 6. messages (메시지)
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(content) <= 500),
    target_date DATE NOT NULL,
    related_schedule_id BIGINT REFERENCES schedules(id) ON DELETE SET NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'normal'
        CHECK (message_type IN ('normal', 'schedule_request', 'schedule_approved', 'schedule_rejected')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- users 테이블 인덱스
CREATE INDEX idx_users_email ON users(email);

-- teams 테이블 인덱스
CREATE INDEX idx_teams_invite_code ON teams(invite_code);
CREATE INDEX idx_teams_creator_id ON teams(creator_id);

-- team_members 테이블 인덱스
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(team_id, role);

-- schedules 테이블 인덱스 (충돌 감지 최적화)
CREATE INDEX idx_schedules_datetime_range ON schedules USING GIST (
    tsrange(start_datetime, end_datetime)
);
CREATE INDEX idx_schedules_creator_datetime ON schedules(creator_id, start_datetime);
CREATE INDEX idx_schedules_team_datetime ON schedules(team_id, start_datetime) WHERE team_id IS NOT NULL;
CREATE INDEX idx_schedules_type ON schedules(schedule_type);

-- schedule_participants 테이블 인덱스
CREATE INDEX idx_schedule_participants_schedule ON schedule_participants(schedule_id);
CREATE INDEX idx_schedule_participants_user ON schedule_participants(user_id);
CREATE INDEX idx_schedule_participants_user_status ON schedule_participants(user_id, participation_status);

-- messages 테이블 인덱스 (날짜별 채팅 조회 최적화)
CREATE INDEX idx_messages_team_date ON messages(team_id, target_date, sent_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_schedule ON messages(related_schedule_id) WHERE related_schedule_id IS NOT NULL;
CREATE INDEX idx_messages_type ON messages(team_id, message_type);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- users 테이블 트리거
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- teams 테이블 트리거
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- schedules 테이블 트리거
CREATE TRIGGER update_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERFORMANCE OPTIMIZATION VIEWS
-- ============================================================================

-- 팀 멤버 정보 뷰 (자주 조회되는 정보)
CREATE VIEW v_team_members_info AS
SELECT
    tm.id,
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.joined_at,
    u.name as user_name,
    u.email as user_email,
    t.name as team_name
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id;

-- 일정 참가자 정보 뷰
CREATE VIEW v_schedule_participants_info AS
SELECT
    sp.id,
    sp.schedule_id,
    sp.user_id,
    sp.participation_status,
    u.name as participant_name,
    u.email as participant_email,
    s.title as schedule_title,
    s.start_datetime,
    s.end_datetime
FROM schedule_participants sp
JOIN users u ON sp.user_id = u.id
JOIN schedules s ON sp.schedule_id = s.id;

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- 일정 충돌 확인 함수
CREATE OR REPLACE FUNCTION check_schedule_conflict(
    p_user_id BIGINT,
    p_start_datetime TIMESTAMP,
    p_end_datetime TIMESTAMP,
    p_exclude_schedule_id BIGINT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    WITH user_schedules AS (
        SELECT s.* FROM schedules s
        JOIN schedule_participants sp ON s.id = sp.schedule_id
        WHERE sp.user_id = p_user_id
        AND sp.participation_status = 'confirmed'
        AND (p_exclude_schedule_id IS NULL OR s.id != p_exclude_schedule_id)
    )
    SELECT COUNT(*) INTO conflict_count
    FROM user_schedules
    WHERE tsrange(start_datetime, end_datetime) &&
          tsrange(p_start_datetime, p_end_datetime);

    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- 팀 초대 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    code VARCHAR(10);
    exists_check INTEGER;
BEGIN
    LOOP
        -- 6자리 영숫자 코드 생성
        code := substr(md5(random()::text), 1, 6);

        -- 중복 확인
        SELECT COUNT(*) INTO exists_check FROM teams WHERE invite_code = code;

        EXIT WHEN exists_check = 0;
    END LOOP;

    RETURN upper(code);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS '사용자 정보 테이블';
COMMENT ON COLUMN users.email IS '로그인용 이메일 (유니크)';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 해시된 비밀번호';

COMMENT ON TABLE teams IS '팀 정보 테이블';
COMMENT ON COLUMN teams.invite_code IS '팀 참여용 초대 코드';

COMMENT ON TABLE team_members IS '팀-사용자 관계 테이블';
COMMENT ON COLUMN team_members.role IS '팀 내 역할: leader(팀장), member(팀원)';

COMMENT ON TABLE schedules IS '일정 정보 테이블';
COMMENT ON COLUMN schedules.schedule_type IS '일정 유형: personal(개인), team(팀)';

COMMENT ON TABLE schedule_participants IS '일정 참가자 테이블';
COMMENT ON COLUMN schedule_participants.participation_status IS '참가 상태: confirmed(확정), pending(대기), declined(거절)';

COMMENT ON TABLE messages IS '팀 채팅 메시지 테이블';
COMMENT ON COLUMN messages.target_date IS '채팅 날짜별 분리용';
COMMENT ON COLUMN messages.message_type IS '메시지 유형: normal(일반), schedule_request(일정 요청), schedule_approved(일정 승인), schedule_rejected(일정 거절)';