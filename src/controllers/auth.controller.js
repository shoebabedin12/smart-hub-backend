const pool = require('../db/pool');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


exports.register = async (req, res) => {

  const {
    full_name,
    email,
    password,
    role,
    department_id,
    batch
  } = req.body;


  if (!full_name || !email || !password || !department_id || !batch) {
    return res.status(400).json({
      message: 'All fields required'
    });
  }


  try {

    const [exists] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );


    if (exists.length > 0) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }


    const hash = await bcrypt.hash(password, 10);


    await pool.query(
      `INSERT INTO users 
      (full_name, email, password_hash, role, department_id, batch)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        email,
        hash,
        role || 'student',
        department_id,
        batch
      ]
    );


    const [rows] = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.department_id,
        d.name AS department_name,
        u.batch
       FROM users u
       LEFT JOIN departments d 
       ON u.department_id = d.id
       WHERE u.email = ?`,
      [email]
    );


    res.status(201).json({
      message: 'Registered successfully',
      user: rows[0]
    });


  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
};





exports.login = async (req, res) => {

  const {
    email,
    password
  } = req.body;


  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and password required'
    });
  }


  try {


    const [rows] = await pool.query(
      `SELECT 
        u.*,
        d.name AS department_name
       FROM users u
       LEFT JOIN departments d 
       ON u.department_id = d.id
       WHERE u.email = ?`,
      [email]
    );


    if (!rows.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }


    const user = rows[0];


    const match = await bcrypt.compare(
      password,
      user.password_hash
    );


    if (!match) {
      return res.status(401).json({
        message: 'Wrong password'
      });
    }



    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        full_name: user.full_name
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );



    res.json({

      token,

      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        department_id: user.department_id,
        department_name: user.department_name,
        batch: user.batch
      }

    });



  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

};





exports.me = async (req, res) => {

  try {

    const [rows] = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.batch,
        u.department_id,
        d.name AS department_name,
        u.profile_photo,
        u.created_at
       FROM users u
       LEFT JOIN departments d
       ON u.department_id = d.id
       WHERE u.id = ?`,
      [
        req.user.id
      ]
    );


    if (!rows.length) {
      return res.status(404).json({
        message: 'User not found'
      });
    }


    res.json(rows[0]);


  } catch(err){

    res.status(500).json({
      message: err.message
    });

  }

};