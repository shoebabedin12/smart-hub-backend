const pool  = require('../db/pool');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.ask = async (req, res) => {
  const { message, session_id } = req.body;
  if (!message) return res.status(400).json({ message: 'message required' });

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthorized: User ID missing' });
  }

  try {
    let sid = session_id;

    // ১. সেশন হ্যান্ডলিং
    if (!sid) {
      const [result] = await pool.query('INSERT INTO chat_sessions (user_id) VALUES (?)', [req.user.id]);
      sid = result.insertId;
    }

    // ২. Student message save
    await pool.query('INSERT INTO chat_messages (session_id, sender, message) VALUES (?,?,?)', [sid, 'student', message]);

    // ৩. AI service call
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    const aiData = await aiRes.json();
    let botReply = aiData.answer || "Sorry, I couldn't find an answer.";
    let sourceResId = aiData.source_resource_id || null;

    // ৪. ডাইনামিক কোর্স কাউন্ট হ্যান্ডলিং
    if (botReply === "FETCH_COURSES_FROM_MAIN_DB") {
      const [courseResult] = await pool.query('SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?', [req.user.id]);
      const courseCount = courseResult?.count || 0; 
      botReply = courseCount > 0 ? `You are currently enrolled in **${courseCount} courses**.` : "You are not enrolled in any courses.";
    }

    // 🎯 ৫. ফরেন কি ক্র্যাশ প্রোটেকশন চেক (নতুন যুক্ত করা লজিক)
    if (sourceResId) {
      const [resourceCheck] = await pool.query('SELECT id FROM resources WHERE id = ?', [sourceResId]);
      // যদি পাইথন থেকে আসা আইডিটি আমাদের MySQL resources টেবিলে না থাকে, তবে একে null করে দাও
      if (resourceCheck.length === 0) {
        console.warn(`Warning: source_resource_id ${sourceResId} not found in resources table. Setting to null to avoid constraint failure.`);
        sourceResId = null;
      }
    }

    // ৬. Bot message save (এখন এটি সম্পূর্ণ নিরাপদ!)
    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message, source_resource_id) VALUES (?,?,?,?)',
      [sid, 'bot', botReply, sourceResId]
    );

    res.json({ session_id: Number(sid), answer: botReply, source_resource_id: sourceResId });
  } catch (err) {
    console.error("Node.js Chat Error Detailed:", err);
    res.status(500).json({ message: 'Server error. Please try again.', error: err.message });
  }
};

exports.history = async (req, res) => {
  const { session_id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM chat_messages WHERE session_id=? ORDER BY sent_at ASC',
      [session_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.sessions = async (req, res) => {
  if (!req.user || !req.user.id) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const [rows] = await pool.query(
      'SELECT * FROM chat_sessions WHERE user_id=? ORDER BY started_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};