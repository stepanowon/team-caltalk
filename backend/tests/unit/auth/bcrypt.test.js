const bcrypt = require('bcrypt');

/**
 * bcrypt 암호화 유틸리티 단위 테스트
 *
 * 테스트 범위:
 * - 비밀번호 해싱
 * - 비밀번호 검증
 * - 솔트 라운드 적용
 * - 에러 처리
 */

describe('Bcrypt 암호화 유틸리티', () => {
  const testPassword = 'testPassword123!';
  const wrongPassword = 'wrongPassword456';
  const saltRounds = 10;

  describe('비밀번호 해싱', () => {
    test('올바른 비밀번호가 해싱되어야 함', async () => {
      const hashedPassword = await bcrypt.hash(testPassword, saltRounds);

      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).toHaveLength(60); // bcrypt 해시 길이
      expect(hashedPassword.startsWith('$2b$')).toBe(true);
    });

    test('같은 비밀번호도 매번 다른 해시를 생성해야 함', async () => {
      const hash1 = await bcrypt.hash(testPassword, saltRounds);
      const hash2 = await bcrypt.hash(testPassword, saltRounds);

      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(60);
      expect(hash2).toHaveLength(60);
    });

    test('빈 비밀번호 처리', async () => {
      await expect(bcrypt.hash('', saltRounds)).rejects.toThrow();
    });

    test('null/undefined 비밀번호 처리', async () => {
      await expect(bcrypt.hash(null, saltRounds)).rejects.toThrow();
      await expect(bcrypt.hash(undefined, saltRounds)).rejects.toThrow();
    });

    test('잘못된 솔트 라운드 처리', async () => {
      await expect(bcrypt.hash(testPassword, -1)).rejects.toThrow();
      await expect(bcrypt.hash(testPassword, 'invalid')).rejects.toThrow();
    });
  });

  describe('비밀번호 검증', () => {
    let hashedPassword;

    beforeEach(async () => {
      hashedPassword = await bcrypt.hash(testPassword, saltRounds);
    });

    test('올바른 비밀번호 검증 성공', async () => {
      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('잘못된 비밀번호 검증 실패', async () => {
      const isValid = await bcrypt.compare(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    test('빈 비밀번호 검증 실패', async () => {
      const isValid = await bcrypt.compare('', hashedPassword);
      expect(isValid).toBe(false);
    });

    test('null/undefined 비밀번호 검증 처리', async () => {
      await expect(bcrypt.compare(null, hashedPassword)).rejects.toThrow();
      await expect(bcrypt.compare(undefined, hashedPassword)).rejects.toThrow();
    });

    test('잘못된 해시 형식 처리', async () => {
      await expect(bcrypt.compare(testPassword, 'invalid-hash')).rejects.toThrow();
      await expect(bcrypt.compare(testPassword, null)).rejects.toThrow();
    });

    test('대소문자 구분 검증', async () => {
      const upperCasePassword = testPassword.toUpperCase();
      const isValid = await bcrypt.compare(upperCasePassword, hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('성능 및 보안', () => {
    test('해싱 성능 테스트 (< 1초)', async () => {
      const startTime = Date.now();
      await bcrypt.hash(testPassword, saltRounds);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1초 미만
    });

    test('검증 성능 테스트 (< 1초)', async () => {
      const hashedPassword = await bcrypt.hash(testPassword, saltRounds);

      const startTime = Date.now();
      await bcrypt.compare(testPassword, hashedPassword);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1초 미만
    });

    test('솔트 라운드별 성능 차이', async () => {
      const rounds = [8, 10, 12];
      const results = [];

      for (const round of rounds) {
        const startTime = Date.now();
        await bcrypt.hash(testPassword, round);
        const endTime = Date.now();
        results.push(endTime - startTime);
      }

      // 솔트 라운드가 높을수록 시간이 더 걸려야 함
      expect(results[1]).toBeGreaterThan(results[0]);
      expect(results[2]).toBeGreaterThan(results[1]);
    });
  });

  describe('동시성 테스트', () => {
    test('동시 해싱 요청 처리', async () => {
      const promises = Array(10).fill().map((_, i) =>
        bcrypt.hash(`password${i}`, saltRounds)
      );

      const results = await Promise.all(promises);

      // 모든 해시가 성공적으로 생성되어야 함
      expect(results).toHaveLength(10);
      results.forEach(hash => {
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash).toHaveLength(60);
      });

      // 모든 해시가 서로 달라야 함
      const uniqueHashes = new Set(results);
      expect(uniqueHashes.size).toBe(10);
    });

    test('동시 검증 요청 처리', async () => {
      const hashedPassword = await bcrypt.hash(testPassword, saltRounds);

      const promises = Array(10).fill().map(() =>
        bcrypt.compare(testPassword, hashedPassword)
      );

      const results = await Promise.all(promises);

      // 모든 검증이 성공해야 함
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });
  });

  describe('에지 케이스', () => {
    test('매우 긴 비밀번호 처리', async () => {
      const longPassword = 'a'.repeat(200);
      const hashedPassword = await bcrypt.hash(longPassword, saltRounds);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).toHaveLength(60);

      const isValid = await bcrypt.compare(longPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('특수문자가 포함된 비밀번호', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await bcrypt.hash(specialPassword, saltRounds);

      expect(hashedPassword).toBeDefined();

      const isValid = await bcrypt.compare(specialPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('유니코드 문자가 포함된 비밀번호', async () => {
      const unicodePassword = '비밀번호123🔒';
      const hashedPassword = await bcrypt.hash(unicodePassword, saltRounds);

      expect(hashedPassword).toBeDefined();

      const isValid = await bcrypt.compare(unicodePassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('최소 솔트 라운드 (4)', async () => {
      const minRounds = 4;
      const hashedPassword = await bcrypt.hash(testPassword, minRounds);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.includes(`$2b$0${minRounds}$`)).toBe(true);

      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('최대 권장 솔트 라운드 (15)', async () => {
      const maxRounds = 15;
      const hashedPassword = await bcrypt.hash(testPassword, maxRounds);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword.includes(`$2b$${maxRounds}$`)).toBe(true);

      const isValid = await bcrypt.compare(testPassword, hashedPassword);
      expect(isValid).toBe(true);
    }, 30000); // 높은 솔트 라운드로 인한 긴 실행 시간 허용
  });
});