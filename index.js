const app = require('./src/app');

// Passenger সার্ভারের জন্য process.env.PORT জরুরি
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// cPanel / Passenger integration-এর জন্য এটি অত্যন্ত গুরুত্বপূর্ণ
module.exports = app;