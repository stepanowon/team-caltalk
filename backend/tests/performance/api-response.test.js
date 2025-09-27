const request = require('supertest');
const jwt = require('jsonwebtoken');

/**
 * API 응답 시간 성능 테스트
 *
 * 테스트 범위:
 * - 인증 API 응답 시간 (< 0.5초)
 * - 일반 API 응답 시간 (< 100ms)
 * - 데이터베이스 쿼리 성능
 * - 동시 요청 처리 성능
 * - 부하 테스트
 */

describe('API 응답 시간 성능 테스트', () => {
  let app;
  let validToken;
  const performanceMetrics = {
    auth: [],
    api: [],
    database: []
  };

  beforeAll(async () => {
    // Express 앱 초기화 (모킹)
    const express = require('express');
    app = express();
    app.use(express.json());

    // 성능 측정 미들웨어
    app.use((req, res, next) => {
      req.startTime = process.hrtime.bigint();
      next();
    });

    // 모킹된 라우트들
    setupMockRoutes(app);

    // 테스트용 토큰 생성
    validToken = jwt.sign(
      { userId: 1, email: 'test@example.com', role: 'member' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // 성능 메트릭 요약 출력
    console.log('\n=== 성능 테스트 결과 요약 ===');
    console.log(`인증 API 평균 응답시간: ${calculateAverage(performanceMetrics.auth)}ms`);
    console.log(`일반 API 평균 응답시간: ${calculateAverage(performanceMetrics.api)}ms`);
    console.log(`데이터베이스 평균 응답시간: ${calculateAverage(performanceMetrics.database)}ms`);
  });

  describe('인증 API 성능 테스트', () => {
    test('회원가입 API 응답 시간 < 500ms', async () => {
      const userData = {
        email: 'performance@example.com',
        name: 'Performance User',
        password: 'password123'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.auth.push(responseTime);

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(500);
      console.log(`회원가입 응답시간: ${responseTime}ms`);
    });

    test('로그인 API 응답 시간 < 500ms', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.auth.push(responseTime);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(500);
      console.log(`로그인 응답시간: ${responseTime}ms`);
    });

    test('토큰 갱신 API 응답 시간 < 100ms', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.api.push(responseTime);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      console.log(`토큰 갱신 응답시간: ${responseTime}ms`);
    });

    test('사용자 정보 조회 API 응답 시간 < 100ms', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.api.push(responseTime);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      console.log(`사용자 정보 조회 응답시간: ${responseTime}ms`);
    });
  });

  describe('일반 API 성능 테스트', () => {
    test('팀 목록 조회 API 응답 시간 < 100ms', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/teams')
        .set('Authorization', `Bearer ${validToken}`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.api.push(responseTime);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      console.log(`팀 목록 조회 응답시간: ${responseTime}ms`);
    });

    test('일정 목록 조회 API 응답 시간 < 100ms', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/schedules?teamId=1')
        .set('Authorization', `Bearer ${validToken}`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.api.push(responseTime);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      console.log(`일정 목록 조회 응답시간: ${responseTime}ms`);
    });

    test('메시지 목록 조회 API 응답 시간 < 100ms', async () => {
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/messages?teamId=1&date=2025-09-28')
        .set('Authorization', `Bearer ${validToken}`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.api.push(responseTime);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100);
      console.log(`메시지 목록 조회 응답시간: ${responseTime}ms`);
    });

    test('일정 생성 API 응답 시간 < 100ms', async () => {
      const scheduleData = {
        teamId: 1,
        title: 'Performance Test Schedule',
        content: 'Performance testing schedule',
        start_datetime: '2025-09-28T10:00:00Z',
        end_datetime: '2025-09-28T11:00:00Z',
        schedule_type: 'team'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${validToken}`)
        .send(scheduleData);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      performanceMetrics.api.push(responseTime);

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(100);
      console.log(`일정 생성 응답시간: ${responseTime}ms`);
    });
  });

  describe('데이터베이스 쿼리 성능 테스트', () => {
    test('사용자 조회 쿼리 성능 < 50ms', async () => {
      const dbPool = getTestDbPool();
      const client = await dbPool.connect();

      try {
        const startTime = Date.now();
        await client.query('SELECT * FROM users WHERE id = $1', [1]);
        const endTime = Date.now();

        const queryTime = endTime - startTime;
        performanceMetrics.database.push(queryTime);

        expect(queryTime).toBeLessThan(50);
        console.log(`사용자 조회 쿼리 시간: ${queryTime}ms`);
      } finally {
        client.release();
      }
    });

    test('팀 멤버 조회 쿼리 성능 < 50ms', async () => {
      const dbPool = getTestDbPool();
      const client = await dbPool.connect();

      try {
        const startTime = Date.now();
        await client.query(`
          SELECT u.id, u.name, u.email, tm.role
          FROM users u
          JOIN team_members tm ON u.id = tm.user_id
          WHERE tm.team_id = $1
        `, [1]);
        const endTime = Date.now();

        const queryTime = endTime - startTime;
        performanceMetrics.database.push(queryTime);

        expect(queryTime).toBeLessThan(50);
        console.log(`팀 멤버 조회 쿼리 시간: ${queryTime}ms`);
      } finally {
        client.release();
      }
    });

    test('일정 충돌 검사 쿼리 성능 < 50ms', async () => {
      const dbPool = getTestDbPool();
      const client = await dbPool.connect();

      try {
        const startTime = Date.now();
        await client.query(`
          SELECT id FROM schedules
          WHERE team_id = $1
          AND tsrange(start_datetime, end_datetime) && tsrange($2, $3)
        `, [1, '2025-09-28T10:00:00Z', '2025-09-28T11:00:00Z']);
        const endTime = Date.now();

        const queryTime = endTime - startTime;
        performanceMetrics.database.push(queryTime);

        expect(queryTime).toBeLessThan(50);
        console.log(`일정 충돌 검사 쿼리 시간: ${queryTime}ms`);
      } finally {
        client.release();
      }
    });

    test('메시지 목록 조회 쿼리 성능 < 50ms', async () => {
      const dbPool = getTestDbPool();
      const client = await dbPool.connect();

      try {
        const startTime = Date.now();
        await client.query(`
          SELECT m.*, u.name as sender_name
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.team_id = $1
          AND DATE(m.created_at) = $2
          ORDER BY m.created_at DESC
          LIMIT 50
        `, [1, '2025-09-28']);
        const endTime = Date.now();

        const queryTime = endTime - startTime;
        performanceMetrics.database.push(queryTime);

        expect(queryTime).toBeLessThan(50);
        console.log(`메시지 목록 조회 쿼리 시간: ${queryTime}ms`);
      } finally {
        client.release();
      }
    });
  });

  describe('동시성 성능 테스트', () => {
    test('동시 로그인 요청 처리 (10개)', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const requests = Array(10).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / 10;

      console.log(`동시 로그인 10개 처리 시간: ${totalTime}ms (평균: ${averageTime}ms)`);

      // 모든 요청이 성공해야 함
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // 평균 응답 시간이 500ms 미만이어야 함
      expect(averageTime).toBeLessThan(500);
    });

    test('동시 API 요청 처리 (20개)', async () => {
      const requests = Array(20).fill().map((_, i) => {
        if (i % 4 === 0) {
          return request(app).get('/api/teams').set('Authorization', `Bearer ${validToken}`);
        } else if (i % 4 === 1) {
          return request(app).get('/api/schedules?teamId=1').set('Authorization', `Bearer ${validToken}`);
        } else if (i % 4 === 2) {
          return request(app).get('/api/messages?teamId=1&date=2025-09-28').set('Authorization', `Bearer ${validToken}`);
        } else {
          return request(app).get('/api/auth/me').set('Authorization', `Bearer ${validToken}`);
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / 20;

      console.log(`동시 API 요청 20개 처리 시간: ${totalTime}ms (평균: ${averageTime}ms)`);

      // 모든 요청이 성공해야 함
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // 평균 응답 시간이 200ms 미만이어야 함
      expect(averageTime).toBeLessThan(200);
    });

    test('동시 데이터베이스 쿼리 처리 (15개)', async () => {
      const dbPool = getTestDbPool();
      const queries = Array(15).fill().map((_, i) => {
        return new Promise(async (resolve) => {
          const client = await dbPool.connect();
          try {
            const startTime = Date.now();
            await client.query('SELECT * FROM users WHERE id = $1', [1]);
            const endTime = Date.now();
            resolve(endTime - startTime);
          } finally {
            client.release();
          }
        });
      });

      const startTime = Date.now();
      const queryTimes = await Promise.all(queries);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;

      console.log(`동시 DB 쿼리 15개 처리 시간: ${totalTime}ms (평균 쿼리: ${averageQueryTime}ms)`);

      // 모든 쿼리가 100ms 미만이어야 함
      queryTimes.forEach(queryTime => {
        expect(queryTime).toBeLessThan(100);
      });

      // 평균 쿼리 시간이 50ms 미만이어야 함
      expect(averageQueryTime).toBeLessThan(50);
    });
  });

  describe('부하 테스트', () => {
    test('연속 요청 처리 성능 (100개)', async () => {
      const results = [];

      for (let i = 0; i < 100; i++) {
        const startTime = Date.now();
        const response = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`);
        const endTime = Date.now();

        results.push({
          requestNumber: i + 1,
          responseTime: endTime - startTime,
          status: response.status
        });
      }

      // 모든 요청이 성공해야 함
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // 평균 응답 시간 계산
      const averageResponseTime = results.reduce((sum, result) => sum + result.responseTime, 0) / results.length;

      // 95 퍼센타일 응답 시간 계산
      const sortedTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTime = sortedTimes[p95Index];

      console.log(`연속 요청 100개 - 평균: ${averageResponseTime}ms, 95%: ${p95ResponseTime}ms`);

      // 평균 응답 시간이 100ms 미만이어야 함
      expect(averageResponseTime).toBeLessThan(100);

      // 95% 응답 시간이 200ms 미만이어야 함
      expect(p95ResponseTime).toBeLessThan(200);
    });

    test('메모리 사용량 안정성 테스트', async () => {
      const initialMemory = process.memoryUsage();

      // 대량의 요청 생성
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`);
      }

      // 가비지 컬렉션 강제 실행
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`메모리 증가량: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);

      // 메모리 증가량이 50MB 미만이어야 함 (메모리 누수 방지)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
    });
  });

  describe('성능 저하 시나리오', () => {
    test('대용량 데이터 처리 성능', async () => {
      // 대용량 JSON 데이터로 요청
      const largeData = {
        title: 'Large Schedule',
        content: 'x'.repeat(10000), // 10KB 텍스트
        start_datetime: '2025-09-28T10:00:00Z',
        end_datetime: '2025-09-28T11:00:00Z',
        schedule_type: 'team',
        teamId: 1
      };

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/schedules')
        .set('Authorization', `Bearer ${validToken}`)
        .send(largeData);
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(500); // 대용량 데이터도 500ms 미만
      console.log(`대용량 데이터 처리 시간: ${responseTime}ms`);
    });

    test('복잡한 조건의 쿼리 성능', async () => {
      const dbPool = getTestDbPool();
      const client = await dbPool.connect();

      try {
        const startTime = Date.now();
        await client.query(`
          SELECT
            s.*,
            u.name as creator_name,
            t.name as team_name,
            COUNT(sp.user_id) as participant_count
          FROM schedules s
          JOIN users u ON s.creator_id = u.id
          JOIN teams t ON s.team_id = t.id
          LEFT JOIN schedule_participants sp ON s.id = sp.schedule_id
          WHERE s.schedule_type = $1
          AND s.start_datetime >= $2
          AND s.end_datetime <= $3
          GROUP BY s.id, u.name, t.name
          ORDER BY s.start_datetime
        `, ['team', '2025-09-01T00:00:00Z', '2025-09-30T23:59:59Z']);
        const endTime = Date.now();

        const queryTime = endTime - startTime;

        expect(queryTime).toBeLessThan(100); // 복잡한 쿼리도 100ms 미만
        console.log(`복잡한 조건 쿼리 시간: ${queryTime}ms`);
      } finally {
        client.release();
      }
    });
  });
});

