const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  port: process.env.DB_PORT || '',
  waitForConnections: true,
  connectionLimit: 10,
});

console.log("✅ Database Connected");

// Automatic Migration Function
// const createTables = async () => {
//   try {
//     const connection = await pool.getConnection();
//     console.log('MySQL connected successfully!');

//     // 1. Users Table
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         full_name VARCHAR(255) NOT NULL,
//         email VARCHAR(255) UNIQUE NOT NULL,
//         password_hash TEXT NOT NULL,
//         role VARCHAR(50) DEFAULT 'student',
//         department VARCHAR(100),
//         batch VARCHAR(50),
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       )
//     `);

//     // 2. Notices Table
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS notices (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         author_id INT,
//         title VARCHAR(255) NOT NULL,
//         body TEXT NOT NULL,
//         ai_summary TEXT,
//         category VARCHAR(50),
//         department VARCHAR(50),
//         is_pinned BOOLEAN DEFAULT FALSE,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     // 3. Resources Table
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS resources (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         uploaded_by INT,
//         title VARCHAR(255) NOT NULL,
//         file_path TEXT NOT NULL,
//         file_type VARCHAR(10),
//         subject VARCHAR(100),
//         semester VARCHAR(20),
//         department VARCHAR(100),
//         is_indexed BOOLEAN DEFAULT FALSE,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     // 4. Chat Sessions
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS chat_sessions (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         user_id INT,
//         started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//       )
//     `);

//     // 5. Chat Messages
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS chat_messages (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         session_id INT,
//         sender VARCHAR(20),
//         message TEXT,
//         source_resource_id INT,
//         sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
//         FOREIGN KEY (source_resource_id) REFERENCES resources(id) ON DELETE SET NULL
//       )
//     `);

//     // 6. Document Chunks
//     await connection.query(`
//       CREATE TABLE IF NOT EXISTS document_chunks (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         resource_id INT,
//         chunk_text TEXT,
//         chunk_index INT,
//         FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
//       )
//     `);

//     console.log('All MySQL tables verified/created successfully!');
//     connection.release();
//   } catch (err) {
//     console.error('MySQL initialization error:', err.message);
//   }
// };

// // Run migration
// createTables();

module.exports = pool;