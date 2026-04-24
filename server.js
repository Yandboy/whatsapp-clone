const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const usersOnline = {};

// ===================== GET USERS =====================
app.get("/users", (req, res) => {
  db.query("SELECT id, username FROM users", (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json([]);
    }
    res.json(results);
  });
});

// ===================== GET MESSAGES =====================
app.get("/messages/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;

  db.query(
    `SELECT * FROM messages 
     WHERE (sender_id=? AND receiver_id=?) 
     OR (sender_id=? AND receiver_id=?)
     ORDER BY created_at ASC`,
    [user1, user2, user2, user1],
    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json([]);
      }
      res.json(results);
    },
  );
});

// ===================== REGISTER =====================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ error: "Semua field wajib diisi" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    db.query(
      "INSERT INTO users (username, password) VALUES (?,?)",
      [username, hash],
      (err) => {
        if (err) return res.json({ error: "User sudah ada" });
        res.json({ success: true });
      },
    );
  } catch (err) {
    res.json({ error: "Server error" });
  }
});

// ===================== LOGIN =====================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err, result) => {
      if (err) return res.json({ error: "Server error" });

      if (result.length === 0) {
        return res.json({ error: "User tidak ditemukan" });
      }

      const user = result[0];

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.json({ error: "Password salah" });

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET || "secret",
      );

      res.json({ token, user });
    },
  );
});

// ===================== SOCKET =====================
io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    usersOnline[userId] = socket.id;
  });

  socket.on("private_message", (data) => {
    const { sender_id, receiver_id, message } = data;

    if (!message) return;

    // simpan ke DB
    db.query(
      "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?,?,?)",
      [sender_id, receiver_id, message],
      (err) => {
        if (err) return console.log(err);
      },
    );

    // kirim ke penerima
    const receiverSocket = usersOnline[receiver_id];
    if (receiverSocket) {
      io.to(receiverSocket).emit("private_message", data);
    }

    // kirim balik ke pengirim (BIAR LANGSUNG MUNCUL)
    socket.emit("private_message", data);
  });

  socket.on("disconnect", () => {
    for (let userId in usersOnline) {
      if (usersOnline[userId] === socket.id) {
        delete usersOnline[userId];
      }
    }
  });
});

// ===================== START SERVER =====================
const PORT = 5000;

server.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
