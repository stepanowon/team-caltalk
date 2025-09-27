const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-very-long-and-secure';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '10';

// 테스트 데이터베이스 설정
const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'team_caltalk_test',
  user: 'postgres',
  password: 'asdf!2345',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let testDbPool;

// 전역 설정
beforeAll(async () => {
  // 테스트 데이터베이스 연결 풀 생성
  testDbPool = new Pool(TEST_DB_CONFIG);

  try {
    // 테스트 데이터베이스 스키마 초기화
    await initializeTestDatabase();
    console.log('✅ 테스트 데이터베이스 초기화 완료');
  } catch (error) {
    console.error('❌ 테스트 데이터베이스 초기화 실패:', error.message);
    throw error;
  }
});

// 각 테스트 파일 후 정리
afterAll(async () => {
  if (testDbPool) {
    await testDbPool.end();
    console.log('✅ 테스트 데이터베이스 연결 해제');
  }
});

// 각 테스트 후 데이터 정리
afterEach(async () => {
  if (testDbPool) {
    await cleanupTestData();
  }
});

/**
 * 테스트 데이터베이스 초기화
 */
async function initializeTestDatabase() {
  const client = await testDbPool.connect();

  try {
    // 기존 테이블 삭제 (순서 중요)
    const dropTables = [
      'DROP TABLE IF EXISTS messages CASCADE',
      'DROP TABLE IF EXISTS schedule_participants CASCADE',
      'DROP TABLE IF EXISTS schedules CASCADE',
      'DROP TABLE IF EXISTS team_members CASCADE',
      'DROP TABLE IF EXISTS teams CASCADE',
      'DROP TABLE IF EXISTS users CASCADE'
    ];

    for (const dropQuery of dropTables) {
      await client.query(dropQuery);
    }

    // 스키마 파일 읽기 및 실행
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // 스키마 실행 (여러 문장을 개별적으로 실행)
    const statements = schemaContent
      .split(';')
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement.trim());
      }
    }

  } finally {
    client.release();
  }
}

/**
 * 테스트 데이터 정리
 */
async function cleanupTestData() {
  const client = await testDbPool.connect();

  try {
    // 외래키 제약 조건 순서에 맞게 삭제
    const cleanupQueries = [
      'DELETE FROM messages',
      'DELETE FROM schedule_participants',
      'DELETE FROM schedules',
      'DELETE FROM team_members',
      'DELETE FROM teams',
      'DELETE FROM users'
    ];

    for (const query of cleanupQueries) {
      await client.query(query);
    }

    // 시퀀스 리셋
    const resetSequences = [
      'ALTER SEQUENCE users_id_seq RESTART WITH 1',
      'ALTER SEQUENCE teams_id_seq RESTART WITH 1',
      'ALTER SEQUENCE team_members_id_seq RESTART WITH 1',
      'ALTER SEQUENCE schedules_id_seq RESTART WITH 1',
      'ALTER SEQUENCE schedule_participants_id_seq RESTART WITH 1',
      'ALTER SEQUENCE messages_id_seq RESTART WITH 1'
    ];

    for (const resetQuery of resetSequences) {
      await client.query(resetQuery);
    }

  } catch (error) {
    console.warn('⚠️ 테스트 데이터 정리 중 오류:', error.message);
  } finally {
    client.release();
  }
}

/**
 * 테스트용 DB 풀 반환
 */
function getTestDbPool() {
  return testDbPool;
}

/**
 * 테스트용 사용자 생성 헬퍼
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    password: 'password123'
  };

  return { ...defaultUser, ...userData };
}

/**
 * 테스트용 팀 생성 헬퍼
 */
async function createTestTeam(teamData = {}) {
  const defaultTeam = {
    name: `Test Team ${Date.now()}`,
    description: 'Test team description',
    invite_code: `TC${Date.now().toString().slice(-6)}`
  };

  return { ...defaultTeam, ...teamData };
}

/**
 * 테스트용 일정 생성 헬퍼
 */
async function createTestSchedule(scheduleData = {}) {
  const now = new Date();
  const defaultSchedule = {
    title: 'Test Schedule',
    content: 'Test schedule content',
    start_datetime: new Date(now.getTime() + 60 * 60 * 1000), // 1시간 후
    end_datetime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2시간 후
    schedule_type: 'team'
  };

  return { ...defaultSchedule, ...scheduleData };
}

// 전역으로 내보내기
global.getTestDbPool = getTestDbPool;
global.createTestUser = createTestUser;
global.createTestTeam = createTestTeam;
global.createTestSchedule = createTestSchedule;

// Jest 매처 확장
expect.extend({
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);

    if (pass) {
      return {
        message: () => `예상: ${received}이 유효한 이메일이 아니어야 함`,
        pass: true,
      };
    } else {
      return {
        message: () => `예상: ${received}이 유효한 이메일이어야 함`,
        pass: false,
      };
    }
  },

  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);

    if (pass) {
      return {
        message: () => `예상: ${received}이 유효한 JWT가 아니어야 함`,
        pass: true,
      };
    } else {
      return {
        message: () => `예상: ${received}이 유효한 JWT여야 함`,
        pass: false,
      };
    }
  }
});