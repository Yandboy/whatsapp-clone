const mysql = require("mysql2");

// buat koneksi
const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "123456",
  database: "chatuser",
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
