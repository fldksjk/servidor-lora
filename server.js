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

// 🧠 Control de duplicados
let recentMessages = new Set();

// 📥 Mensaje desde LoRa
app.post("/from-lora", (req, res) => {
  try {
    const { from, msg } = req.body;

    if (!from || !msg) {
      console.log("⚠️ Mensaje inválido:", req.body);
      return res.sendStatus(400);
    }

    const key = from + msg;

    // 🚫 evitar duplicados
    if (recentMessages.has(key)) {
      console.log("⚠️ Duplicado LoRa ignorado:", msg);
      return res.sendStatus(200);
    }

    recentMessages.add(key);
    setTimeout(() => recentMessages.delete(key), 3000);

    console.log(`📡 ${from} → ${msg}`);

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

    const key = from + msg;

    // 🚫 evitar duplicados
    if (recentMessages.has(key)) {
      console.log("⚠️ Duplicado WEB ignorado:", msg);
      return;
    }

    recentMessages.add(key);
    setTimeout(() => recentMessages.delete(key), 3000);

    console.log(`💬 WEB ${from} → ${to}: ${msg}`);

    // guardar para LoRa destino
    queues[to].push(msg);

    // enviar a todas las webs
    io.emit("nuevo_mensaje", { from, msg });
  });
});

// 🧪 RUTAS DE PRUEBA

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
  res.sendFile(__dirname + "/index.html");
});

// 🚀 iniciar servidor
http.listen(3000, () => {
  console.log("🚀 Servidor corriendo en puerto 3000");
});