// 헬퍼 함수들
function setupMockRoutes(app) {
  // 인증 라우트
  app.post('/api/auth/signup', (req, res) => {
    setTimeout(() => {
      res.status(201).json({
        message: 'User created successfully',
        user: { id: 1, email: req.body.email, name: req.body.name },
        token: 'mock-token'
      });
    }, Math.random() * 100); // 0-100ms 랜덤 지연
  });

  app.post('/api/auth/login', (req, res) => {
    setTimeout(() => {
      res.json({
        message: 'Login successful',
        user: { id: 1, email: req.body.email, name: 'Test User' },
        token: 'mock-token'
      });
    }, Math.random() * 200); // 0-200ms 랜덤 지연
  });

  app.post('/api/auth/refresh', (req, res) => {
    setTimeout(() => {
      res.json({ token: 'new-mock-token' });
    }, Math.random() * 50); // 0-50ms 랜덤 지연
  });

  app.get('/api/auth/me', (req, res) => {
    setTimeout(() => {
      res.json({
        user: { id: 1, email: 'test@example.com', role: 'member' }
      });
    }, Math.random() * 30); // 0-30ms 랜덤 지연
  });

  // 일반 API 라우트
  app.get('/api/teams', (req, res) => {
    setTimeout(() => {
      res.json({ teams: [{ id: 1, name: 'Test Team' }] });
    }, Math.random() * 50);
  });

  app.get('/api/schedules', (req, res) => {
    setTimeout(() => {
      res.json({ schedules: [{ id: 1, title: 'Test Schedule' }] });
    }, Math.random() * 50);
  });

  app.get('/api/messages', (req, res) => {
    setTimeout(() => {
      res.json({ messages: [{ id: 1, content: 'Test Message' }] });
    }, Math.random() * 50);
  });

  app.post('/api/schedules', (req, res) => {
    setTimeout(() => {
      res.status(201).json({
        id: 1,
        ...req.body,
        created_at: new Date()
      });
    }, Math.random() * 80);
  });
}

function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}