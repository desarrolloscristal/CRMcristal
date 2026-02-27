const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const QRCode = require("qrcode");
const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);

// ── CORS — permitir tu dominio del CRM ──────────────────────
const CRM_ORIGIN = process.env.CRM_ORIGIN || "https://crm.cristaldesarrollos.com";

const io = new Server(server, {
  cors: {
    origin: [CRM_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({
  origin: [CRM_ORIGIN, "http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

// ── Almacenamiento de sesiones activas ──────────────────────
// sessions[vendedorId] = { socket: WASocket, status, qr, phone }
const sessions = {};

// ── Directorio para guardar credenciales de cada sesión ─────
const SESSIONS_DIR = path.join(__dirname, "sessions");
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR);

// ── Logger silencioso para Baileys ──────────────────────────
const logger = pino({ level: "silent" });

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL — crear/reconectar una sesión WhatsApp
// ════════════════════════════════════════════════════════════
async function startSession(vendedorId, socketClient) {
  // Si ya hay una sesión activa, no crear otra
  if (sessions[vendedorId]?.status === "connected") {
    socketClient?.emit("wa:status", {
      vendedorId,
      status: "connected",
      phone: sessions[vendedorId].phone,
    });
    return;
  }

  sessions[vendedorId] = { status: "connecting", qr: null, phone: null, sock: null };

  const sessionPath = path.join(SESSIONS_DIR, vendedorId);
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: ["Cristal CRM", "Chrome", "1.0.0"],
    generateHighQualityLinkPreview: false,
  });

  sessions[vendedorId].sock = sock;

  // ── Eventos de conexión ──
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR listo — enviarlo al frontend como imagen base64
    if (qr) {
      try {
        const qrBase64 = await QRCode.toDataURL(qr, {
          width: 280,
          margin: 2,
          color: { dark: "#0d5c38", light: "#ffffff" },
        });
        sessions[vendedorId].qr = qrBase64;
        sessions[vendedorId].status = "qr";

        // Emitir a todos los clientes de este vendedor
        io.to(`vendor:${vendedorId}`).emit("wa:qr", { vendedorId, qr: qrBase64 });
        io.to(`vendor:${vendedorId}`).emit("wa:status", { vendedorId, status: "qr" });
        console.log(`[${vendedorId}] QR generado`);
      } catch (e) {
        console.error(`[${vendedorId}] Error generando QR:`, e);
      }
    }

    // Conectado exitosamente
    if (connection === "open") {
      const phone = sock.user?.id?.split(":")[0] || "desconocido";
      sessions[vendedorId].status = "connected";
      sessions[vendedorId].phone = phone;
      sessions[vendedorId].qr = null;

      io.to(`vendor:${vendedorId}`).emit("wa:status", {
        vendedorId,
        status: "connected",
        phone,
      });
      console.log(`[${vendedorId}] Conectado — +${phone}`);
    }

    // Desconectado
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;

      console.log(`[${vendedorId}] Desconectado (código ${code}), reconectar: ${shouldReconnect}`);

      if (shouldReconnect) {
        sessions[vendedorId].status = "reconnecting";
        io.to(`vendor:${vendedorId}`).emit("wa:status", { vendedorId, status: "reconnecting" });
        setTimeout(() => startSession(vendedorId, null), 3000);
      } else {
        // Sesión cerrada (logout) — limpiar credenciales
        sessions[vendedorId].status = "disconnected";
        io.to(`vendor:${vendedorId}`).emit("wa:status", { vendedorId, status: "disconnected" });
        fs.rmSync(path.join(SESSIONS_DIR, vendedorId), { recursive: true, force: true });
        delete sessions[vendedorId];
      }
    }
  });

  // ── Guardar credenciales cuando cambian ──
  sock.ev.on("creds.update", saveCreds);

  // ── Mensajes entrantes ──
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue; // ignorar mensajes propios

      const from = msg.key.remoteJid;
      if (!from || from.includes("@g.us")) continue; // ignorar grupos

      const phone = from.replace("@s.whatsapp.net", "");
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "[archivo adjunto]";

      const pushName = msg.pushName || phone;
      const timestamp = new Date(msg.messageTimestamp * 1000).toISOString();

      const payload = {
        vendedorId,
        id: msg.key.id,
        from: phone,
        name: pushName,
        text,
        timestamp,
        jid: from,
      };

      // Emitir al vendedor correspondiente
      io.to(`vendor:${vendedorId}`).emit("wa:message", payload);
      console.log(`[${vendedorId}] Mensaje de ${pushName} (${phone}): ${text.slice(0, 50)}`);
    }
  });
}

