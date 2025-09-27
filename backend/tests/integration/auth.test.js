const request = require('supertest');
const { createApp } = require('../../src/app');
const db = require('../../src/config/database');

describe('Auth Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await db.initialize();
    app = await createApp();
  });

  afterAll(async () => {
    await db.close();
  });

  afterEach(async () => {
    // 테스트 후 사용자 데이터 정리
    await db.query('DELETE FROM team_members');
    await db.query('DELETE FROM teams');
    await db.query('DELETE FROM users');
  });

  describe('POST /api/v1/auth/register', () => {
    test('유효한 데이터로 회원가입이 성공해야 한다', async () => {
      const userData = {
        email: 'test@example.com',
        name: '테스트 사용자',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('회원가입이 완료되었습니다');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('이미 존재하는 이메일로 회원가입이 실패해야 한다', async () => {
      const userData = {
        email: 'test@example.com',
        name: '테스트 사용자',
        password: 'password123',
      };

      // 첫 번째 사용자 생성
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // 같은 이메일로 다시 생성 시도
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('이미 등록된 이메일입니다');
    });

    test('유효하지 않은 이메일 형식으로 회원가입이 실패해야 한다', async () => {
      const userData = {
        email: 'invalid-email',
        name: '테스트 사용자',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('짧은 비밀번호로 회원가입이 실패해야 한다', async () => {
      const userData = {
        email: 'test@example.com',
        name: '테스트 사용자',
        password: '123',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // 테스트용 사용자 생성
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          name: '테스트 사용자',
          password: 'password123',
        });
    });

    test('유효한 자격증명으로 로그인이 성공해야 한다', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('로그인이 완료되었습니다');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('잘못된 비밀번호로 로그인이 실패해야 한다', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
    });

    test('존재하지 않는 이메일로 로그인이 실패해야 한다', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('이메일 또는 비밀번호가 올바르지 않습니다');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken;

    beforeEach(async () => {
      // 테스트용 사용자 생성 및 로그인
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          name: '테스트 사용자',
          password: 'password123',
        });

      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    test('유효한 토큰으로 사용자 정보 조회가 성공해야 한다', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.name).toBe('테스트 사용자');
    });

    test('토큰 없이 사용자 정보 조회가 실패해야 한다', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_AUTH_HEADER');
    });

    test('유효하지 않은 토큰으로 사용자 정보 조회가 실패해야 한다', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // 테스트용 사용자 생성 및 로그인
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          name: '테스트 사용자',
          password: 'password123',
        });

      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    test('유효한 리프레시 토큰으로 토큰 갱신이 성공해야 한다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('토큰이 갱신되었습니다');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('유효하지 않은 리프레시 토큰으로 토큰 갱신이 실패해야 한다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('TOKEN_REFRESH_FAILED');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    let accessToken;

    beforeEach(async () => {
      // 테스트용 사용자 생성 및 로그인
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          name: '테스트 사용자',
          password: 'password123',
        });

      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    test('유효한 현재 비밀번호로 비밀번호 변경이 성공해야 한다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('비밀번호가 변경되었습니다');
    });

    test('잘못된 현재 비밀번호로 비밀번호 변경이 실패해야 한다', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('현재 비밀번호가 올바르지 않습니다');
    });
  });
});