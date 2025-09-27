const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * 사용자 모델
 * 사용자 정보 관리 및 인증 관련 기능 제공
 */
class User extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * 이메일로 사용자 조회
   * @param {string} email - 이메일 주소
   */
  async findByEmail(email) {
    const start = Date.now();
    try {
      const result = await this.findOne({ email: email.toLowerCase() });

      logger.performance('User.findByEmail', Date.now() - start, {
        email: email.toLowerCase(),
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error('User.findByEmail 오류:', { email, error: error.message });
      throw error;
    }
  }

  /**
   * 새 사용자 생성
   * @param {Object} userData - 사용자 데이터
   * @param {string} userData.email - 이메일
   * @param {string} userData.name - 이름
   * @param {string} userData.password - 비밀번호
   */
  async createUser(userData) {
    const start = Date.now();
    try {
      const { email, name, password } = userData;

      // 입력 검증
      this.validateUserData({ email, name, password });

      // 이메일 중복 확인
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('이미 등록된 이메일입니다');
      }

      // 비밀번호 해싱
      const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

      // 사용자 생성
      const user = await this.create({
        email: email.toLowerCase(),
        name: name.trim(),
        password_hash: passwordHash,
      });

      // 민감한 정보 제거
      delete user.password_hash;

      logger.performance('User.createUser', Date.now() - start, {
        userId: user.id,
      });

      logger.audit('USER_CREATED', {
        userId: user.id,
        email: email.toLowerCase(),
        name: name.trim(),
      });

      return user;
    } catch (error) {
      logger.error('User.createUser 오류:', {
        email: userData.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 비밀번호 검증
   * @param {string} plainPassword - 평문 비밀번호
   * @param {string} hashedPassword - 해시된 비밀번호
   */
  async verifyPassword(plainPassword, hashedPassword) {
    const start = Date.now();
    try {
      const isValid = await bcrypt.compare(plainPassword, hashedPassword);

      logger.performance('User.verifyPassword', Date.now() - start);

      return isValid;
    } catch (error) {
      logger.error('User.verifyPassword 오류:', { error: error.message });
      throw error;
    }
  }

  /**
   * 사용자 인증
   * @param {string} email - 이메일
   * @param {string} password - 비밀번호
   */
  async authenticate(email, password) {
    const start = Date.now();
    try {
      // 사용자 조회 (비밀번호 해시 포함)
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await this.db.query(query, [email.toLowerCase()]);
      const user = result.rows[0];

      if (!user) {
        logger.audit('AUTH_FAILED', {
          email: email.toLowerCase(),
          reason: 'user_not_found',
        });
        return null;
      }

      // 비밀번호 검증
      const isValidPassword = await this.verifyPassword(password, user.password_hash);

      if (!isValidPassword) {
        logger.audit('AUTH_FAILED', {
          userId: user.id,
          email: email.toLowerCase(),
          reason: 'invalid_password',
        });
        return null;
      }

      // 민감한 정보 제거
      delete user.password_hash;

      logger.performance('User.authenticate', Date.now() - start, {
        userId: user.id,
        success: true,
      });

      logger.audit('AUTH_SUCCESS', {
        userId: user.id,
        email: email.toLowerCase(),
      });

      return user;
    } catch (error) {
      logger.error('User.authenticate 오류:', { email, error: error.message });
      throw error;
    }
  }

  /**
   * 비밀번호 변경
   * @param {number} userId - 사용자 ID
   * @param {string} currentPassword - 현재 비밀번호
   * @param {string} newPassword - 새 비밀번호
   */
  async changePassword(userId, currentPassword, newPassword) {
    const start = Date.now();
    try {
      // 현재 사용자 정보 조회
      const query = 'SELECT password_hash FROM users WHERE id = $1';
      const result = await this.db.query(query, [userId]);
      const user = result.rows[0];

      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      // 현재 비밀번호 확인
      const isValidCurrentPassword = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isValidCurrentPassword) {
        logger.audit('PASSWORD_CHANGE_FAILED', {
          userId,
          reason: 'invalid_current_password',
        });
        throw new Error('현재 비밀번호가 올바르지 않습니다');
      }

      // 새 비밀번호 검증
      this.validatePassword(newPassword);

      // 새 비밀번호 해싱
      const newPasswordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

      // 비밀번호 업데이트
      await this.update(userId, { password_hash: newPasswordHash });

      logger.performance('User.changePassword', Date.now() - start, {
        userId,
      });

      logger.audit('PASSWORD_CHANGED', {
        userId,
      });

      return true;
    } catch (error) {
      logger.error('User.changePassword 오류:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 사용자 프로필 업데이트
   * @param {number} userId - 사용자 ID
   * @param {Object} profileData - 업데이트할 프로필 데이터
   */
  async updateProfile(userId, profileData) {
    const start = Date.now();
    try {
      const { name, email } = profileData;
      const updateData = {};

      // 이름 업데이트
      if (name !== undefined) {
        this.validateName(name);
        updateData.name = name.trim();
      }

      // 이메일 업데이트
      if (email !== undefined) {
        this.validateEmail(email);

        // 이메일 중복 확인 (자신 제외)
        const existingUser = await this.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('이미 사용 중인 이메일입니다');
        }

        updateData.email = email.toLowerCase();
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('업데이트할 데이터가 없습니다');
      }

      const updatedUser = await this.update(userId, updateData);

      logger.performance('User.updateProfile', Date.now() - start, {
        userId,
      });

      logger.audit('USER_PROFILE_UPDATED', {
        userId,
        changes: Object.keys(updateData),
      });

      return updatedUser;
    } catch (error) {
      logger.error('User.updateProfile 오류:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 사용자가 속한 팀 목록 조회
   * @param {number} userId - 사용자 ID
   */
  async getUserTeams(userId) {
    const start = Date.now();
    try {
      const query = `
        SELECT
          t.id,
          t.name,
          t.description,
          t.invite_code,
          t.creator_id,
          t.created_at,
          tm.role,
          tm.joined_at,
          (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
        FROM teams t
        JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = $1
        ORDER BY tm.joined_at DESC
      `;

      const result = await this.db.query(query, [userId]);

      logger.performance('User.getUserTeams', Date.now() - start, {
        userId,
        teamCount: result.rows.length,
      });

      return result.rows;
    } catch (error) {
      logger.error('User.getUserTeams 오류:', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * 사용자 데이터 검증
   * @param {Object} userData - 검증할 사용자 데이터
   */
  validateUserData(userData) {
    const { email, name, password } = userData;

    this.validateEmail(email);
    this.validateName(name);
    this.validatePassword(password);
  }

  /**
   * 이메일 형식 검증
   * @param {string} email - 이메일
   */
  validateEmail(email) {
    if (!email) {
      throw new Error('이메일은 필수입니다');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('올바른 이메일 형식이 아닙니다');
    }

    if (email.length > 255) {
      throw new Error('이메일은 255자를 초과할 수 없습니다');
    }
  }

  /**
   * 이름 검증
   * @param {string} name - 이름
   */
  validateName(name) {
    if (!name) {
      throw new Error('이름은 필수입니다');
    }

    const trimmedName = name.trim();
    if (trimmedName.length < config.business.minUserNameLength ||
        trimmedName.length > config.business.maxUserNameLength) {
      throw new Error(`이름은 ${config.business.minUserNameLength}-${config.business.maxUserNameLength}자여야 합니다`);
    }

    // 특수문자 제한 (한글, 영문, 숫자, 공백만 허용)
    const nameRegex = /^[가-힣a-zA-Z0-9\s]+$/;
    if (!nameRegex.test(trimmedName)) {
      throw new Error('이름에는 한글, 영문, 숫자, 공백만 사용할 수 있습니다');
    }
  }

  /**
   * 비밀번호 검증
   * @param {string} password - 비밀번호
   */
  validatePassword(password) {
    if (!password) {
      throw new Error('비밀번호는 필수입니다');
    }

    if (password.length < 8) {
      throw new Error('비밀번호는 최소 8자 이상이어야 합니다');
    }

    if (password.length > 100) {
      throw new Error('비밀번호는 100자를 초과할 수 없습니다');
    }

    // 비밀번호 강도 검증 (영문, 숫자, 특수문자 중 2가지 이상)
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const criteriaMet = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
    if (criteriaMet < 2) {
      throw new Error('비밀번호는 영문, 숫자, 특수문자 중 2가지 이상을 포함해야 합니다');
    }
  }
}

module.exports = new User();