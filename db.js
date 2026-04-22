const mysql = require("mysql2");

// buat koneksi
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "chat_app",
});

// connect ke database
db.connect((err) => {
  if (err) {
    console.error("Koneksi DB gagal:", err);
  } else {
    console.log("MySQL Connected");
  }
});

module.exports = db;
