// ============================================================
// WHATSAPP VIEW — conexión real con servidor Baileys
// Reemplazar el WAView existente en App.jsx con este código
// ============================================================
//
// IMPORTANTE: Agregar este import al inicio del archivo App.jsx,
// justo debajo del import de useState/useEffect:
//
//   const SOCKET_URL = "https://TU-URL-DE-RAILWAY.up.railway.app";
//
// (reemplazá con la URL real que te da Railway)
// ============================================================

const SOCKET_URL = "https://TU-URL-DE-RAILWAY.up.railway.app"; // ← CAMBIAR

const WAView = ({ currentUser }) => {
  const [status, setStatus] = useState("disconnected"); // disconnected | connecting | qr | connected | reconnecting
  const [qrImg, setQrImg] = useState(null);
  const [phone, setPhone] = useState(null);
  const [messages, setMessages] = useState({}); // { jid: [mensajes] }
  const [activeChat, setActiveChat] = useState(null);
  const [reply, setReply] = useState("");
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState("");

  const vendedorId = currentUser.id;

  // ── Conectar Socket.IO al montar ──
  useEffect(() => {
    let sock = null;

    const connectSocket = async () => {
      // Cargar Socket.IO dinámicamente
      const addScript = (src) =>
        new Promise((ok, fail) => {
          if (document.querySelector(`script[src="${src}"]`)) { ok(); return; }
          const el = document.createElement("script");
          el.src = src; el.onload = ok; el.onerror = fail;
          document.head.appendChild(el);
        });

      try {
        await addScript(`${SOCKET_URL}/socket.io/socket.io.js`);
        sock = window.io(SOCKET_URL, { transports: ["websocket"], withCredentials: true });

        sock.on("connect", () => {
          console.log("Socket conectado");
          sock.emit("wa:join", { vendedorId });
        });

        sock.on("wa:status", ({ status: s, phone: p }) => {
          setStatus(s);
          if (p) setPhone(p);
          if (s === "connected") setQrImg(null);
        });

        sock.on("wa:qr", ({ qr }) => {
          setQrImg(qr);
          setStatus("qr");
        });

        sock.on("wa:message", (msg) => {
          setMessages(prev => {
            const key = msg.jid;
            const existing = prev[key] || [];
            return { ...prev, [key]: [...existing, msg] };
          });
        });

        sock.on("wa:sent", ({ jid, text }) => {
          const msg = {
            id: Date.now().toString(),
            from: "me",
            name: "Yo",
            text,
            timestamp: new Date().toISOString(),
            jid,
            fromMe: true,
          };
          setMessages(prev => {
            const existing = prev[jid] || [];
            return { ...prev, [jid]: [...existing, msg] };
          });
        });

        sock.on("wa:error", ({ message: m }) => setError(m));

        sock.on("disconnect", () => {
          console.log("Socket desconectado");
          setStatus("disconnected");
        });

        setSocket(sock);
      } catch (e) {
        setError("No se pudo conectar al servidor de WhatsApp. Verificá que esté corriendo.");
        console.error(e);
      }
    };

    connectSocket();

    return () => { if (sock) sock.disconnect(); };
  }, [vendedorId]);

  const handleConnect = () => {
    if (!socket) { setError("Socket no conectado al servidor"); return; }
    setStatus("connecting");
    setQrImg(null);
    setError("");
    socket.emit("wa:connect", { vendedorId });
  };

  const handleDisconnect = () => {
    if (!socket) return;
    socket.emit("wa:disconnect", { vendedorId });
    setStatus("disconnected");
    setPhone(null);
    setQrImg(null);
    setMessages({});
    setActiveChat(null);
  };

  const handleSend = () => {
    if (!reply.trim() || !activeChat || !socket) return;
    socket.emit("wa:send", { vendedorId, jid: activeChat, text: reply.trim() });
    setReply("");
  };

  // Lista de chats únicos
  const chats = Object.entries(messages).map(([jid, msgs]) => {
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter(m => !m.fromMe && !m.read).length;
    return { jid, name: last.name, lastMsg: last.text, time: last.timestamp, unread };
  });

  const statusLabel = {
    disconnected: { text: "Desconectado", color: "var(--text4)" },
    connecting: { text: "Conectando...", color: "var(--yellow)" },
    qr: { text: "Esperando QR...", color: "var(--yellow)" },
    connected: { text: `Conectado (+${phone})`, color: "var(--verde-claro)" },
    reconnecting: { text: "Reconectando...", color: "var(--yellow)" },
  }[status] || { text: status, color: "var(--text3)" };

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">WhatsApp</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusLabel.color,
              boxShadow: status === "connected" ? "0 0 8px var(--verde-claro)" : "none" }} />
            <span style={{ fontSize: 12, color: statusLabel.color }}>{statusLabel.text}</span>
          </div>
        </div>
        {status === "connected" && (
          <button className="btn btn-danger btn-sm" onClick={handleDisconnect}>Desconectar</button>
        )}
      </div>

      {error && <div className="alert alert-err" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── PANTALLA DE CONEXIÓN ── */}
      {(status === "disconnected") && (
        <div className="card wa-card">
          <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
          <h3 style={{ fontFamily: "Outfit", marginBottom: 8 }}>Conectar tu WhatsApp</h3>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6 }}>
            Conectá tu WhatsApp personal para recibir y responder mensajes directamente desde el CRM.
          </p>
          <button className="btn btn-primary btn-full" onClick={handleConnect}>
            🔗 Generar QR para conectar
          </button>
        </div>
      )}

      {/* ── QR ── */}
      {(status === "connecting" || status === "qr") && (
        <div className="card wa-card">
          <h3 style={{ fontFamily: "Outfit", marginBottom: 8 }}>Escanear con tu teléfono</h3>
          <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16, lineHeight: 1.6 }}>
            1. Abrí WhatsApp en tu teléfono<br />
            2. Tocá los 3 puntos → <strong>Dispositivos vinculados</strong><br />
            3. Tocá <strong>Vincular un dispositivo</strong><br />
            4. Escaneá este código QR
          </p>
          <div className="wa-qr" style={{ width: 200, height: 200, margin: "0 auto 16px" }}>
            {qrImg ? (
              <img src={qrImg} alt="QR WhatsApp" style={{ width: "100%", height: "100%", borderRadius: 8 }} />
            ) : (
              <div style={{ textAlign: "center" }}>
                <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, color: "var(--verde-claro)" }} />
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>Generando QR...</div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--text3)" }}>El QR expira en 60 segundos. Si vence, hacé clic en reconectar.</div>
          {qrImg && (
            <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }} onClick={handleConnect}>
              🔄 Regenerar QR
            </button>
          )}
        </div>
      )}

      {/* ── RECONECTANDO ── */}
      {status === "reconnecting" && (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, color: "var(--verde-claro)" }} />
          <p style={{ marginTop: 16, color: "var(--text2)" }}>Reconectando WhatsApp...</p>
        </div>
      )}

      {/* ── CHAT INTERFACE ── */}
      {status === "connected" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, height: "72vh" }}>

          {/* Lista de chats */}
          <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13, fontFamily: "Outfit", color: "var(--verde-claro)" }}>
              💬 Chats ({chats.length})
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {chats.length === 0 ? (
                <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text3)", fontSize: 13 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                  Aún no hay mensajes.<br />Cuando alguien te escriba aparecerá aquí.
                </div>
              ) : chats.map(c => (
                <div key={c.jid}
                  style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer",
                    background: activeChat === c.jid ? "var(--verde-suave)" : "transparent", transition: "background 0.15s" }}
                  onClick={() => setActiveChat(c.jid)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{c.name}</span>
                    <span style={{ fontSize: 10, color: "var(--text3)" }}>
                      {new Date(c.time).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.lastMsg}</span>
                    {c.unread > 0 && <span className="badge b-verde" style={{ flexShrink: 0 }}>{c.unread}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text4)", marginTop: 4 }}>+{c.jid.replace("@s.whatsapp.net", "")}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ventana de chat */}
          <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            {activeChat ? (
              <>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontFamily: "Outfit", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{chats.find(c => c.jid === activeChat)?.name || activeChat}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>+{activeChat.replace("@s.whatsapp.net", "")}</span>
                </div>
                <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                  {(messages[activeChat] || []).map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.fromMe ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "75%", padding: "9px 13px", borderRadius: m.fromMe ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                        background: m.fromMe ? "var(--verde-principal)" : "var(--bg3)",
                        border: `1px solid ${m.fromMe ? "transparent" : "var(--border)"}`,
                        fontSize: 13, color: "var(--text)",
                      }}>
                        <div>{m.text}</div>
                        <div style={{ fontSize: 10, color: m.fromMe ? "rgba(255,255,255,0.6)" : "var(--text4)", marginTop: 4, textAlign: "right" }}>
                          {new Date(m.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                  <input className="form-input" placeholder="Escribir mensaje..."
                    value={reply} onChange={e => setReply(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSend()} />
                  <button className="btn btn-primary" onClick={handleSend} disabled={!reply.trim()}>Enviar</button>
                </div>
              </>
            ) : (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <p>Seleccioná una conversación</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
