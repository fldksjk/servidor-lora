const express = require("express");
const cors = require("cors");

const app = express();
const http = require("http").createServer(app);

const io = require("socket.io")(http, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// 📦 Colas por dispositivo
let queues = {
  A: [],
  B: []
};

// 📥 Mensaje desde LoRa
app.post("/from-lora", (req, res) => {
  try {
    const { from, msg } = req.body;

    if (!from || !msg) {
      console.log("⚠️ Mensaje inválido:", req.body);
      return res.sendStatus(400);
    }

    console.log(`📡 ${from} → ${msg}`);

    // 🚫 NO reenviar automáticamente (evita bucles)
    console.log("➡️ Mensaje recibido desde LoRa (no se reenvía)");

    // enviar a web
    io.emit("nuevo_mensaje", { from, msg });

    res.sendStatus(200);

  } catch (err) {
    console.log("❌ Error JSON:", err.message);
    res.sendStatus(500);
  }
});

// 📤 LoRa pide mensajes
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

// 💬 Mensajes desde web
io.on("connection", (socket) => {
  console.log("💻 Web conectada");

  socket.on("enviar_mensaje", (data) => {
    const { from, to, msg } = data;

    console.log(`💬 WEB ${from} → ${to}: ${msg}`);

    queues[to].push(msg);

    io.emit("nuevo_mensaje", { from, msg });
  });
});

// 🧪 Rutas de prueba
app.get("/sendA", (req, res) => {
  const msg = "Mensaje para A";

  console.log("🧪 Test → A:", msg);

  queues["A"].push(msg);

  res.send("Enviado a A");
});

app.get("/sendB", (req, res) => {
  const msg = "Mensaje para B";

  console.log("🧪 Test → B:", msg);

  queues["B"].push(msg);

  res.send("Enviado a B");
});

// raíz
app.get("/", (req, res) => {
  res.send("Servidor LoRa funcionando 🚀");
});

// 🔥 PUERTO DINÁMICO (CLAVE PARA RENDER)
const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log("🚀 Servidor corriendo en puerto " + PORT);
});