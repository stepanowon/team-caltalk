/**
 * Team CalTalk 성능 테스트 스크립트
 * - 대용량 일정 데이터 생성 및 조회 성능 측정
 * - 일정 충돌 감지 성능 측정
 * - API 응답 시간 측정
 */

const axios = require('axios');
const { Pool } = require('pg');

const API_BASE_URL = 'http://localhost:3000/api';
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'team_caltalk',
  user: 'team_caltalk_user',
  password: 'team_caltalk_2024!',
};

const pool = new Pool(DB_CONFIG);

// 테스트 계정
const LEADER_ACCOUNT = {
  email: 'kim.dev@company.com',
  password: 'Dev2024!',
};

let leaderToken = null;
let teamId = 61; // 백엔드 개발팀

/**
 * 1. 로그인 및 토큰 획득
 */
async function login() {
  console.log('\n=== 1. 로그인 테스트 ===');
  const startTime = Date.now();

  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, LEADER_ACCOUNT);
    leaderToken = response.data.token;
    const duration = Date.now() - startTime;

    console.log(`✅ 로그인 성공 (${duration}ms)`);
    console.log(`   Token: ${leaderToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error(`❌ 로그인 실패: ${error.message}`);
    return false;
  }
}

/**
 * 2. 대량 일정 데이터 생성 (100개)
 */
async function generateSchedules(count = 100) {
  console.log(`\n=== 2. 대량 일정 데이터 생성 (${count}개) ===`);
  const startTime = Date.now();

  const schedules = [];
  const baseDate = new Date('2025-10-10T09:00:00');

  for (let i = 0; i < count; i++) {
    const startHour = 9 + (i % 8); // 9시~16시
    const dayOffset = Math.floor(i / 8); // 하루 8개 일정

    const start = new Date(baseDate);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startHour);

    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    schedules.push({
      title: `성능테스트 일정 ${i + 1}`,
      description: `성능 측정을 위한 테스트 일정 ${i + 1}번`,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      start_time: start.toTimeString().slice(0, 5),
      end_time: end.toTimeString().slice(0, 5),
      team_id: teamId,
    });
  }

  let successCount = 0;
  let failCount = 0;

  for (const schedule of schedules) {
    try {
      await axios.post(`${API_BASE_URL}/schedules`, schedule, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      successCount++;

      if (successCount % 10 === 0) {
        process.stdout.write(`\r   생성 중... ${successCount}/${count}`);
      }
    } catch (error) {
      failCount++;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`\n✅ 일정 생성 완료: ${successCount}개 성공, ${failCount}개 실패 (${duration}ms)`);
  console.log(`   평균 생성 시간: ${(duration / count).toFixed(2)}ms/건`);

  return successCount;
}

/**
 * 3. 대용량 일정 조회 성능 테스트
 */
async function testScheduleQuery() {
  console.log('\n=== 3. 대용량 일정 조회 성능 테스트 ===');

  const tests = [];

  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${API_BASE_URL}/schedules`, {
        params: { team_id: teamId },
        headers: { Authorization: `Bearer ${leaderToken}` },
      });

      const duration = Date.now() - startTime;
      tests.push({
        attempt: i + 1,
        duration,
        count: response.data.data?.schedules?.length || 0,
        success: true,
      });

      process.stdout.write(`\r   테스트 ${i + 1}/10 완료...`);
    } catch (error) {
      tests.push({
        attempt: i + 1,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      });
    }
  }

  console.log('\n');

  const successTests = tests.filter(t => t.success);
  if (successTests.length > 0) {
    const avgDuration = successTests.reduce((sum, t) => sum + t.duration, 0) / successTests.length;
    const minDuration = Math.min(...successTests.map(t => t.duration));
    const maxDuration = Math.max(...successTests.map(t => t.duration));

    console.log(`✅ 조회 성공: ${successTests.length}/10`);
    console.log(`   일정 수: ${successTests[0].count}개`);
    console.log(`   평균 응답 시간: ${avgDuration.toFixed(2)}ms`);
    console.log(`   최소 응답 시간: ${minDuration}ms`);
    console.log(`   최대 응답 시간: ${maxDuration}ms`);
    console.log(`   목표 달성 여부: ${avgDuration < 2000 ? '✅ 성공 (<2초)' : '❌ 실패 (≥2초)'}`);
  } else {
    console.log('❌ 모든 조회 실패');
  }

  return tests;
}

/**
 * 4. 일정 충돌 감지 성능 테스트
 */
