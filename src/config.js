const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'development-only-change-me',
  isProduction: process.env.NODE_ENV === 'production',
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quizlet'
  }
};
