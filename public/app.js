const BASE_URL = "http://72.61.140.205:5000"; // kalau VPS isi: "http://IP_VPS:5000"

const socket = io(BASE_URL);

let user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  alert("Silakan login dulu!");
  window.location.href = "index.html";
}

let activeChat = null;

// ================= ONLINE =================
socket.emit("join", user.id);

// ================= LOAD USERS =================
function loadUsers() {
  fetch(BASE_URL + "/users")
    .then((res) => res.json())
    .then((users) => {
      const list = document.getElementById("userList");
      list.innerHTML = "";

      users.forEach((u) => {
        if (u.id === user.id) return;

        const div = document.createElement("div");
        div.className = "chat-item";
        div.innerText = u.username;

        div.onclick = (e) => openChat(e, u.id, u.username);

        list.appendChild(div);
      });
    })
    .catch(() => console.log("Gagal load users"));
}

// ================= OPEN CHAT =================
function openChat(e, chatId, name) {
  activeChat = { id: chatId, name };

  document.getElementById("chatTitle").innerText = name;

  // highlight active
  document.querySelectorAll(".chat-item").forEach((el) => {
    el.classList.remove("active");
  });

  e.target.classList.add("active");

  loadMessages(); // 🔥 penting
}

// ================= LOAD MESSAGES =================
function loadMessages() {
  if (!activeChat) return;

  fetch(`${BASE_URL}/messages/${user.id}/${activeChat.id}`)
    .then((res) => res.json())
    .then((messages) => {
      const box = document.getElementById("messages");
      box.innerHTML = "";

      messages.forEach((msg) => {
        renderMessage(msg);
      });
    })
    .catch(() => console.log("Gagal load messages"));
}

// ================= SEND MESSAGE =================
function sendMessage() {
  const input = document.getElementById("message");

  if (!input.value || !activeChat) return;

  const msg = {
    sender_id: user.id,
    receiver_id: activeChat.id,
    message: input.value,
  };

  socket.emit("private_message", msg);

  // ❌ HAPUS renderMessage di sini (biar tidak dobel)
  input.value = "";
}

// ================= RECEIVE =================
socket.on("private_message", (data) => {
  // 🔥 hanya tampilkan kalau chat aktif
  if (!activeChat) return;

  if (data.sender_id === activeChat.id || data.receiver_id === activeChat.id) {
    renderMessage(data);
  }
});

// ================= RENDER =================
function renderMessage(data) {
  const box = document.getElementById("messages");

  const div = document.createElement("div");
  div.className = "msg " + (data.sender_id === user.id ? "me" : "other");
  div.innerText = data.message;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ================= TYPING =================
function typing() {
  if (!activeChat) return;

  socket.emit("typing", {
    receiver_id: activeChat.id,
  });
}

// INIT
loadUsers();
