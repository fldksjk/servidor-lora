const express = require("express");
const cors = require("cors");

const app = express();
const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// 🔥 SERVIR FRONTEND (MUY IMPORTANTE)
app.use(express.static(__dirname));

// 📦 Colas por dispositivo
let queues = {
  A: [],
  B: []
};

// ==============================
// 📥 Mensaje desde LoRa
// ==============================
app.post("/from-lora", (req, res) => {
  try {
    const { from, msg } = req.body;

    if (!from || !msg) {
      console.log("⚠️ Mensaje inválido:", req.body);
      return res.sendStatus(400);
    }

    console.log(`📡 ${from} → ${msg}`);

    // Enviar a la web
    io.emit("nuevo_mensaje", { from, msg });

    res.sendStatus(200);

  } catch (err) {
    console.log("❌ Error JSON:", err.message);
    res.sendStatus(500);
  }
});

// ==============================
// 📤 LoRa pide mensajes
// ==============================
app.get("/to-lora", (req, res) => {
  const id = req.query.id;

  if (queues[id] && queues[id].length > 0) {
    const msg = queues[id].shift();

    console.log(`📤 Enviando a ${id}: ${msg}`);

    res.send(msg);
  } else {
    res.send("");
  }
});

// ==============================
// 💬 Mensajes desde Web
// ==============================
io.on("connection", (socket) => {
  console.log("💻 Web conectada");

  socket.on("enviar_mensaje", (data) => {
    const { from, to, msg } = data;

    console.log(`💬 WEB ${from} → ${to}: ${msg}`);

    // Enviar a LoRa
    if (queues[to]) {
      queues[to].push(msg);
    }

    // Enviar a web
    io.emit("nuevo_mensaje", { from, msg });
  });
});

// ==============================
// 🚀 Iniciar servidor
// ==============================
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});