// ════════════════════════════════════════════════════════════
// RECONECTAR SESIONES EXISTENTES AL INICIAR EL SERVIDOR
// ════════════════════════════════════════════════════════════
async function restoreExistingSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const vendedores = fs.readdirSync(SESSIONS_DIR);
  console.log(`Revisando ${vendedores.length} carpeta(s) de sesiones...`);
  for (const vid of vendedores) {
    const sessionPath = path.join(SESSIONS_DIR, vid);
    if (!fs.statSync(sessionPath).isDirectory()) continue;
    // Solo restaurar si hay credenciales válidas (creds.json)
    const credsPath = path.join(sessionPath, "creds.json");
    if (fs.existsSync(credsPath)) {
      console.log(`  → Restaurando sesión con credenciales: ${vid}`);
      await startSession(vid, null);
    } else {
      // Limpiar carpeta vacía/sin credenciales
      console.log(`  → Sin credenciales, limpiando carpeta: ${vid}`);
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
}

// ════════════════════════════════════════════════════════════
// SOCKET.IO — conexión del frontend
// ════════════════════════════════════════════════════════════
io.on("connection", (socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  // El vendedor se une a su sala privada
  socket.on("wa:join", ({ vendedorId }) => {
    if (!vendedorId) return;
    socket.join(`vendor:${vendedorId}`);
    console.log(`[${vendedorId}] Se unió al room`);

    // Enviar estado actual inmediatamente
    const session = sessions[vendedorId];
    if (session) {
      socket.emit("wa:status", { vendedorId, status: session.status, phone: session.phone });
      if (session.qr) socket.emit("wa:qr", { vendedorId, qr: session.qr });
    } else {
      socket.emit("wa:status", { vendedorId, status: "disconnected" });
    }
  });

  // Solicitar conexión (escanear QR)
  socket.on("wa:connect", async ({ vendedorId }) => {
    if (!vendedorId) return;
    console.log(`[${vendedorId}] Solicitó conexión`);
    await startSession(vendedorId, socket);
  });

  // Enviar mensaje
  socket.on("wa:send", async ({ vendedorId, jid, text }) => {
    const session = sessions[vendedorId];
    if (!session?.sock || session.status !== "connected") {
      socket.emit("wa:error", { message: "WhatsApp no conectado" });
      return;
    }
    try {
      await session.sock.sendMessage(jid, { text });
      socket.emit("wa:sent", { vendedorId, jid, text });
    } catch (e) {
      socket.emit("wa:error", { message: "Error al enviar: " + e.message });
    }
  });

  // Desconectar sesión (logout)
  socket.on("wa:disconnect", async ({ vendedorId }) => {
    const session = sessions[vendedorId];
    if (session?.sock) {
      try { await session.sock.logout(); } catch (e) { /* ok */ }
    }
    delete sessions[vendedorId];
    const sessionPath = path.join(SESSIONS_DIR, vendedorId);
    if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
    io.to(`vendor:${vendedorId}`).emit("wa:status", { vendedorId, status: "disconnected" });
    console.log(`[${vendedorId}] Desconectado manualmente`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket desconectado: ${socket.id}`);
  });
});

// ════════════════════════════════════════════════════════════
// REST API — endpoints útiles
// ════════════════════════════════════════════════════════════

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    server: "Cristal WhatsApp Server",
    sessions: Object.keys(sessions).length,
    timestamp: new Date().toISOString(),
  });
});

// Estado de todas las sesiones
app.get("/api/sessions", (req, res) => {
  const data = {};
  for (const [id, s] of Object.entries(sessions)) {
    data[id] = { status: s.status, phone: s.phone };
  }
  res.json(data);
});

// Estado de una sesión específica
app.get("/api/sessions/:vendedorId", (req, res) => {
  const { vendedorId } = req.params;
  const s = sessions[vendedorId];
  if (!s) return res.json({ status: "disconnected" });
  res.json({ status: s.status, phone: s.phone });
});

// ════════════════════════════════════════════════════════════
// INICIAR SERVIDOR
// ════════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3001;

server.listen(PORT, async () => {
  console.log(`\n🚀 Cristal WhatsApp Server corriendo en puerto ${PORT}`);
  console.log(`   CRM Origin permitido: ${CRM_ORIGIN}\n`);
  await restoreExistingSessions();
});
