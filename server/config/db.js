const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD && process.env.DB_PASSWORD.length > 0 ? process.env.DB_PASSWORD : undefined,
  database: process.env.DB_NAME || 'archives_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  charset: 'utf8mb4'
});

pool.on('connection', (connection) => {
  console.log('✅ Nouvelle connexion MySQL établie');
});

pool.on('error', (err) => {
  console.error('❌ Erreur pool MySQL:', err.message);
});

module.exports = pool;
