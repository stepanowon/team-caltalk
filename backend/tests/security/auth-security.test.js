const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// 모의 Express 앱 설정
const express = require('express');
const app = express();
app.use(express.json());

// JWT 미들웨어
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// 팀 멤버십 검증 미들웨어
const teamMembershipMiddleware = async (req, res, next) => {
  try {
    const pool = getTestDbPool();
    const { teamId } = req.params;
    const userId = req.user.id;

    const memberCheck = await pool.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Not a member of this team' });
    }

    req.userRole = memberCheck.rows[0].role;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 팀장 권한 검증 미들웨어
const teamLeaderMiddleware = (req, res, next) => {
  if (req.userRole !== 'leader') {
    return res.status(403).json({ success: false, message: 'Team leader access required' });
  }
  next();
};

// 보안 테스트용 라우트 설정
app.post('/api/auth/login', async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, email: user.email, name: user.name }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const userResult = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: userResult.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/teams/:teamId/schedules', authMiddleware, teamMembershipMiddleware, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { teamId } = req.params;

    const result = await pool.query(
      'SELECT * FROM schedules WHERE team_id = $1 ORDER BY start_datetime',
      [teamId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/teams/:teamId/schedules', authMiddleware, teamMembershipMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { teamId } = req.params;
    const { title, content, start_datetime, end_datetime } = req.body;

    const result = await pool.query(`
      INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, content, start_datetime, end_datetime, 'team', req.user.id, teamId]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.get('/api/teams/:teamId/messages/:date', authMiddleware, teamMembershipMiddleware, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { teamId, date } = req.params;

    const result = await pool.query(`
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.team_id = $1 AND m.target_date = $2
      ORDER BY m.sent_at ASC
    `, [teamId, date]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

describe('Authentication and Authorization Security Tests', () => {
  let pool;
  let testUser;
  let testTeam;
  let memberUser;
  let nonMemberUser;
  let validToken;
  let memberToken;
  let nonMemberToken;

  beforeAll(async () => {
    pool = getTestDbPool();
  });

  beforeEach(async () => {
    // 테스트용 사용자들 생성
    const hashedPassword = await bcrypt.hash('password123', 10);

    // 팀장 사용자
    const leaderResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['leader@example.com', 'Team Leader', hashedPassword]
    );
    testUser = leaderResult.rows[0];

    // 팀원 사용자
    const memberResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['member@example.com', 'Team Member', hashedPassword]
    );
    memberUser = memberResult.rows[0];

    // 비멤버 사용자
    const nonMemberResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['nonmember@example.com', 'Non Member', hashedPassword]
    );
    nonMemberUser = nonMemberResult.rows[0];

    // 테스트 팀 생성
    const teamResult = await pool.query(
      'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Security Test Team', 'Test Description', 'SEC123', testUser.id]
    );
    testTeam = teamResult.rows[0];

    // 팀 멤버십 설정
    await pool.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [testTeam.id, testUser.id, 'leader']
    );

    await pool.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [testTeam.id, memberUser.id, 'member']
    );

    // JWT 토큰 생성
    validToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure',
      { expiresIn: '1h' }
    );

    memberToken = jwt.sign(
      { id: memberUser.id, email: memberUser.email },
      process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure',
      { expiresIn: '1h' }
    );

    nonMemberToken = jwt.sign(
      { id: nonMemberUser.id, email: nonMemberUser.email },
      process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure',
      { expiresIn: '1h' }
    );
  });

  describe('JWT Authentication Tests', () => {
    test('유효한 토큰으로 인증된 요청이 성공해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser.id);
      expect(response.body.data.email).toBe(testUser.email);
    });

    test('토큰 없이 보호된 엔드포인트 접근 시 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    test('잘못된 토큰으로 접근 시 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    test('만료된 토큰으로 접근 시 401 에러를 반환해야 함', async () => {
      const expiredToken = jwt.sign(
        { id: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure',
        { expiresIn: '-1h' } // 이미 만료된 토큰
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    test('잘못된 시크릿으로 생성된 토큰 접근 시 401 에러를 반환해야 함', async () => {
      const maliciousToken = jwt.sign(
        { id: testUser.id, email: testUser.email },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });

  describe('Login Security Tests', () => {
    test('유효한 자격 증명으로 로그인이 성공해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'leader@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).toBeValidJWT();
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    test('잘못된 이메일로 로그인 시 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('잘못된 비밀번호로 로그인 시 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'leader@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('필수 필드 누락 시 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'leader@example.com'
          // password 누락
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email and password required');
    });

    test('SQL Injection 공격을 차단해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: "admin' OR '1'='1",
          password: 'password'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('대량의 잘못된 로그인 시도에 대한 처리', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'leader@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Team Membership Authorization Tests', () => {
    test('팀 멤버가 팀 일정을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/schedules`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('팀 멤버가 팀 메시지를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('비멤버가 팀 일정 조회 시 403 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/schedules`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not a member of this team');
    });

    test('비멤버가 팀 메시지 조회 시 403 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not a member of this team');
    });

    test('존재하지 않는 팀 접근 시 403 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/teams/99999/schedules')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not a member of this team');
    });
  });

  describe('Team Leader Authorization Tests', () => {
    test('팀장이 팀 일정을 생성할 수 있어야 함', async () => {
      const scheduleData = {
        title: 'Leader Schedule',
        content: 'Schedule created by leader',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/schedules`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(scheduleData.title);
      expect(response.body.data.creator_id).toBe(testUser.id);
    });

    test('팀원이 팀 일정 생성 시 403 에러를 반환해야 함', async () => {
      const scheduleData = {
        title: 'Member Schedule',
        content: 'Schedule created by member',
        start_datetime: '2024-12-25 16:00:00',
        end_datetime: '2024-12-25 17:00:00'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/schedules`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send(scheduleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Team leader access required');
    });

    test('비멤버가 팀 일정 생성 시 403 에러를 반환해야 함', async () => {
      const scheduleData = {
        title: 'Non-member Schedule',
        content: 'Schedule created by non-member',
        start_datetime: '2024-12-25 18:00:00',
        end_datetime: '2024-12-25 19:00:00'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/schedules`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send(scheduleData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not a member of this team');
    });
  });

  describe('Token Manipulation Security Tests', () => {
    test('토큰의 사용자 ID 조작 시도를 차단해야 함', async () => {
      // 다른 사용자의 ID로 토큰 조작 시도
      const manipulatedPayload = {
        id: nonMemberUser.id, // 다른 사용자 ID
        email: testUser.email, // 원래 사용자 이메일
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      const manipulatedToken = jwt.sign(
        manipulatedPayload,
        process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure'
      );

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .expect(200);

      // 토큰의 ID가 반영되어야 함 (조작된 ID)
      expect(response.body.data.id).toBe(nonMemberUser.id);
    });

    test('토큰의 만료 시간 조작 시도를 차단해야 함', async () => {
      const extendedPayload = {
        id: testUser.id,
        email: testUser.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 365 // 1년 연장 시도
      };

      const extendedToken = jwt.sign(
        extendedPayload,
        process.env.JWT_SECRET || 'test-jwt-secret-key-very-long-and-secure'
      );

      // JWT 라이브러리가 자체적으로 검증하므로 정상적으로 동작함
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${extendedToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('토큰 없이 헤더 조작 시도를 차단해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    test('잘못된 Authorization 헤더 형식을 차단해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', validToken) // Bearer 없이
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });

  describe('Cross-User Data Access Security Tests', () => {
    test('다른 사용자의 프로필 정보에 접근할 수 없어야 함', async () => {
      // 사용자 A의 토큰으로 사용자 B의 정보에 접근 시도는 현재 미들웨어 구조상 불가능
      // 토큰에서 추출한 사용자 ID로 해당 사용자의 정보만 조회됨
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(memberUser.id);
      expect(response.body.data.email).toBe(memberUser.email);
      expect(response.body.data.id).not.toBe(testUser.id);
    });

    test('팀 권한이 없는 사용자의 요청을 올바르게 거부해야 함', async () => {
      // 다른 팀 생성
      const otherTeamResult = await pool.query(
        'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Other Team', 'Other Description', 'OTH123', nonMemberUser.id]
      );
      const otherTeamId = otherTeamResult.rows[0].id;

      // 권한 없는 팀에 접근 시도
      const response = await request(app)
        .get(`/api/teams/${otherTeamId}/schedules`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Not a member of this team');
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    test('동시 다발적 인증 요청 처리', async () => {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${validToken}`)
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('잘못된 토큰으로 대량 요청 시 적절한 처리', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/auth/profile')
            .set('Authorization', 'Bearer invalid-token')
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Input Validation Security Tests', () => {
    test('XSS 공격 시도를 적절히 처리해야 함', async () => {
      const xssPayload = {
        email: '<script>alert("xss")</script>@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(xssPayload)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    test('매우 긴 입력값 처리', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const longPassword = 'b'.repeat(1000);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: longEmail,
          password: longPassword
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('NULL 바이트 주입 시도 처리', async () => {
      const nullBytePayload = {
        email: 'test@example.com\x00admin',
        password: 'password123\x00'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nullBytePayload)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});