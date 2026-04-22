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
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const usersOnline = {};

// ===================== GET USERS =====================
app.get("/users", (req, res) => {
  db.query("SELECT id, username FROM users", (err, results) => {
    if (err) {
      console.log(err);
      return res.json([]);
    }
    res.json(results);
  });
});

// ===================== REGISTER =====================
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users (username, password) VALUES (?,?)",
    [username, hash],
    (err) => {
      if (err) return res.json({ error: "User already exists" });
      res.json({ success: true });
    },
  );
});

// ===================== LOGIN =====================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err, result) => {
      if (result.length === 0) return res.json({ error: "User not found" });

      const user = result[0];

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.json({ error: "Wrong password" });

      const token = jwt.sign(
        { id: user.id, username: user.username },
        process.env.JWT_SECRET,
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

    // simpan ke DB
    db.query(
      "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?,?,?)",
      [sender_id, receiver_id, message],
    );

    const receiverSocket = usersOnline[receiver_id];

    if (receiverSocket) {
      io.to(receiverSocket).emit("private_message", data);
    }
  });

  socket.on("disconnect", () => {
    for (let userId in usersOnline) {
      if (usersOnline[userId] === socket.id) {
        delete usersOnline[userId];
      }
    }
  });
});

// ===================== GET MESSAGES =====================
app.get("/messages/:sender/:receiver", (req, res) => {
  const { sender, receiver } = req.params;

  db.query(
    `SELECT * FROM messages 
     WHERE (sender_id=? AND receiver_id=?)
     OR (sender_id=? AND receiver_id=?)
     ORDER BY created_at ASC`,
    [sender, receiver, receiver, sender],
    (err, results) => {
      if (err) {
        console.log(err);
        return res.json([]);
      }

      res.json(results);
    },
  );
});

server.listen(3000, () => {
  console.log("Server running http://localhost:3000");
});
