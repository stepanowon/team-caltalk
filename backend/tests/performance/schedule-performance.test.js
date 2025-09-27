const request = require('supertest');
const { performance } = require('perf_hooks');
const { Pool } = require('pg');

// 모의 Express 앱 설정
const express = require('express');
const app = express();
app.use(express.json());

// 간단한 인증 미들웨어
const mockAuth = (req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
};

// 성능 테스트용 라우트 설정
app.get('/api/schedules/user/:userId', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const startTime = performance.now();

    const result = await pool.query(`
      SELECT s.*, sp.participation_status, u.name as creator_name
      FROM schedules s
      JOIN schedule_participants sp ON s.id = sp.schedule_id
      LEFT JOIN users u ON s.creator_id = u.id
      WHERE sp.user_id = $1
        AND sp.participation_status = 'confirmed'
        AND s.start_datetime >= $2
        AND s.start_datetime <= $3
      ORDER BY s.start_datetime
    `, [userId, startDate, endDate]);

    const endTime = performance.now();
    const queryTime = endTime - startTime;

    res.json({
      success: true,
      data: result.rows,
      performance: {
        queryTime: Math.round(queryTime * 100) / 100,
        recordCount: result.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/schedules/conflict-check-batch', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { checks } = req.body; // Array of {user_id, start_datetime, end_datetime}

    const startTime = performance.now();

    const conflicts = [];
    for (const check of checks) {
      const result = await pool.query(
        'SELECT check_schedule_conflict($1, $2, $3) as has_conflict',
        [check.user_id, check.start_datetime, check.end_datetime]
      );
      conflicts.push({
        ...check,
        has_conflict: result.rows[0].has_conflict
      });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    res.json({
      success: true,
      data: conflicts,
      performance: {
        totalTime: Math.round(totalTime * 100) / 100,
        averageTime: Math.round((totalTime / checks.length) * 100) / 100,
        checkCount: checks.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/teams/:teamId/schedules/heavy', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { teamId } = req.params;

    const startTime = performance.now();

    // 복잡한 쿼리: 팀 일정과 참가자 정보, 통계 포함
    const result = await pool.query(`
      SELECT
        s.*,
        u.name as creator_name,
        COUNT(sp.user_id) as participant_count,
        STRING_AGG(pu.name, ', ') as participant_names,
        CASE
          WHEN s.start_datetime > NOW() THEN 'upcoming'
          WHEN s.end_datetime < NOW() THEN 'past'
          ELSE 'ongoing'
        END as status
      FROM schedules s
      LEFT JOIN users u ON s.creator_id = u.id
      LEFT JOIN schedule_participants sp ON s.id = sp.schedule_id AND sp.participation_status = 'confirmed'
      LEFT JOIN users pu ON sp.user_id = pu.id
      WHERE s.team_id = $1
      GROUP BY s.id, u.name
      ORDER BY s.start_datetime DESC
    `, [teamId]);

    const endTime = performance.now();
    const queryTime = endTime - startTime;

    res.json({
      success: true,
      data: result.rows,
      performance: {
        queryTime: Math.round(queryTime * 100) / 100,
        recordCount: result.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/schedules/search', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { keyword, limit = 100 } = req.query;

    const startTime = performance.now();

    const result = await pool.query(`
      SELECT
        s.*,
        u.name as creator_name,
        t.name as team_name,
        ts_rank(to_tsvector('english', s.title || ' ' || COALESCE(s.content, '')), plainto_tsquery('english', $1)) as rank
      FROM schedules s
      LEFT JOIN users u ON s.creator_id = u.id
      LEFT JOIN teams t ON s.team_id = t.id
      WHERE to_tsvector('english', s.title || ' ' || COALESCE(s.content, '')) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, s.start_datetime DESC
      LIMIT $2
    `, [keyword, limit]);

    const endTime = performance.now();
    const queryTime = endTime - startTime;

    res.json({
      success: true,
      data: result.rows,
      performance: {
        queryTime: Math.round(queryTime * 100) / 100,
        recordCount: result.rows.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

describe('Schedule Performance Tests', () => {
  let pool;
  let testUsers = [];
  let testTeams = [];

  beforeAll(async () => {
    pool = getTestDbPool();

    // 성능 테스트용 대량 데이터 생성
    await setupPerformanceTestData();
  });

  async function setupPerformanceTestData() {
    console.log('성능 테스트용 데이터 생성 중...');

    // 100명의 사용자 생성
    for (let i = 0; i < 100; i++) {
      const userResult = await pool.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [`perf_user_${i}@example.com`, `Performance User ${i}`, 'hashedpassword']
      );
      testUsers.push(userResult.rows[0]);
    }

    // 20개의 팀 생성
    for (let i = 0; i < 20; i++) {
      const teamResult = await pool.query(
        'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [`Performance Team ${i}`, `Performance test team ${i}`, `PERF${i.toString().padStart(2, '0')}`, testUsers[i].id]
      );
      testTeams.push(teamResult.rows[0]);

      // 각 팀에 5-10명의 멤버 추가
      const memberCount = 5 + Math.floor(Math.random() * 6);
      for (let j = 0; j < memberCount; j++) {
        const userId = testUsers[(i * 5 + j) % testUsers.length].id;
        const role = j === 0 ? 'leader' : 'member';

        await pool.query(
          'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [teamResult.rows[0].id, userId, role]
        );
      }
    }

    // 1000개의 일정 생성
    const schedulePromises = [];
    for (let i = 0; i < 1000; i++) {
      const user = testUsers[Math.floor(Math.random() * testUsers.length)];
      const team = Math.random() > 0.3 ? testTeams[Math.floor(Math.random() * testTeams.length)] : null;

      const startDate = new Date(2024, 11, 1 + Math.floor(Math.random() * 30)); // 12월 랜덤 날짜
      const endDate = new Date(startDate.getTime() + (1 + Math.floor(Math.random() * 4)) * 60 * 60 * 1000);

      schedulePromises.push(
        pool.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          `Performance Schedule ${i}`,
          `Performance test content for schedule ${i}. This is a longer description to test search performance.`,
          startDate,
          endDate,
          team ? 'team' : 'personal',
          user.id,
          team ? team.id : null
        ])
      );
    }

    const scheduleResults = await Promise.all(schedulePromises);

    // 일정 참가자 추가
    const participantPromises = [];
    for (let i = 0; i < scheduleResults.length; i++) {
      const scheduleId = scheduleResults[i].rows[0].id;
      const participantCount = 1 + Math.floor(Math.random() * 5);

      for (let j = 0; j < participantCount; j++) {
        const user = testUsers[Math.floor(Math.random() * testUsers.length)];
        participantPromises.push(
          pool.query(
            'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [scheduleId, user.id, 'confirmed']
          )
        );
      }
    }

    await Promise.all(participantPromises);
    console.log('성능 테스트용 데이터 생성 완료');
  }

  describe('Schedule Query Performance', () => {
    test('사용자별 일정 조회가 2초 이내에 완료되어야 함', async () => {
      const userId = testUsers[0].id;
      const startDate = '2024-12-01';
      const endDate = '2024-12-31';

      const startTime = performance.now();

      const response = await request(app)
        .get(`/api/schedules/user/${userId}?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(2000); // 2초 이내
      expect(response.body.success).toBe(true);
      expect(response.body.performance.queryTime).toBeLessThan(1000); // DB 쿼리 1초 이내

      console.log(`사용자 일정 조회 성능: ${responseTime.toFixed(2)}ms (DB: ${response.body.performance.queryTime}ms)`);
    });

    test('팀별 복잡한 일정 조회가 3초 이내에 완료되어야 함', async () => {
      const teamId = testTeams[0].id;

      const startTime = performance.now();

      const response = await request(app)
        .get(`/api/teams/${teamId}/schedules/heavy`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(3000); // 3초 이내
      expect(response.body.success).toBe(true);
      expect(response.body.performance.queryTime).toBeLessThan(2000); // DB 쿼리 2초 이내

      console.log(`팀 일정 복잡 조회 성능: ${responseTime.toFixed(2)}ms (DB: ${response.body.performance.queryTime}ms, 레코드: ${response.body.performance.recordCount}개)`);
    });

    test('일정 검색 성능이 1.5초 이내여야 함', async () => {
      const keyword = 'Performance';

      const startTime = performance.now();

      const response = await request(app)
        .get(`/api/schedules/search?keyword=${keyword}&limit=50`)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1500); // 1.5초 이내
      expect(response.body.success).toBe(true);
      expect(response.body.performance.queryTime).toBeLessThan(1000); // DB 쿼리 1초 이내

      console.log(`일정 검색 성능: ${responseTime.toFixed(2)}ms (DB: ${response.body.performance.queryTime}ms, 결과: ${response.body.performance.recordCount}개)`);
    });

    test('대량 데이터 조회 시 페이지네이션 성능', async () => {
      const userId = testUsers[0].id;
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const results = [];

      for (let page = 1; page <= 5; page++) {
        const startTime = performance.now();

        const response = await request(app)
          .get(`/api/schedules/user/${userId}?startDate=${startDate}&endDate=${endDate}&page=${page}&limit=20`)
          .expect(200);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        results.push(responseTime);
        expect(responseTime).toBeLessThan(2000); // 각 페이지 2초 이내
      }

      const avgTime = results.reduce((a, b) => a + b, 0) / results.length;
      console.log(`페이지네이션 평균 성능: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('Schedule Conflict Detection Performance', () => {
    test('단일 충돌 검사가 10ms 이내에 완료되어야 함', async () => {
      const userId = testUsers[0].id;

      const startTime = performance.now();

      const result = await pool.query(
        'SELECT check_schedule_conflict($1, $2, $3) as has_conflict',
        [userId, '2024-12-25 10:00:00', '2024-12-25 11:00:00']
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(10); // 10ms 이내
      expect(result.rows[0]).toBeDefined();

      console.log(`단일 충돌 검사 성능: ${responseTime.toFixed(2)}ms`);
    });

    test('배치 충돌 검사 성능이 효율적이어야 함', async () => {
      const checks = [];
      for (let i = 0; i < 50; i++) {
        const userId = testUsers[Math.floor(Math.random() * 10)].id; // 처음 10명만 사용
        const startHour = 9 + i % 8; // 9-16시
        checks.push({
          user_id: userId,
          start_datetime: `2024-12-25 ${startHour.toString().padStart(2, '0')}:00:00`,
          end_datetime: `2024-12-25 ${(startHour + 1).toString().padStart(2, '0')}:00:00`
        });
      }

      const startTime = performance.now();

      const response = await request(app)
        .post('/api/schedules/conflict-check-batch')
        .send({ checks })
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(1000); // 전체 1초 이내
      expect(response.body.performance.averageTime).toBeLessThan(20); // 평균 20ms 이내
      expect(response.body.data).toHaveLength(50);

      console.log(`배치 충돌 검사 성능: ${responseTime.toFixed(2)}ms (평균: ${response.body.performance.averageTime}ms)`);
    });

    test('동시 충돌 검사 성능', async () => {
      const userId = testUsers[0].id;
      const concurrentChecks = 20;

      const promises = [];
      for (let i = 0; i < concurrentChecks; i++) {
        promises.push(
          pool.query(
            'SELECT check_schedule_conflict($1, $2, $3) as has_conflict',
            [userId, `2024-12-25 ${(10 + i).toString().padStart(2, '0')}:00:00`, `2024-12-25 ${(11 + i).toString().padStart(2, '0')}:00:00`]
          )
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentChecks;

      expect(totalTime).toBeLessThan(200); // 전체 200ms 이내
      expect(avgTime).toBeLessThan(10); // 평균 10ms 이내
      expect(results).toHaveLength(concurrentChecks);

      console.log(`동시 충돌 검사 성능: ${totalTime.toFixed(2)}ms (평균: ${avgTime.toFixed(2)}ms)`);
    });
  });

  describe('Database Connection Pool Performance', () => {
    test('연결 풀 효율성 테스트', async () => {
      const concurrentQueries = 50;
      const promises = [];

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          pool.query('SELECT COUNT(*) as count FROM schedules WHERE id > $1', [i])
        );
      }

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentQueries;

      expect(totalTime).toBeLessThan(1000); // 전체 1초 이내
      expect(avgTime).toBeLessThan(20); // 평균 20ms 이내
      expect(results).toHaveLength(concurrentQueries);

      console.log(`연결 풀 성능: ${totalTime.toFixed(2)}ms (평균: ${avgTime.toFixed(2)}ms)`);
    });

    test('순차 vs 병렬 쿼리 성능 비교', async () => {
      const queryCount = 10;
      const testUserId = testUsers[0].id;

      // 순차 실행
      const sequentialStart = performance.now();
      for (let i = 0; i < queryCount; i++) {
        await pool.query(
          'SELECT COUNT(*) as count FROM schedules WHERE creator_id = $1',
          [testUserId]
        );
      }
      const sequentialEnd = performance.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      // 병렬 실행
      const parallelStart = performance.now();
      const parallelPromises = [];
      for (let i = 0; i < queryCount; i++) {
        parallelPromises.push(
          pool.query(
            'SELECT COUNT(*) as count FROM schedules WHERE creator_id = $1',
            [testUserId]
          )
        );
      }
      await Promise.all(parallelPromises);
      const parallelEnd = performance.now();
      const parallelTime = parallelEnd - parallelStart;

      expect(parallelTime).toBeLessThan(sequentialTime); // 병렬이 더 빨라야 함

      console.log(`순차 실행: ${sequentialTime.toFixed(2)}ms, 병렬 실행: ${parallelTime.toFixed(2)}ms`);
      console.log(`성능 향상: ${((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1)}%`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('대량 데이터 조회 시 메모리 효율성', async () => {
      const initialMemory = process.memoryUsage();

      // 대량 데이터 조회
      const result = await pool.query(`
        SELECT s.*, u.name as creator_name
        FROM schedules s
        JOIN users u ON s.creator_id = u.id
        ORDER BY s.created_at DESC
        LIMIT 500
      `);

      const afterQueryMemory = process.memoryUsage();
      const memoryIncrease = afterQueryMemory.heapUsed - initialMemory.heapUsed;

      expect(result.rows.length).toBeLessThanOrEqual(500);
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB 이하

      console.log(`메모리 사용량 증가: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    test('연결 풀 리소스 정리', async () => {
      const initialConnections = pool.totalCount;

      // 다수의 쿼리 실행
      const promises = [];
      for (let i = 0; i < 30; i++) {
        promises.push(
          pool.query('SELECT pg_sleep(0.1), COUNT(*) as count FROM schedules')
        );
      }

      await Promise.all(promises);

      // 잠깐 대기 후 연결 수 확인
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalConnections = pool.totalCount;
      const idleConnections = pool.idleCount;

      expect(finalConnections).toBeLessThanOrEqual(pool.options.max || 20);
      expect(idleConnections).toBeGreaterThan(0); // 유휴 연결이 있어야 함

      console.log(`연결 풀 상태 - 총: ${finalConnections}, 유휴: ${idleConnections}`);
    });
  });

  describe('Index Usage and Query Optimization', () => {
    test('인덱스 사용 확인 및 쿼리 계획 분석', async () => {
      // EXPLAIN ANALYZE로 쿼리 계획 확인
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, FORMAT JSON)
        SELECT s.*, sp.participation_status
        FROM schedules s
        JOIN schedule_participants sp ON s.id = sp.schedule_id
        WHERE sp.user_id = $1
          AND s.start_datetime >= $2
          AND s.start_datetime <= $3
        ORDER BY s.start_datetime
      `, [testUsers[0].id, '2024-12-01', '2024-12-31']);

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const executionTime = plan['Execution Time'];

      expect(executionTime).toBeLessThan(50); // 50ms 이내

      console.log(`쿼리 실행 시간: ${executionTime}ms`);

      // 인덱스 스캔이 사용되는지 확인 (실제로는 더 상세한 분석 필요)
      const planString = JSON.stringify(plan);
      const hasIndexScan = planString.includes('Index Scan') || planString.includes('Bitmap Index Scan');

      if (hasIndexScan) {
        console.log('✓ 인덱스 스캔 사용됨');
      } else {
        console.log('⚠ 전체 테이블 스캔 발생 가능성');
      }
    });

    test('충돌 검사 인덱스 성능', async () => {
      const explainResult = await pool.query(`
        EXPLAIN (ANALYZE, FORMAT JSON)
        SELECT COUNT(*)
        FROM schedules s
        JOIN schedule_participants sp ON s.id = sp.schedule_id
        WHERE sp.user_id = $1
          AND sp.participation_status = 'confirmed'
          AND tsrange(s.start_datetime, s.end_datetime) && tsrange($2, $3)
      `, [testUsers[0].id, '2024-12-25 10:00:00', '2024-12-25 11:00:00']);

      const plan = explainResult.rows[0]['QUERY PLAN'][0];
      const executionTime = plan['Execution Time'];

      expect(executionTime).toBeLessThan(10); // 10ms 이내

      console.log(`충돌 검사 쿼리 실행 시간: ${executionTime}ms`);
    });
  });

  describe('Stress Testing', () => {
    test('고부하 상황에서의 성능 유지', async () => {
      const concurrentUsers = 20;
      const requestsPerUser = 5;
      const allPromises = [];

      for (let user = 0; user < concurrentUsers; user++) {
        for (let req = 0; req < requestsPerUser; req++) {
          const userId = testUsers[user % testUsers.length].id;
          allPromises.push(
            request(app)
              .get(`/api/schedules/user/${userId}?startDate=2024-12-01&endDate=2024-12-31`)
          );
        }
      }

      const startTime = performance.now();
      const responses = await Promise.all(allPromises);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / allPromises.length;
      const successCount = responses.filter(r => r.status === 200).length;

      expect(successCount).toBe(allPromises.length); // 모든 요청 성공
      expect(avgResponseTime).toBeLessThan(500); // 평균 500ms 이내
      expect(totalTime).toBeLessThan(10000); // 전체 10초 이내

      console.log(`스트레스 테스트 결과:`);
      console.log(`- 총 요청: ${allPromises.length}개`);
      console.log(`- 성공률: ${(successCount / allPromises.length * 100).toFixed(1)}%`);
      console.log(`- 평균 응답시간: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`- 총 실행시간: ${totalTime.toFixed(2)}ms`);
    });

    test('메모리 누수 감지', async () => {
      const iterations = 100;
      const memorySnapshots = [];

      for (let i = 0; i < iterations; i++) {
        await pool.query('SELECT COUNT(*) FROM schedules');

        if (i % 20 === 0) {
          // 가비지 컬렉션 강제 실행 (테스트 환경에서만)
          if (global.gc) {
            global.gc();
          }
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }

      // 메모리 사용량이 지속적으로 증가하는지 확인
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryIncrease = lastSnapshot - firstSnapshot;
      const increasePercentage = (memoryIncrease / firstSnapshot) * 100;

      expect(increasePercentage).toBeLessThan(50); // 50% 이상 증가하면 누수 의심

      console.log(`메모리 사용량 변화: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${increasePercentage.toFixed(1)}%)`);
    });
  });
});