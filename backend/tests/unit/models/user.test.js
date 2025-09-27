const bcrypt = require('bcrypt');

/**
 * User 모델 단위 테스트
 *
 * 테스트 범위:
 * - 사용자 생성, 조회, 수정, 삭제
 * - 비밀번호 검증
 * - 데이터 유효성 검사
 * - 에러 처리
 */

// 실제 모델이 구현되기 전까지 모킹
const mockUserModel = {
  async create(userData) {
    // 입력 검증
    if (!userData.email || !userData.name || !userData.password) {
      throw new Error('Required fields missing');
    }

    if (userData.email.length === 0 || userData.name.length < 2 || userData.name.length > 30) {
      throw new Error('Invalid input data');
    }

    if (userData.password.length < 6) {
      throw new Error('Password too short');
    }

    // 이메일 중복 검사 (모킹)
    if (userData.email === 'existing@example.com') {
      throw new Error('Email already exists');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = {
      id: Math.floor(Math.random() * 1000) + 1,
      email: userData.email,
      name: userData.name,
      password_hash: hashedPassword,
      created_at: new Date(),
      updated_at: new Date()
    };

    return newUser;
  },

  async findById(id) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid user ID');
    }

    // 모킹된 사용자 데이터
    const mockUsers = {
      1: {
        id: 1,
        email: 'john@example.com',
        name: 'John Doe',
        password_hash: '$2b$10$example.hash',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01')
      },
      2: {
        id: 2,
        email: 'jane@example.com',
        name: 'Jane Smith',
        password_hash: '$2b$10$another.hash',
        created_at: new Date('2025-01-02'),
        updated_at: new Date('2025-01-02')
      }
    };

    return mockUsers[id] || null;
  },

  async findByEmail(email) {
    if (!email) {
      throw new Error('Email is required');
    }

    // 모킹된 이메일 검색
    const mockUsersByEmail = {
      'john@example.com': {
        id: 1,
        email: 'john@example.com',
        name: 'John Doe',
        password_hash: '$2b$10$example.hash',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01')
      },
      'jane@example.com': {
        id: 2,
        email: 'jane@example.com',
        name: 'Jane Smith',
        password_hash: '$2b$10$another.hash',
        created_at: new Date('2025-01-02'),
        updated_at: new Date('2025-01-02')
      }
    };

    return mockUsersByEmail[email] || null;
  },

  async update(id, updateData) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid user ID');
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('No update data provided');
    }

    // 기존 사용자 확인
    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // 업데이트 가능한 필드 검증
    const allowedFields = ['name', 'password'];
    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
    }

    // 이름 유효성 검사
    if (updateData.name && (updateData.name.length < 2 || updateData.name.length > 30)) {
      throw new Error('Invalid name length');
    }

    // 비밀번호 해싱
    if (updateData.password) {
      if (updateData.password.length < 6) {
        throw new Error('Password too short');
      }
      updateData.password_hash = await bcrypt.hash(updateData.password, 10);
      delete updateData.password;
    }

    return {
      ...existingUser,
      ...updateData,
      updated_at: new Date()
    };
  },

  async delete(id) {
    if (!id || isNaN(id)) {
      throw new Error('Invalid user ID');
    }

    const existingUser = await this.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    return { success: true, deletedId: id };
  },

  async verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) {
      throw new Error('Password and hash are required');
    }

    return await bcrypt.compare(password, hashedPassword);
  },

  async list(options = {}) {
    const { page = 1, limit = 10, search } = options;

    if (page < 1 || limit < 1) {
      throw new Error('Invalid pagination parameters');
    }

    // 모킹된 사용자 목록
    let users = [
      { id: 1, email: 'john@example.com', name: 'John Doe', created_at: new Date('2025-01-01') },
      { id: 2, email: 'jane@example.com', name: 'Jane Smith', created_at: new Date('2025-01-02') },
      { id: 3, email: 'bob@example.com', name: 'Bob Wilson', created_at: new Date('2025-01-03') }
    ];

    // 검색 필터링
    if (search) {
      users = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      total: users.length,
      page,
      limit,
      totalPages: Math.ceil(users.length / limit)
    };
  }
};

