const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// IMPORTANTE para Render
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

// Cola de mensajes para cada LoRa
const queues = {
  A: [],
  B: []
};

io.on("connection", (socket) => {
  console.log("💻 Web conectada");

  socket.on("enviar_mensaje", (data) => {
    const { from, to, msg } = data;

    console.log(`💬 WEB ${from} → ${to}: ${msg}`);

    // SOLO se guarda para LoRa (NO se envía directo a web)
    if (queues[to]) {
      queues[to].push({ from, msg });
    }
  });
});

// 📡 LoRa pide mensajes
app.get("/to-lora/:id", (req, res) => {
  const id = req.params.id;

  if (queues[id] && queues[id].length > 0) {
    const mensaje = queues[id].shift();
    console.log(`📤 Enviando a LoRa ${id}:`, mensaje);
    res.json(mensaje);
  } else {
    res.json({ msg: "" });
  }
});

// 📡 LoRa envía mensajes al servidor
app.post("/from-lora", (req, res) => {
  const { from, msg } = req.body;

  console.log(`📡 LoRa ${from} → ${msg}`);

  // 🔥 SOLO aquí se envía a la web
  io.emit("nuevo_mensaje", { from, msg });

  res.sendStatus(200);
});

// Servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});