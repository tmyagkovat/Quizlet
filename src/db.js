const mysql = require('mysql2/promise');
const { database } = require('./config');

const serverPool = mysql.createPool({
  ...database,
  database: undefined,
  waitForConnections: true,
  connectionLimit: 2,
  charset: 'utf8mb4'
});

const pool = mysql.createPool({
  ...database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4'
});

async function initializeDatabase() {
  await serverPool.query(
    `CREATE DATABASE IF NOT EXISTS \`${database.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  const connection = await pool.getConnection();

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(120) NOT NULL,
        password_hash VARCHAR(200) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY users_username_unique (username),
        UNIQUE KEY users_email_unique (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS decks (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        title VARCHAR(100) NOT NULL,
        description VARCHAR(500) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT decks_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        deck_id INT UNSIGNED NOT NULL,
        question VARCHAR(500) NOT NULL,
        answer VARCHAR(500) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT cards_deck_fk FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    connection.release();
  }
}

module.exports = { pool, initializeDatabase };