describe('User 모델', () => {
  describe('사용자 생성', () => {
    test('유효한 데이터로 사용자 생성 성공', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123'
      };

      const user = await mockUserModel.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.password_hash).toBeDefined();
      expect(user.password_hash).not.toBe(userData.password); // 해싱되어야 함
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    test('이메일 누락 시 에러', async () => {
      const userData = {
        name: 'New User',
        password: 'password123'
      };

      await expect(mockUserModel.create(userData)).rejects.toThrow('Required fields missing');
    });

    test('이름 누락 시 에러', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123'
      };

      await expect(mockUserModel.create(userData)).rejects.toThrow('Required fields missing');
    });

    test('비밀번호 누락 시 에러', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User'
      };

      await expect(mockUserModel.create(userData)).rejects.toThrow('Required fields missing');
    });

    test('이름 길이 제한 (2-30자)', async () => {
      const shortNameData = {
        email: 'short@example.com',
        name: 'A',
        password: 'password123'
      };

      await expect(mockUserModel.create(shortNameData)).rejects.toThrow('Invalid input data');

      const longNameData = {
        email: 'long@example.com',
        name: 'A'.repeat(31),
        password: 'password123'
      };

      await expect(mockUserModel.create(longNameData)).rejects.toThrow('Invalid input data');
    });

    test('비밀번호 최소 길이 (6자)', async () => {
      const userData = {
        email: 'short@example.com',
        name: 'Short Password',
        password: '12345'
      };

      await expect(mockUserModel.create(userData)).rejects.toThrow('Password too short');
    });

    test('중복 이메일 처리', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123'
      };

      await expect(mockUserModel.create(userData)).rejects.toThrow('Email already exists');
    });
  });

  describe('사용자 조회', () => {
    test('ID로 사용자 조회 성공', async () => {
      const user = await mockUserModel.findById(1);

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.email).toBe('john@example.com');
      expect(user.name).toBe('John Doe');
      expect(user.password_hash).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
    });

    test('존재하지 않는 ID 조회 시 null 반환', async () => {
      const user = await mockUserModel.findById(999);
      expect(user).toBeNull();
    });

    test('잘못된 ID 형식 처리', async () => {
      await expect(mockUserModel.findById('invalid')).rejects.toThrow('Invalid user ID');
      await expect(mockUserModel.findById(null)).rejects.toThrow('Invalid user ID');
      await expect(mockUserModel.findById(undefined)).rejects.toThrow('Invalid user ID');
    });

    test('이메일로 사용자 조회 성공', async () => {
      const user = await mockUserModel.findByEmail('john@example.com');

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.email).toBe('john@example.com');
      expect(user.name).toBe('John Doe');
    });

    test('존재하지 않는 이메일 조회 시 null 반환', async () => {
      const user = await mockUserModel.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    test('빈 이메일 처리', async () => {
      await expect(mockUserModel.findByEmail('')).rejects.toThrow('Email is required');
      await expect(mockUserModel.findByEmail(null)).rejects.toThrow('Email is required');
    });
  });

  describe('사용자 수정', () => {
    test('이름 수정 성공', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedUser = await mockUserModel.update(1, updateData);

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.updated_at).toBeInstanceOf(Date);
    });

    test('비밀번호 수정 성공', async () => {
      const updateData = { password: 'newpassword123' };
      const updatedUser = await mockUserModel.update(1, updateData);

      expect(updatedUser.password_hash).toBeDefined();
      expect(updatedUser.password_hash).not.toBe('newpassword123'); // 해싱되어야 함
      expect(updatedUser.updated_at).toBeInstanceOf(Date);
    });

    test('존재하지 않는 사용자 수정 시 에러', async () => {
      const updateData = { name: 'Updated Name' };

      await expect(mockUserModel.update(999, updateData)).rejects.toThrow('User not found');
    });

    test('잘못된 ID 형식 처리', async () => {
      const updateData = { name: 'Updated Name' };

      await expect(mockUserModel.update('invalid', updateData)).rejects.toThrow('Invalid user ID');
    });

    test('빈 업데이트 데이터 처리', async () => {
      await expect(mockUserModel.update(1, {})).rejects.toThrow('No update data provided');
      await expect(mockUserModel.update(1, null)).rejects.toThrow('No update data provided');
    });

    test('허용되지 않는 필드 수정 시 에러', async () => {
      const updateData = { email: 'newemail@example.com', id: 999 };

      await expect(mockUserModel.update(1, updateData)).rejects.toThrow('Invalid fields: email, id');
    });

    test('짧은 비밀번호 수정 시 에러', async () => {
      const updateData = { password: '123' };

      await expect(mockUserModel.update(1, updateData)).rejects.toThrow('Password too short');
    });

    test('잘못된 이름 길이 수정 시 에러', async () => {
      const shortName = { name: 'A' };
      await expect(mockUserModel.update(1, shortName)).rejects.toThrow('Invalid name length');

      const longName = { name: 'A'.repeat(31) };
      await expect(mockUserModel.update(1, longName)).rejects.toThrow('Invalid name length');
    });
  });

  describe('사용자 삭제', () => {
    test('사용자 삭제 성공', async () => {
      const result = await mockUserModel.delete(1);

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe(1);
    });

    test('존재하지 않는 사용자 삭제 시 에러', async () => {
      await expect(mockUserModel.delete(999)).rejects.toThrow('User not found');
    });

    test('잘못된 ID 형식 처리', async () => {
      await expect(mockUserModel.delete('invalid')).rejects.toThrow('Invalid user ID');
      await expect(mockUserModel.delete(null)).rejects.toThrow('Invalid user ID');
    });
  });

  describe('비밀번호 검증', () => {
    test('올바른 비밀번호 검증 성공', async () => {
      const password = 'testpassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await mockUserModel.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    test('잘못된 비밀번호 검증 실패', async () => {
      const password = 'testpassword';
      const wrongPassword = 'wrongpassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      const isValid = await mockUserModel.verifyPassword(wrongPassword, hashedPassword);
      expect(isValid).toBe(false);
    });

    test('빈 비밀번호 또는 해시 처리', async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10);

      await expect(mockUserModel.verifyPassword('', hashedPassword)).rejects.toThrow('Password and hash are required');
      await expect(mockUserModel.verifyPassword('password', '')).rejects.toThrow('Password and hash are required');
      await expect(mockUserModel.verifyPassword(null, hashedPassword)).rejects.toThrow('Password and hash are required');
    });
  });

  describe('사용자 목록 조회', () => {
    test('기본 페이지네이션', async () => {
      const result = await mockUserModel.list();

      expect(result.users).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    test('커스텀 페이지네이션', async () => {
      const result = await mockUserModel.list({ page: 1, limit: 2 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    test('검색 기능', async () => {
      const result = await mockUserModel.list({ search: 'john' });

      expect(result.users).toHaveLength(1);
      expect(result.users[0].name).toBe('John Doe');
      expect(result.total).toBe(1);
    });

    test('잘못된 페이지네이션 파라미터', async () => {
      await expect(mockUserModel.list({ page: 0 })).rejects.toThrow('Invalid pagination parameters');
      await expect(mockUserModel.list({ limit: 0 })).rejects.toThrow('Invalid pagination parameters');
      await expect(mockUserModel.list({ page: -1 })).rejects.toThrow('Invalid pagination parameters');
    });

    test('빈 검색 결과', async () => {
      const result = await mockUserModel.list({ search: 'nonexistent' });

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('성능 테스트', () => {
    test('사용자 생성 성능 (< 100ms)', async () => {
      const userData = {
        email: 'performance@example.com',
        name: 'Performance User',
        password: 'password123'
      };

      const startTime = Date.now();
      await mockUserModel.create(userData);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('비밀번호 검증 성능 (< 100ms)', async () => {
      const password = 'testpassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      const startTime = Date.now();
      await mockUserModel.verifyPassword(password, hashedPassword);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});