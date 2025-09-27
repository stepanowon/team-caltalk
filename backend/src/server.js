const { initializeApp } = require('./app');
const config = require('./config/environment');
const logger = require('./config/logger');

/**
 * 서버 시작 함수
 */
const startServer = async () => {
  try {
    logger.info('서버 시작 중...', {
      name: config.app.name,
      version: config.app.version,
      environment: config.app.env,
      port: config.app.port,
      host: config.app.host,
    });

    // 애플리케이션 초기화
    const app = await initializeApp();

    // 서버 시작
    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info('서버가 성공적으로 시작되었습니다', {
        url: `http://${config.app.host}:${config.app.port}`,
        environment: config.app.env,
        processId: process.pid,
        nodeVersion: process.version,
      });

      // 개발 환경에서 유용한 정보 출력
      if (config.app.env === 'development') {
        console.log('\n🚀 Team CalTalk Backend Server');
        console.log(`📍 Server: http://${config.app.host}:${config.app.port}`);
        console.log(`📊 Health: http://${config.app.host}:${config.app.port}/health`);
        console.log(`📋 API Info: http://${config.app.host}:${config.app.port}/api`);
        console.log(`🔐 Auth: http://${config.app.host}:${config.app.port}/api/v1/auth`);
        console.log(`👥 Users: http://${config.app.host}:${config.app.port}/api/v1/users`);
        console.log(`🏢 Teams: http://${config.app.host}:${config.app.port}/api/v1/teams`);
        console.log(`\n환경: ${config.app.env}`);
        console.log(`데이터베이스: ${config.database.name}`);
        console.log(`프로세스 ID: ${process.pid}\n`);
      }
    });

    // 서버 타임아웃 설정
    server.timeout = config.performance.requestTimeout;

    // 서버 종료 처리
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} 신호 수신, 서버 종료 시작`);

      server.close((err) => {
        if (err) {
          logger.error('서버 종료 중 오류:', err);
          process.exit(1);
        }

        logger.info('서버가 정상적으로 종료되었습니다');
        process.exit(0);
      });

      // 강제 종료 타이머 (30초)
      setTimeout(() => {
        logger.error('서버 종료 타임아웃, 강제 종료');
        process.exit(1);
      }, 30000);
    };

    // 시그널 처리
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('서버 시작 실패:', {
      error: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
};

// 직접 실행시에만 서버 시작
if (require.main === module) {
  startServer();
}

module.exports = { startServer };