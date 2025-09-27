const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * 인증 API 통합 테스트
 *
 * 테스트 범위:
 * - 회원가입 API
 * - 로그인 API
 * - 토큰 갱신 API
 * - 로그아웃 API
 * - 인증이 필요한 엔드포인트
 */

describe('인증 API 통합 테스트', () => {
  let app;
  let server;
  let testUser;

  beforeAll(async () => {
    // Express 앱 초기화 (실제 구현 시 app.js 임포트)
    const express = require('express');
    app = express();
    app.use(express.json());

    // 모킹된 인증 라우트
    app.post('/api/auth/signup', async (req, res) => {
      const { email, name, password } = req.body;

      // 입력 유효성 검사
      if (!email || !name || !password) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      if (name.length < 2 || name.length > 30) {
        return res.status(400).json({ error: 'Name must be between 2 and 30 characters' });
      }

      // 이메일 중복 확인 (모킹)
      if (email === 'existing@example.com') {
        return res.status(409).json({ error: 'Email already exists' });
      }

      // 사용자 생성 (모킹)
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = {
        id: Math.floor(Math.random() * 1000) + 1,
        email,
        name,
        created_at: new Date()
      };

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User created successfully',
        user,
        token
      });
    });

    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // 사용자 조회 (모킹)
      const mockUsers = {
        'test@example.com': {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          password_hash: await bcrypt.hash('password123', 10)
        }
      };

      const user = mockUsers[email];
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        user: { id: user.id, email: user.email, name: user.name },
        token
      });
    });

    app.post('/api/auth/refresh', (req, res) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const newToken = jwt.sign(
          { userId: decoded.userId, email: decoded.email, role: decoded.role },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        res.json({ token: newToken });
      } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
      }
    });

    app.post('/api/auth/logout', (req, res) => {
      // 실제 구현에서는 토큰 블랙리스트 처리
      res.json({ message: 'Logout successful' });
    });

    // 보호된 라우트 예시
    app.get('/api/auth/me', (req, res) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Token required' });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role
          }
        });
      } catch (error) {
        res.status(403).json({ error: 'Invalid token' });
      }
    });

    server = app.listen(0); // 랜덤 포트 사용
  });

  beforeEach(async () => {
    // 테스트용 사용자 생성
    testUser = await createTestUser({
      email: 'integration@example.com',
      name: 'Integration Test User',
      password: 'password123'
    });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/auth/signup', () => {
    test('유효한 데이터로 회원가입 성공', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User created successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.token).toBeValidJWT();

      // 비밀번호가 응답에 포함되지 않아야 함
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test('필수 필드 누락 시 400 에러', async () => {
      const incompleteData = {
        email: 'incomplete@example.com',
        name: 'Incomplete User'
        // password 누락
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('All fields are required');
    });

    test('짧은 비밀번호로 400 에러', async () => {
      const userData = {
        email: 'short@example.com',
        name: 'Short Password',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    test('잘못된 이름 길이로 400 에러', async () => {
      const shortNameData = {
        email: 'shortname@example.com',
        name: 'A',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(shortNameData)
        .expect(400);

      expect(response.body.error).toBe('Name must be between 2 and 30 characters');
    });

    test('중복 이메일로 409 에러', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('Email already exists');
    });

    test('잘못된 JSON 형식으로 400 에러', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send('invalid json')
        .expect(400);
    });

    test('빈 요청 바디로 400 에러', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('All fields are required');
    });
  });

  describe('POST /api/auth/login', () => {
    test('유효한 자격증명으로 로그인 성공', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.token).toBeValidJWT();

      // 비밀번호가 응답에 포함되지 않아야 함
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test('잘못된 이메일로 401 에러', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('잘못된 비밀번호로 401 에러', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    test('이메일 누락으로 400 에러', async () => {
      const loginData = {
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });

    test('비밀번호 누락으로 400 에러', async () => {
      const loginData = {
        email: 'test@example.com'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });

    test('빈 문자열 필드로 400 에러', async () => {
      const loginData = {
        email: '',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let validToken;

    beforeEach(async () => {
      // 유효한 토큰 생성
      validToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('유효한 토큰으로 갱신 성공', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.token).toBeValidJWT();
      expect(response.body.token).not.toBe(validToken); // 새로운 토큰이어야 함

      // 새 토큰 검증
      const decoded = jwt.decode(response.body.token);
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
    });

    test('토큰 없이 요청 시 401 에러', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.error).toBe('Token required');
    });

    test('잘못된 토큰으로 403 에러', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid token');
    });

    test('만료된 토큰으로 403 에러', (done) => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '1ms' }
      );

      setTimeout(async () => {
        const response = await request(app)
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(403);

        expect(response.body.error).toBe('Invalid token');
        done();
      }, 100);
    });

    test('Bearer 없는 토큰 헤더로 401 에러', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', validToken) // Bearer 누락
        .expect(401);

      expect(response.body.error).toBe('Token required');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('로그아웃 성공', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    test('토큰 없이도 로그아웃 가능', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/auth/me (보호된 라우트)', () => {
    let validToken;

    beforeEach(async () => {
      validToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    test('유효한 토큰으로 사용자 정보 조회 성공', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(1);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('member');
    });

    test('토큰 없이 요청 시 401 에러', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Token required');
    });

    test('잘못된 토큰으로 403 에러', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('성능 테스트', () => {
    test('회원가입 API 응답 시간 (< 500ms)', async () => {
      const userData = {
        email: 'performance@example.com',
        name: 'Performance User',
        password: 'password123'
      };

      const startTime = Date.now();
      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    test('로그인 API 응답 시간 (< 500ms)', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const startTime = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
    });

    test('토큰 갱신 API 응답 시간 (< 100ms)', async () => {
      const validToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const startTime = Date.now();
      await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('동시성 테스트', () => {
    test('동시 회원가입 요청 처리', async () => {
      const requests = Array(10).fill().map((_, i) =>
        request(app)
          .post('/api/auth/signup')
          .send({
            email: `concurrent${i}@example.com`,
            name: `Concurrent User ${i}`,
            password: 'password123'
          })
      );

      const responses = await Promise.all(requests);

      // 모든 요청이 성공해야 함
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.token).toBeValidJWT();
      });

      // 모든 토큰이 서로 달라야 함
      const tokens = responses.map(r => r.body.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(10);
    });

    test('동시 로그인 요청 처리', async () => {
      const requests = Array(5).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          })
      );

      const responses = await Promise.all(requests);

      // 모든 요청이 성공해야 함
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.token).toBeValidJWT();
      });
    });
  });

  describe('보안 테스트', () => {
    test('SQL Injection 시도 차단', async () => {
      const maliciousData = {
        email: "'; DROP TABLE users; --",
        name: 'Malicious User',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(maliciousData);

      // 실제 구현에서는 입력 검증으로 차단되어야 함
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('XSS 시도 차단', async () => {
      const xssData = {
        email: 'xss@example.com',
        name: '<script>alert("xss")</script>',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(xssData);

      if (response.status === 201) {
        // XSS 스크립트가 그대로 저장되지 않아야 함
        expect(response.body.user.name).not.toContain('<script>');
      }
    });

    test('토큰 변조 시도 차단', async () => {
      const validToken = jwt.sign(
        { userId: 1, email: 'test@example.com', role: 'member' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // 토큰 변조
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(403);

      expect(response.body.error).toBe('Invalid token');
    });
  });
});