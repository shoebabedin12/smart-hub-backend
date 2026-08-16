const express = require("express");
const cors = require("cors");
const path = require('path');
require("dotenv").config();

// Routes
const authRoutes = require("./routes/auth.routes");
const noticeRoutes = require("./routes/notice.routes");
const resourceRoutes = require("./routes/resource.routes");
const chatRoutes = require("./routes/chat.routes");
const resultRoutes = require("./routes/result.routes");
const deptRoutes = require("./routes/department.routes");
const profileRoutes = require("./routes/profile.routes");
const routineRoutes = require("./routes/routine.routes");
const assignmentRoutes = require("./routes/assignment.routes");
const userRoutes = require("./routes/user.routes");
const batchesRoutes = require("./routes/batches.routes");
const subjectRoutes = require("./routes/subject.routes");
const roomRoutes = require("./routes/room.routes");
const admissionRoutes = require("./routes/admission.routes");


const app = express();

// =================================
// CORS CONFIGURATION
// =================================

const allowedOrigins = [
  // Local frontend
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",

  // Production frontend
  "https://smart-hub.shoebabedin.com",
  "http://smart-hub.shoebabedin.com",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Postman / Mobile App / Server Request
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked CORS Origin:", origin);

    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization", "x-refresh-token"],
};

// Apply CORS

app.use(cors(corsOptions));

// Handle Preflight

app.options(/.*/, cors(corsOptions));

// =================================
// BODY PARSER
// =================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

// =================================
// STATIC FILES
// =================================

const uploadsPath = path.join(__dirname, "uploads");

app.use(
  "/uploads",
  express.static(uploadsPath)
);

// =================================
// API ROUTES
// =================================

app.use("/api/auth", authRoutes);

app.use("/api/notices", noticeRoutes);

app.use("/api/resources", resourceRoutes);

app.use("/api/chat", chatRoutes);

app.use("/api/results", resultRoutes);

app.use("/api/departments", deptRoutes);

app.use("/api/profile", profileRoutes);

app.use("/api/routine", routineRoutes);

app.use("/api/assignments", assignmentRoutes);

app.use("/api/users", userRoutes);

app.use("/api/batches", batchesRoutes);

app.use("/api/subjects", subjectRoutes);

app.use("/api/rooms", roomRoutes);

app.use("/api/admission-list", admissionRoutes);



// =================================
// TEST ROUTE
// =================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Student Portal API running 🚀",
  });
});

// =================================
// GLOBAL ERROR HANDLER
// =================================

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,

      message: "CORS Error: Origin not allowed",
    });
  }

  res.status(500).json({
    success: false,

    message: err.message,
  });
});

module.exports = app;