async function testConflictDetection() {
  console.log('\n=== 4. 일정 충돌 감지 성능 테스트 ===');

  const conflictSchedule = {
    title: '충돌 테스트 일정',
    description: '기존 일정과 충돌하는 일정',
    start_date: '2025-10-10',
    end_date: '2025-10-10',
    start_time: '09:30',
    end_time: '10:30',
    team_id: teamId,
  };

  const tests = [];

  for (let i = 0; i < 10; i++) {
    const startTime = Date.now();

    try {
      await axios.post(`${API_BASE_URL}/schedules`, conflictSchedule, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });

      tests.push({
        attempt: i + 1,
        duration: Date.now() - startTime,
        detected: false,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const isConflict = error.response?.status === 409;

      tests.push({
        attempt: i + 1,
        duration,
        detected: isConflict,
        status: error.response?.status,
      });

      process.stdout.write(`\r   테스트 ${i + 1}/10 완료...`);
    }
  }

  console.log('\n');

  const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
  const detected = tests.filter(t => t.detected).length;

  console.log(`✅ 충돌 감지 성능:`);
  console.log(`   충돌 감지 성공: ${detected}/10`);
  console.log(`   평균 응답 시간: ${avgDuration.toFixed(2)}ms`);
  console.log(`   충돌 감지율: ${(detected / 10 * 100).toFixed(1)}%`);

  return tests;
}

/**
 * 5. 데이터베이스 직접 쿼리 성능 테스트
 */
async function testDatabaseQuery() {
  console.log('\n=== 5. 데이터베이스 쿼리 성능 테스트 ===');

  const tests = {
    scheduleCount: null,
    complexQuery: null,
    conflictCheck: null,
  };

  // 5.1 전체 일정 수 조회
  let startTime = Date.now();
  const countResult = await pool.query('SELECT COUNT(*) FROM schedules WHERE team_id = $1', [teamId]);
  tests.scheduleCount = {
    duration: Date.now() - startTime,
    count: parseInt(countResult.rows[0].count),
  };

  // 5.2 복잡한 JOIN 쿼리
  startTime = Date.now();
  const complexResult = await pool.query(`
    SELECT
      s.id,
      s.title,
      s.schedule_date,
      s.time_range,
      array_agg(DISTINCT u.username) as participants
    FROM schedules s
    LEFT JOIN schedule_participants sp ON s.id = sp.schedule_id
    LEFT JOIN users u ON sp.user_id = u.id
    WHERE s.team_id = $1
    GROUP BY s.id, s.title, s.schedule_date, s.time_range
    ORDER BY s.schedule_date DESC, s.time_range DESC
    LIMIT 50
  `, [teamId]);
  tests.complexQuery = {
    duration: Date.now() - startTime,
    rows: complexResult.rows.length,
  };

  // 5.3 충돌 감지 함수 직접 호출
  startTime = Date.now();
  const conflictResult = await pool.query(`
    SELECT check_schedule_conflict(
      $1::INTEGER,
      $2::DATE,
      $3::TIME,
      $4::TIME,
      NULL
    ) as has_conflict
  `, [teamId, '2025-10-10', '09:30', '10:30']);
  tests.conflictCheck = {
    duration: Date.now() - startTime,
    hasConflict: conflictResult.rows[0].has_conflict,
  };

  console.log(`✅ 일정 수 조회: ${tests.scheduleCount.count}개 (${tests.scheduleCount.duration}ms)`);
  console.log(`✅ 복잡한 쿼리: ${tests.complexQuery.rows}행 (${tests.complexQuery.duration}ms)`);
  console.log(`✅ 충돌 감지 함수: ${tests.conflictCheck.hasConflict ? '충돌 있음' : '충돌 없음'} (${tests.conflictCheck.duration}ms)`);

  return tests;
}

/**
 * 6. 테스트 데이터 정리
 */
async function cleanup() {
  console.log('\n=== 6. 테스트 데이터 정리 ===');

  try {
    const result = await pool.query(`
      DELETE FROM schedules
      WHERE team_id = $1
      AND title LIKE '성능테스트 일정%'
    `, [teamId]);

    console.log(`✅ 테스트 일정 삭제 완료: ${result.rowCount}개`);
  } catch (error) {
    console.error(`❌ 정리 실패: ${error.message}`);
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Team CalTalk 성능 테스트                        ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  try {
    // 1. 로그인
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n❌ 로그인 실패로 테스트 중단');
      process.exit(1);
    }

    // 2. 대량 데이터 생성
    const scheduleCount = await generateSchedules(100);

    // 3. 조회 성능 테스트
    const queryTests = await testScheduleQuery();

    // 4. 충돌 감지 성능 테스트
    const conflictTests = await testConflictDetection();

    // 5. DB 쿼리 성능 테스트
    const dbTests = await testDatabaseQuery();

    // 6. 정리
    await cleanup();

    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   성능 테스트 완료                                ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    // 결과 요약
    const avgQueryTime = queryTests
      .filter(t => t.success)
      .reduce((sum, t) => sum + t.duration, 0) / queryTests.filter(t => t.success).length;

    console.log('📊 최종 결과 요약:');
    console.log(`   - 생성된 일정: ${scheduleCount}개`);
    console.log(`   - 평균 조회 시간: ${avgQueryTime.toFixed(2)}ms`);
    console.log(`   - 2초 목표 달성: ${avgQueryTime < 2000 ? '✅' : '❌'}`);
    console.log(`   - DB 직접 쿼리: ${dbTests.complexQuery.duration}ms`);

  } catch (error) {
    console.error(`\n❌ 테스트 실패: ${error.message}`);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  login,
  generateSchedules,
  testScheduleQuery,
  testConflictDetection,
  testDatabaseQuery,
  cleanup,
};
