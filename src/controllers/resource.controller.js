const pool = require("../db/pool");
const fetch = require("node-fetch");
const path = require("path");

exports.upload = async (req, res) => {
  // 🛠️ ফ্রন্টএন্ড থেকে ফাইল আপলোডের সাথে এই ডেটাগুলোও আসবে
  const { title, subject, semester, department } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    // ১. ক্লাউডিনারি থেকে আসা লাইভ লিঙ্ক
    const fileUrl = req.file ? req.file.path : null; 
    
    if (!fileUrl) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // ২. ফাইলের এক্সটেনশন বের করা (যেমন: .pdf, .docx, .png)
    const fileType = req.file.originalname ? path.extname(req.file.originalname).replace('.', '') : 'unknown';

    console.log("Saving to DB - Path:", fileUrl, "Type:", fileType);

    // 🛠️ ফিক্সড কুয়েরি: ইনসার্ট রেজাল্ট থেকে insertId নেওয়ার জন্য [dbResult] ডিস্ট্রাকচার করা হলো
    const [dbResult] = await pool.query(
      `INSERT INTO resources (uploaded_by, title, file_path, file_type, subject, semester, department) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`, 
      [
        req.user.id, 
        title, 
        fileUrl,          // 👈 file_path কলামে ক্লাউডিনারি URL যাচ্ছে
        fileType,         // 👈 file_type কলামে এক্সটেনশন যাচ্ছে
        subject || null, 
        semester || null, 
        department || null
      ]
    );

    // 🎯 ডাটাবেজ থেকে নতুন জেনারেট হওয়া আইডি সংগ্রহ
    const resourceId = dbResult.insertId; 

    // ======================================================================
    // 🚀 পাইথন এআই সার্ভিসকে ফাইল রিড ও ইনডেক্স করার সিগন্যাল দেওয়া
    // ======================================================================
    try {
      // .env ফাইলে AI_SERVICE_URL না থাকলে ডিফল্ট http://localhost:8000 ব্যবহার করবে
      const pythonServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000'; 
      
      console.log(`Triggering Python indexing for Resource ID: ${resourceId}...`);
      
      // আমরা যে পাইথন রুটটি বানিয়েছিলাম (/index-file), সেখানে ডেটা পাঠানো হচ্ছে
      await fetch(`${pythonServiceUrl}/index-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: fileUrl,       // ক্লাউডিনারি লাইভ লিঙ্ক
          resource_id: resourceId  // আমাদের MySQL আইডি
        })
      });
      
      console.log(`Successfully completed AI indexing trigger for Resource ID: ${resourceId}`);
    } catch (aiErr) {
      // কোনো কারণে পাইথন এআই সার্ভিস ডাউন থাকলেও যেন ইউজারের মেইন ফাইল আপলোড ফেইল না করে
      console.error("Warning: Python AI Service indexing failed or timed out:", aiErr.message);
    }
    // ======================================================================
    
    res.status(201).json({ 
      message: 'Resource uploaded successfully and sent to AI assistant', 
      resourceId: resourceId, 
      url: fileUrl 
    });

  } catch (err) {
    console.error("Upload Controller Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAll = async (req, res) => {
  const { department, subject, semester } = req.query;
  
  let query = `SELECT r.*, u.full_name as uploader_name FROM resources r
               JOIN users u ON r.uploaded_by = u.id WHERE 1=1`;
  const params = [];
  
  if (department) {
    query += ` AND r.department = ?`;
    params.push(department);
  }
  if (subject) {
    query += ` AND r.subject LIKE ?`;
    params.push(`%${subject}%`);
  }
  if (semester) {
    query += ` AND r.semester = ?`;
    params.push(semester);
  }
  
  query += " ORDER BY r.created_at DESC";

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GetAll Error:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      "DELETE FROM resources WHERE id = ? AND uploaded_by = ?", 
      [id, req.user.id]
    );
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Remove Error:", err);
    res.status(500).json({ message: err.message });
  }
};