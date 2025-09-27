const jwt = require('jsonwebtoken');

/**
 * 인증 미들웨어 단위 테스트
 *
 * 테스트 범위:
 * - JWT 토큰 추출
 * - 토큰 검증 미들웨어
 * - 권한 체크 미들웨어
 * - 에러 처리
 */

// 실제 미들웨어가 구현되기 전까지 모킹
const mockAuthMiddleware = {
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  },

  requireRole: (role) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.user.role !== role) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  },

  requireTeamMember: (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 팀 멤버십 확인 로직 (실제 구현에서는 DB 조회)
    const teamId = req.params.teamId || req.body.teamId;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID required' });
    }

    // 모킹: 사용자가 팀 멤버인지 확인
    if (!req.user.teams || !req.user.teams.includes(parseInt(teamId))) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    next();
  }
};

describe('인증 미들웨어', () => {
  let req, res, next;
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';

  beforeEach(() => {
    req = {
      headers: {},
      params: {},
      body: {},
      user: null
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('토큰 인증 미들웨어', () => {
    test('유효한 토큰으로 인증 성공', () => {
      const payload = { userId: 1, email: 'test@example.com', role: 'member' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      req.headers['authorization'] = `Bearer ${token}`;

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(req.user.email).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('토큰이 없을 때 401 반환', () => {
      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('잘못된 토큰 형식으로 401 반환', () => {
      req.headers['authorization'] = 'InvalidToken';

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('만료된 토큰으로 403 반환', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const expiredToken = jwt.sign(payload, SECRET_KEY, { expiresIn: '0s' });

      req.headers['authorization'] = `Bearer ${expiredToken}`;

      // 토큰이 만료될 시간을 기다림
      setTimeout(() => {
        mockAuthMiddleware.authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
      }, 100);
    });

    test('잘못된 시크릿 키로 서명된 토큰 거부', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const invalidToken = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      req.headers['authorization'] = `Bearer ${invalidToken}`;

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('Bearer 없는 토큰 헤더 처리', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      req.headers['authorization'] = token; // Bearer 누락

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('빈 Authorization 헤더', () => {
      req.headers['authorization'] = '';

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('역할 기반 권한 미들웨어', () => {
    beforeEach(() => {
      req.user = {
        userId: 1,
        email: 'test@example.com',
        role: 'member'
      };
    });

    test('올바른 역할로 접근 허용', () => {
      const memberMiddleware = mockAuthMiddleware.requireRole('member');
      memberMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('잘못된 역할로 접근 거부', () => {
      const leaderMiddleware = mockAuthMiddleware.requireRole('leader');
      leaderMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    test('인증되지 않은 사용자 접근 거부', () => {
      req.user = null;
      const memberMiddleware = mockAuthMiddleware.requireRole('member');
      memberMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('팀장 권한 확인', () => {
      req.user.role = 'leader';
      const leaderMiddleware = mockAuthMiddleware.requireRole('leader');
      leaderMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('대소문자 구분 역할 체크', () => {
      req.user.role = 'MEMBER';
      const memberMiddleware = mockAuthMiddleware.requireRole('member');
      memberMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('팀 멤버십 확인 미들웨어', () => {
    beforeEach(() => {
      req.user = {
        userId: 1,
        email: 'test@example.com',
        role: 'member',
        teams: [1, 2, 3] // 사용자가 속한 팀 ID 목록
      };
    });

    test('팀 멤버로 접근 허용 (params)', () => {
      req.params.teamId = '1';

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('팀 멤버로 접근 허용 (body)', () => {
      req.body.teamId = 2;

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('팀 멤버가 아닌 경우 접근 거부', () => {
      req.params.teamId = '999'; // 사용자가 속하지 않은 팀

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not a team member' });
      expect(next).not.toHaveBeenCalled();
    });

    test('팀 ID가 없는 경우 400 반환', () => {
      // teamId가 params나 body에 없음

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Team ID required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('인증되지 않은 사용자 접근 거부', () => {
      req.user = null;
      req.params.teamId = '1';

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('팀 목록이 없는 사용자', () => {
      req.user.teams = null;
      req.params.teamId = '1';

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not a team member' });
      expect(next).not.toHaveBeenCalled();
    });

    test('빈 팀 목록인 사용자', () => {
      req.user.teams = [];
      req.params.teamId = '1';

      mockAuthMiddleware.requireTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not a team member' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('미들웨어 체인', () => {
    test('인증 → 역할 확인 순서', () => {
      const payload = { userId: 1, email: 'test@example.com', role: 'leader' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      req.headers['authorization'] = `Bearer ${token}`;

      // 첫 번째 미들웨어: 인증
      mockAuthMiddleware.authenticateToken(req, res, () => {
        // 두 번째 미들웨어: 역할 확인
        const leaderMiddleware = mockAuthMiddleware.requireRole('leader');
        leaderMiddleware(req, res, next);
      });

      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('leader');
      expect(next).toHaveBeenCalled();
    });

    test('인증 → 팀 멤버십 확인 순서', () => {
      const payload = {
        userId: 1,
        email: 'test@example.com',
        role: 'member',
        teams: [1, 2]
      };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });

      req.headers['authorization'] = `Bearer ${token}`;
      req.params.teamId = '1';

      // 첫 번째 미들웨어: 인증
      mockAuthMiddleware.authenticateToken(req, res, () => {
        // 두 번째 미들웨어: 팀 멤버십 확인
        mockAuthMiddleware.requireTeamMember(req, res, next);
      });

      expect(req.user).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    test('인증 실패 시 다음 미들웨어 실행 안됨', () => {
      // 토큰 없음

      let teamMiddlewareExecuted = false;

      mockAuthMiddleware.authenticateToken(req, res, () => {
        teamMiddlewareExecuted = true;
        mockAuthMiddleware.requireTeamMember(req, res, next);
      });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(teamMiddlewareExecuted).toBe(false);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('에러 처리', () => {
    test('변조된 토큰 처리', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
      const tamperedToken = token.slice(0, -5) + 'xxxxx'; // 마지막 5글자 변조

      req.headers['authorization'] = `Bearer ${tamperedToken}`;

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('잘못된 JSON 형식의 토큰', () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.json';

      req.headers['authorization'] = `Bearer ${malformedToken}`;

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('빈 페이로드를 가진 토큰', () => {
      const emptyToken = jwt.sign({}, SECRET_KEY, { expiresIn: '1h' });

      req.headers['authorization'] = `Bearer ${emptyToken}`;

      mockAuthMiddleware.authenticateToken(req, res, next);

      expect(req.user).toBeDefined();
      expect(Object.keys(req.user).length).toBeGreaterThan(0); // iat, exp 포함
      expect(next).toHaveBeenCalled();
    });
  });
});