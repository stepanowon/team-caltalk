const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./environment');

/**
 * Swagger 설정
 */
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Team CalTalk API',
    version: config.app.version,
    description: '팀 중심의 일정 관리와 실시간 커뮤니케이션을 통합한 협업 플랫폼 API',
    contact: {
      name: 'Team CalTalk Support',
      email: 'support@teamcaltalk.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://${config.app.host}:${config.app.port}`,
      description: '로컬 개발 서버',
    },
    {
      url: 'https://api.teamcaltalk.com',
      description: '프로덕션 서버',
    },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT 토큰을 Authorization 헤더에 Bearer 형식으로 전달',
      },
    },
    parameters: {
      teamId: {
        name: 'teamId',
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
          format: 'int64',
          minimum: 1,
        },
        description: '팀 ID',
        example: 1,
      },
      scheduleId: {
        name: 'scheduleId',
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
          format: 'int64',
          minimum: 1,
        },
        description: '일정 ID',
        example: 1,
      },
      messageId: {
        name: 'messageId',
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
          format: 'int64',
          minimum: 1,
        },
        description: '메시지 ID',
        example: 1,
      },
      userId: {
        name: 'userId',
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
          format: 'int64',
          minimum: 1,
        },
        description: '사용자 ID',
        example: 1,
      },
      page: {
        name: 'page',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
        description: '페이지 번호',
        example: 1,
      },
      limit: {
        name: 'limit',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 50,
        },
        description: '페이지당 항목 수',
        example: 50,
      },
      startDate: {
        name: 'startDate',
        in: 'query',
        schema: {
          type: 'string',
          format: 'date',
        },
        description: '조회 시작 날짜 (YYYY-MM-DD)',
        example: '2025-09-01',
      },
      endDate: {
        name: 'endDate',
        in: 'query',
        schema: {
          type: 'string',
          format: 'date',
        },
        description: '조회 종료 날짜 (YYYY-MM-DD)',
        example: '2025-09-30',
      },
    },
    responses: {
      Success: {
        description: '요청 성공',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: true,
                },
                message: {
                  type: 'string',
                  example: '요청이 성공적으로 처리되었습니다',
                },
                data: {
                  type: 'object',
                  description: '응답 데이터',
                },
              },
            },
          },
        },
      },
      BadRequest: {
        description: '잘못된 요청',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Unauthorized: {
        description: '인증 필요',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Forbidden: {
        description: '접근 권한 없음',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFound: {
        description: '리소스를 찾을 수 없음',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Conflict: {
        description: '리소스 충돌',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      TooManyRequests: {
        description: '요청 횟수 제한 초과',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      InternalServerError: {
        description: '서버 내부 오류',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['success', 'error', 'code'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
            description: '요청 성공 여부',
          },
          error: {
            type: 'string',
            example: '오류 메시지',
            description: '사용자에게 표시할 오류 메시지',
          },
          code: {
            type: 'string',
            example: 'ERROR_CODE',
            description: '에러 코드',
          },
          details: {
            type: 'object',
            description: '에러 상세 정보',
            example: {
              field: 'email',
              value: 'invalid-email',
            },
          },
        },
      },
      ValidationError: {
        allOf: [
          { $ref: '#/components/schemas/Error' },
          {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string',
                      example: 'email',
                    },
                    message: {
                      type: 'string',
                      example: '유효한 이메일 주소가 아닙니다',
                    },
                    value: {
                      type: 'string',
                      example: 'invalid-email',
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
  tags: [
    {
      name: '인증',
      description: '사용자 인증 및 토큰 관리',
    },
    {
      name: '사용자',
      description: '사용자 정보 관리',
    },
    {
      name: '팀',
      description: '팀 생성, 참여, 관리',
    },
    {
      name: '일정',
      description: '개인 및 팀 일정 관리',
    },
    {
      name: '채팅',
      description: '팀 내 실시간 메시징',
    },
    {
      name: '실시간',
      description: 'Long Polling 기반 실시간 알림',
    },
  ],
};

const path = require('path');

const options = {
  definition: swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/auth.js'),
    path.join(__dirname, '../routes/teams.js'),
    path.join(__dirname, '../routes/schedules.js'),
    path.join(__dirname, '../routes/chat.js'),
    path.join(__dirname, '../routes/poll.js'),
    path.join(__dirname, '../routes/users.js'),
  ],
};

// 디버깅을 위한 로그
console.log('Swagger 파일 경로들:', options.apis);
options.apis.forEach(api => {
  console.log('파일 존재 확인:', api, require('fs').existsSync(api));
});

const specs = swaggerJSDoc(options);

// 생성된 스펙 확인
console.log('생성된 paths 개수:', Object.keys(specs.paths || {}).length);
console.log('생성된 paths:', Object.keys(specs.paths || {}));

/**
 * Swagger UI 옵션
 */
const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8fafc; padding: 20px; border-radius: 8px; }
  `,
  customSiteTitle: 'Team CalTalk API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    filter: true,
    tryItOutEnabled: true,
    requestInterceptor: (request) => {
      // 개발 환경에서 요청 로깅
      if (config.app.env === 'development') {
        console.log('Swagger API Request:', request.method, request.url);
      }
      return request;
    },
    docExpansion: 'none',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
    displayOperationId: false,
    displayRequestDuration: true,
    maxDisplayedTags: 10,
    showExtensions: false,
    showCommonExtensions: false,
    tagsSorter: 'alpha',
    operationsSorter: 'alpha',
  },
};

module.exports = {
  specs,
  swaggerUi,
  swaggerUiOptions,
};