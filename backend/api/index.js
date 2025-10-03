/**
 * Vercel Serverless Function 엔트리포인트
 * Express 앱을 Serverless Function으로 래핑
 */

const { initializeApp } = require('../src/app');

let app;

/**
 * Serverless Function 핸들러
 * 앱 인스턴스를 재사용하여 cold start 최소화
 */
module.exports = async (req, res) => {
  try {
    // 앱이 초기화되지 않았다면 초기화
    if (!app) {
      console.log('Initializing Express app for Vercel Serverless Function...');
      app = await initializeApp();
      console.log('Express app initialized successfully');
    }

    // Express 앱에 요청 전달
    return app(req, res);
  } catch (error) {
    console.error('Serverless Function Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production'
        ? '서버 내부 오류가 발생했습니다'
        : error.message,
    });
  }
};
