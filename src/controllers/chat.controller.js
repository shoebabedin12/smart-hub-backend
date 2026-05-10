const pool  = require('../db/pool');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.ask = async (req, res) => {
  const { message, session_id } = req.body;
  if (!message) return res.status(400).json({ message: 'message required' });

  try {
    // Session create করো
    const s = await pool.query(
      'INSERT INTO chat_sessions (user_id) VALUES ($1) RETURNING id',
      [req.user.id]
    );
    const sid = s.rows[0].id;

    // Student message save
    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message) VALUES ($1,$2,$3)',
      [sid, 'student', message]
    );

    // AI service call
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const aiData = await aiRes.json();
    const botReply = aiData.answer || "Sorry, I couldn't find an answer.";
    const sourceResId = aiData.source_resource_id || null;

    // Bot message save
    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message, source_resource_id) VALUES ($1,$2,$3,$4)',
      [sid, 'bot', botReply, sourceResId]
    );

    res.json({ session_id: sid, answer: botReply, source_resource_id: sourceResId });
  } catch (err) {
    console.error("Chat Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};

exports.history = async (req, res) => {
  const { session_id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM chat_messages WHERE session_id=$1 ORDER BY sent_at ASC',
      [session_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sessions = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM chat_sessions WHERE user_id=$1 ORDER BY started_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};