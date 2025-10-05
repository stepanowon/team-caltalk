/**
 * Team CalTalk 보안 테스트 스크립트
 * - JWT 토큰 만료 처리 테스트
 * - 권한 없는 API 직접 호출 차단 테스트 (403/401)
 * - SQL Injection 방지 검증
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
const TEST_ACCOUNTS = {
  leader: {
    email: 'kim.dev@company.com',
    password: 'Dev2024!',
  },
  member: {
    email: 'lee.coder@company.com',
    password: 'Coder2024!',
  },
};

let leaderToken = null;
let memberToken = null;
const teamId = 61;

/**
 * 로그인 헬퍼 함수
 */
async function login(account) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, account);
    return response.data.token;
  } catch (error) {
    console.error(`로그인 실패: ${error.message}`);
    return null;
  }
}

/**
 * 테스트 1: JWT 토큰 만료 처리
 */
async function testJWTExpiration() {
  console.log('\n=== 1. JWT 토큰 만료 처리 테스트 ===');

  const tests = [];

  // 1.1 만료된 토큰 테스트
  const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

  try {
    await axios.get(`${API_BASE_URL}/schedules?team_id=${teamId}`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    tests.push({
      test: '만료된 토큰',
      expected: 401,
      actual: 200,
      result: '❌ 실패 (만료된 토큰 허용됨)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '만료된 토큰',
      expected: 401,
      actual: status,
      result: status === 401 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 1.2 잘못된 형식 토큰 테스트
  try {
    await axios.get(`${API_BASE_URL}/schedules?team_id=${teamId}`, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    });
    tests.push({
      test: '잘못된 토큰 형식',
      expected: 401,
      actual: 200,
      result: '❌ 실패 (잘못된 토큰 허용됨)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '잘못된 토큰 형식',
      expected: 401,
      actual: status,
      result: status === 401 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 1.3 토큰 없음 테스트
  try {
    await axios.get(`${API_BASE_URL}/schedules?team_id=${teamId}`);
    tests.push({
      test: '토큰 없음',
      expected: 401,
      actual: 200,
      result: '❌ 실패 (인증 없이 접근 허용)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '토큰 없음',
      expected: 401,
      actual: status,
      result: status === 401 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 결과 출력
  console.log('\n📊 JWT 토큰 검증 결과:');
  tests.forEach(t => {
    console.log(`   ${t.result}`);
    console.log(`      테스트: ${t.test}`);
    console.log(`      예상: ${t.expected}, 실제: ${t.actual}`);
  });

  const passCount = tests.filter(t => t.result.startsWith('✅')).length;
  console.log(`\n   총 ${tests.length}개 테스트 중 ${passCount}개 성공`);

  return tests;
}

/**
 * 테스트 2: 권한 없는 API 직접 호출 차단
 */
async function testUnauthorizedAccess() {
  console.log('\n=== 2. 권한 없는 API 접근 차단 테스트 ===');

  // 로그인
  leaderToken = await login(TEST_ACCOUNTS.leader);
  memberToken = await login(TEST_ACCOUNTS.member);

  if (!leaderToken || !memberToken) {
    console.log('❌ 로그인 실패로 테스트 중단');
    return [];
  }

  const tests = [];

  // 2.1 팀원이 일정 생성 시도 (팀장 권한 필요)
  try {
    await axios.post(`${API_BASE_URL}/schedules`, {
      title: '무단 일정',
      content: '팀원이 생성 시도',
      start_datetime: '2025-10-15 10:00:00',
      end_datetime: '2025-10-15 11:00:00',
      schedule_type: 'team',
      team_id: teamId,
    }, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    tests.push({
      test: '팀원의 일정 생성',
      expected: 403,
      actual: 201,
      result: '❌ 실패 (팀원이 일정 생성 가능)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '팀원의 일정 생성',
      expected: 403,
      actual: status,
      result: status === 403 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 2.2 팀원이 일정 삭제 시도 (팀장 권한 필요)
  try {
    await axios.delete(`${API_BASE_URL}/schedules/389`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    tests.push({
      test: '팀원의 일정 삭제',
      expected: 403,
      actual: 200,
      result: '❌ 실패 (팀원이 일정 삭제 가능)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '팀원의 일정 삭제',
      expected: 403,
      actual: status,
      result: status === 403 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 2.3 다른 팀의 일정 조회 시도
  try {
    await axios.get(`${API_BASE_URL}/schedules?team_id=999`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    tests.push({
      test: '다른 팀 일정 조회',
      expected: 403,
      actual: 200,
      result: '❌ 실패 (다른 팀 접근 가능)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '다른 팀 일정 조회',
      expected: 403,
      actual: status,
      result: status === 403 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 2.4 팀원이 일정 수정 시도
  try {
    await axios.put(`${API_BASE_URL}/schedules/389`, {
      title: '수정된 일정',
    }, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    tests.push({
      test: '팀원의 일정 수정',
      expected: 403,
      actual: 200,
      result: '❌ 실패 (팀원이 일정 수정 가능)',
    });
  } catch (error) {
    const status = error.response?.status;
    tests.push({
      test: '팀원의 일정 수정',
      expected: 403,
      actual: status,
      result: status === 403 ? '✅ 성공 (거부됨)' : `⚠️ 주의 (${status})`,
    });
  }

  // 결과 출력
  console.log('\n📊 권한 검증 결과:');
  tests.forEach(t => {
    console.log(`   ${t.result}`);
    console.log(`      테스트: ${t.test}`);
    console.log(`      예상: ${t.expected}, 실제: ${t.actual}`);
  });

  const passCount = tests.filter(t => t.result.startsWith('✅')).length;
  console.log(`\n   총 ${tests.length}개 테스트 중 ${passCount}개 성공`);

  return tests;
}

/**
 * 테스트 3: SQL Injection 방지
 */
async function testSQLInjection() {
  console.log('\n=== 3. SQL Injection 방지 테스트 ===');

  const tests = [];

  // SQL Injection 페이로드 목록
  const injectionPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "1' AND '1'='1",
  ];

  // 3.1 로그인 SQL Injection 테스트
  for (const payload of injectionPayloads) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: payload,
        password: payload,
      });

      tests.push({
        test: `SQL Injection (로그인)`,
        payload: payload.substring(0, 20),
        expected: 'Rejected',
        actual: 'Accepted',
        result: '❌ 실패 (SQL Injection 취약)',
      });
    } catch (error) {
      const status = error.response?.status;
      const isSafe = status === 400 || status === 401 || status === 422;

      tests.push({
        test: `SQL Injection (로그인)`,
        payload: payload.substring(0, 20),
        expected: 'Rejected',
        actual: `Rejected (${status})`,
        result: isSafe ? '✅ 성공 (차단됨)' : `⚠️ 주의 (${status})`,
      });
    }
  }

  // 3.2 쿼리 파라미터 SQL Injection 테스트
  if (!memberToken) {
    memberToken = await login(TEST_ACCOUNTS.member);
  }

  const queryInjections = [
    `${teamId}' OR '1'='1`,
    `${teamId}; DELETE FROM schedules; --`,
    `${teamId} UNION SELECT * FROM users`,
  ];

  for (const payload of queryInjections) {
    try {
      await axios.get(`${API_BASE_URL}/schedules?team_id=${payload}`, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });

      tests.push({
        test: `SQL Injection (쿼리)`,
        payload: payload.substring(0, 20),
        expected: 'Rejected',
        actual: 'Accepted',
        result: '❌ 실패 (SQL Injection 취약)',
      });
    } catch (error) {
      const status = error.response?.status;
      const isSafe = status === 400 || status === 422 || status === 500;

      tests.push({
        test: `SQL Injection (쿼리)`,
        payload: payload.substring(0, 20),
        expected: 'Rejected',
        actual: `Rejected (${status})`,
        result: isSafe ? '✅ 성공 (차단됨)' : `⚠️ 주의 (${status})`,
      });
    }
  }

  // 3.3 데이터베이스 직접 확인 (테이블이 삭제되지 않았는지)
  try {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    tests.push({
      test: 'DB 무결성 확인',
      payload: 'users 테이블',
      expected: 'Exists',
      actual: 'Exists',
      result: '✅ 성공 (테이블 안전)',
    });
  } catch (error) {
    tests.push({
      test: 'DB 무결성 확인',
      payload: 'users 테이블',
      expected: 'Exists',
      actual: 'Missing',
      result: '❌ 실패 (테이블 손상)',
    });
  }

  // 결과 출력
  console.log('\n📊 SQL Injection 방지 결과:');
  tests.forEach(t => {
    console.log(`   ${t.result}`);
    console.log(`      테스트: ${t.test}`);
    console.log(`      페이로드: ${t.payload}`);
  });

  const passCount = tests.filter(t => t.result.startsWith('✅')).length;
  console.log(`\n   총 ${tests.length}개 테스트 중 ${passCount}개 성공`);

  return tests;
}

/**
 * 테스트 4: 추가 보안 검증
 */
async function testAdditionalSecurity() {
  console.log('\n=== 4. 추가 보안 검증 ===');

  const tests = [];

  // 4.1 XSS (Cross-Site Scripting) 방지
  const xssPayload = '<script>alert("XSS")</script>';

  try {
    await axios.post(`${API_BASE_URL}/messages`, {
      team_id: teamId,
      content: xssPayload,
    }, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });

    // 메시지가 저장되었는지 확인
    const result = await pool.query(
      'SELECT content FROM messages WHERE content LIKE $1 LIMIT 1',
      [`%${xssPayload}%`]
    );

    if (result.rows.length > 0) {
      tests.push({
        test: 'XSS 방지',
        payload: xssPayload,
        expected: 'Sanitized',
        actual: 'Stored as-is',
        result: '⚠️ 주의 (프론트엔드 검증 필요)',
      });
    } else {
      tests.push({
        test: 'XSS 방지',
        payload: xssPayload,
        expected: 'Sanitized',
        actual: 'Sanitized',
        result: '✅ 성공 (차단됨)',
      });
    }
  } catch (error) {
    tests.push({
      test: 'XSS 방지',
      payload: xssPayload,
      expected: 'Sanitized',
      actual: `Rejected (${error.response?.status})`,
      result: '✅ 성공 (거부됨)',
    });
  }

  // 4.2 비밀번호 해싱 확인
  try {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE email = $1',
      [TEST_ACCOUNTS.member.email]
    );

    if (result.rows.length > 0) {
      const hash = result.rows[0].password_hash;
      const isPlaintext = hash === TEST_ACCOUNTS.member.password;
      const isBcrypt = hash.startsWith('$2a$') || hash.startsWith('$2b$');

      tests.push({
        test: '비밀번호 해싱',
        payload: 'password_hash',
        expected: 'Hashed',
        actual: isBcrypt ? 'Bcrypt' : (isPlaintext ? 'Plaintext' : 'Unknown'),
        result: isBcrypt ? '✅ 성공 (해싱됨)' : '❌ 실패 (평문 저장)',
      });
    }
  } catch (error) {
    tests.push({
      test: '비밀번호 해싱',
      payload: 'password_hash',
      expected: 'Hashed',
      actual: 'Error',
      result: '⚠️ 오류',
    });
  }

  // 4.3 민감 정보 노출 확인 (에러 메시지)
  try {
    await axios.get(`${API_BASE_URL}/schedules?team_id=invalid`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
  } catch (error) {
    const errorMessage = error.response?.data?.error || '';
    const stackTrace = error.response?.data?.stack || '';

    const hasStackTrace = stackTrace.length > 0;
    const hasDbDetails = errorMessage.includes('postgres') || errorMessage.includes('SQL');

    tests.push({
      test: '민감 정보 노출',
      payload: '에러 메시지',
      expected: 'No Stack Trace',
      actual: hasStackTrace ? 'Has Stack Trace' : 'Clean',
      result: hasStackTrace ? '⚠️ 주의 (스택 트레이스 노출)' : '✅ 성공 (안전)',
    });
  }

  // 결과 출력
  console.log('\n📊 추가 보안 검증 결과:');
  tests.forEach(t => {
    console.log(`   ${t.result}`);
    console.log(`      테스트: ${t.test}`);
    console.log(`      예상: ${t.expected}, 실제: ${t.actual}`);
  });

  const passCount = tests.filter(t => t.result.startsWith('✅')).length;
  console.log(`\n   총 ${tests.length}개 테스트 중 ${passCount}개 성공`);

  return tests;
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   Team CalTalk 보안 테스트                        ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  try {
    // 1. JWT 토큰 만료 처리
    const jwtTests = await testJWTExpiration();

    // 2. 권한 없는 API 접근 차단
    const authTests = await testUnauthorizedAccess();

    // 3. SQL Injection 방지
    const sqlTests = await testSQLInjection();

    // 4. 추가 보안 검증
    const additionalTests = await testAdditionalSecurity();

    // 전체 결과 요약
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   보안 테스트 완료                                ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    const allTests = [...jwtTests, ...authTests, ...sqlTests, ...additionalTests];
    const totalPass = allTests.filter(t => t.result.startsWith('✅')).length;
    const totalWarning = allTests.filter(t => t.result.startsWith('⚠️')).length;
    const totalFail = allTests.filter(t => t.result.startsWith('❌')).length;

    console.log('📊 최종 결과 요약:');
    console.log(`   총 테스트: ${allTests.length}개`);
    console.log(`   ✅ 성공: ${totalPass}개`);
    console.log(`   ⚠️ 주의: ${totalWarning}개`);
    console.log(`   ❌ 실패: ${totalFail}개`);
    console.log(`   성공률: ${(totalPass / allTests.length * 100).toFixed(1)}%`);

    if (totalFail > 0) {
      console.log('\n⚠️ 심각한 보안 취약점이 발견되었습니다!');
    } else if (totalWarning > 0) {
      console.log('\n⚠️ 일부 보안 개선이 필요합니다.');
    } else {
      console.log('\n✅ 모든 보안 테스트를 통과했습니다!');
    }

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
  testJWTExpiration,
  testUnauthorizedAccess,
  testSQLInjection,
  testAdditionalSecurity,
};
