const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 유틸리티 단위 테스트
 *
 * 테스트 범위:
 * - JWT 토큰 생성
 * - JWT 토큰 검증
 * - 토큰 만료 처리
 * - 에러 처리
 */

describe('JWT 토큰 유틸리티', () => {
  const SECRET_KEY = process.env.JWT_SECRET || 'test-secret-key';
  const testPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'member'
  };

  describe('토큰 생성', () => {
    test('유효한 페이로드로 토큰 생성', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1h' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toBeValidJWT();
      expect(token.split('.')).toHaveLength(3); // header.payload.signature
    });

    test('만료 시간이 설정된 토큰 생성', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '30m' });
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp - decoded.iat).toBe(30 * 60); // 30분
    });

    test('알고리즘 지정 토큰 생성', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, {
        algorithm: 'HS256',
        expiresIn: '1h'
      });

      const decoded = jwt.decode(token, { complete: true });
      expect(decoded.header.alg).toBe('HS256');
    });

    test('추가 클레임이 포함된 토큰', () => {
      const extendedPayload = {
        ...testPayload,
        teamId: 1,
        permissions: ['read', 'write']
      };

      const token = jwt.sign(extendedPayload, SECRET_KEY, { expiresIn: '1h' });
      const decoded = jwt.decode(token);

      expect(decoded.userId).toBe(1);
      expect(decoded.teamId).toBe(1);
      expect(decoded.permissions).toEqual(['read', 'write']);
    });

    test('빈 페이로드 처리', () => {
      const token = jwt.sign({}, SECRET_KEY, { expiresIn: '1h' });
      expect(token).toBeDefined();

      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('토큰 검증', () => {
    let validToken;

    beforeEach(() => {
      validToken = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1h' });
    });

    test('유효한 토큰 검증 성공', () => {
      const decoded = jwt.verify(validToken, SECRET_KEY);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    test('잘못된 시크릿 키로 검증 실패', () => {
      expect(() => {
        jwt.verify(validToken, 'wrong-secret-key');
      }).toThrow('invalid signature');
    });

    test('변조된 토큰 검증 실패', () => {
      const parts = validToken.split('.');
      const tamperedToken = parts[0] + '.tampered.' + parts[2];

      expect(() => {
        jwt.verify(tamperedToken, SECRET_KEY);
      }).toThrow();
    });

    test('잘못된 형식의 토큰', () => {
      const invalidTokens = [
        'invalid.token',
        'not.a.valid.jwt.token',
        '',
        null,
        undefined
      ];

      invalidTokens.forEach(invalidToken => {
        expect(() => {
          jwt.verify(invalidToken, SECRET_KEY);
        }).toThrow();
      });
    });

    test('만료된 토큰 검증 실패', () => {
      const expiredToken = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '0s' });

      // 토큰이 만료될 시간을 기다림
      return new Promise(resolve => {
        setTimeout(() => {
          expect(() => {
            jwt.verify(expiredToken, SECRET_KEY);
          }).toThrow('jwt expired');
          resolve();
        }, 1000);
      });
    });

    test('알고리즘 불일치 검증 실패', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { algorithm: 'HS512' });

      expect(() => {
        jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
      }).toThrow('invalid algorithm');
    });
  });

  describe('토큰 디코딩', () => {
    let token;

    beforeEach(() => {
      token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1h' });
    });

    test('검증 없이 토큰 디코딩', () => {
      const decoded = jwt.decode(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    test('완전한 토큰 정보 디코딩', () => {
      const decoded = jwt.decode(token, { complete: true });

      expect(decoded.header).toBeDefined();
      expect(decoded.payload).toBeDefined();
      expect(decoded.signature).toBeDefined();
      expect(decoded.header.alg).toBe('HS256');
      expect(decoded.header.typ).toBe('JWT');
    });

    test('JSON 형태로 디코딩', () => {
      const decoded = jwt.decode(token, { json: true });

      expect(typeof decoded).toBe('object');
      expect(decoded.userId).toBe(testPayload.userId);
    });
  });

  describe('보안 및 성능', () => {
    test('토큰 생성 성능 (< 10ms)', () => {
      const startTime = process.hrtime.bigint();
      jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1h' });
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000; // 나노초를 밀리초로 변환
      expect(executionTime).toBeLessThan(10);
    });

    test('토큰 검증 성능 (< 10ms)', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1h' });

      const startTime = process.hrtime.bigint();
      jwt.verify(token, SECRET_KEY);
      const endTime = process.hrtime.bigint();

      const executionTime = Number(endTime - startTime) / 1000000;
      expect(executionTime).toBeLessThan(10);
    });

    test('대용량 페이로드 처리', () => {
      const largePayload = {
        ...testPayload,
        data: 'x'.repeat(1000) // 1KB 데이터
      };

      const token = jwt.sign(largePayload, SECRET_KEY, { expiresIn: '1h' });
      const decoded = jwt.verify(token, SECRET_KEY);

      expect(decoded.data).toBe(largePayload.data);
    });

    test('강력한 시크릿 키 요구사항', () => {
      const weakSecrets = ['123', 'abc', 'password'];

      weakSecrets.forEach(weakSecret => {
        // 약한 시크릿 키로도 토큰은 생성되지만, 보안상 권장하지 않음
        const token = jwt.sign(testPayload, weakSecret, { expiresIn: '1h' });
        expect(token).toBeDefined();

        // 검증은 여전히 작동함
        const decoded = jwt.verify(token, weakSecret);
        expect(decoded.userId).toBe(testPayload.userId);
      });
    });
  });

  describe('동시성 테스트', () => {
    test('동시 토큰 생성', async () => {
      const promises = Array(100).fill().map((_, i) =>
        jwt.sign({ ...testPayload, id: i }, SECRET_KEY, { expiresIn: '1h' })
      );

      const tokens = await Promise.all(promises);

      // 모든 토큰이 생성되어야 함
      expect(tokens).toHaveLength(100);
      tokens.forEach(token => {
        expect(token).toBeDefined();
        expect(token).toBeValidJWT();
      });

      // 모든 토큰이 서로 달라야 함
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(100);
    });

    test('동시 토큰 검증', async () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1h' });

      const promises = Array(50).fill().map(() =>
        jwt.verify(token, SECRET_KEY)
      );

      const results = await Promise.all(promises);

      // 모든 검증이 성공해야 함
      expect(results).toHaveLength(50);
      results.forEach(decoded => {
        expect(decoded.userId).toBe(testPayload.userId);
        expect(decoded.email).toBe(testPayload.email);
      });
    });
  });

  describe('에지 케이스', () => {
    test('null/undefined 페이로드', () => {
      expect(() => {
        jwt.sign(null, SECRET_KEY);
      }).toThrow();

      expect(() => {
        jwt.sign(undefined, SECRET_KEY);
      }).toThrow();
    });

    test('순환 참조가 있는 페이로드', () => {
      const circularPayload = { userId: 1 };
      circularPayload.self = circularPayload;

      expect(() => {
        jwt.sign(circularPayload, SECRET_KEY);
      }).toThrow();
    });

    test('매우 짧은 만료 시간', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '1ms' });
      expect(token).toBeDefined();

      // 즉시 만료되어야 함
      setTimeout(() => {
        expect(() => {
          jwt.verify(token, SECRET_KEY);
        }).toThrow('jwt expired');
      }, 10);
    });

    test('매우 긴 만료 시간', () => {
      const token = jwt.sign(testPayload, SECRET_KEY, { expiresIn: '100y' });
      const decoded = jwt.decode(token);

      // 100년 후 만료
      const currentTime = Math.floor(Date.now() / 1000);
      const expectedExpiry = currentTime + (100 * 365 * 24 * 60 * 60);

      expect(decoded.exp).toBeCloseTo(expectedExpiry, -2); // 100초 오차 허용
    });

    test('음수 만료 시간', () => {
      expect(() => {
        jwt.sign(testPayload, SECRET_KEY, { expiresIn: '-1h' });
      }).toThrow();
    });

    test('잘못된 만료 시간 형식', () => {
      const invalidExpiresIn = ['invalid', '', null, undefined, {}];

      invalidExpiresIn.forEach(expires => {
        expect(() => {
          jwt.sign(testPayload, SECRET_KEY, { expiresIn: expires });
        }).toThrow();
      });
    });
  });
});