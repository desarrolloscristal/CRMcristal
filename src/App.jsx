import { useState, useEffect, useCallback } from "react";

// ============================================================
// FIREBASE CONFIG — Reemplazá estos valores con los tuyos
// Conseguilos en: console.firebase.google.com → tu proyecto
// → Configuración del proyecto → Tus apps → SDK de Firebase
// ============================================================
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCw_ic9RQLKHHl1IHvhuMTUY1H4wJQs648",
  authDomain:        "cristalcrm-9bcb2.firebaseapp.com",
  projectId:         "cristalcrm-9bcb2",
  storageBucket:     "cristalcrm-9bcb2.firebasestorage.app",
  messagingSenderId: "807569978293",
  appId:             "1:807569978293:web:805c2bbad32638c40d1ffc",
};

// ---- Carga dinámica del SDK de Firebase (sin npm) ----
let db = null;
let fbAuth = null;
let fbLoaded = false;
let fbLoadPromise = null;

const loadFirebase = () => {
  if (fbLoaded) return Promise.resolve({ db, fbAuth });
  if (fbLoadPromise) return fbLoadPromise;

  fbLoadPromise = new Promise((resolve, reject) => {
    // Chequear si las credenciales ya fueron configuradas
    if (FIREBASE_CONFIG.apiKey === "PEGAR_TU_apiKey_AQUI") {
      reject(new Error("NO_CONFIG"));
      return;
    }
    const loadScript = (src) => new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });

    Promise.all([
      loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"),
      loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"),
      loadScript("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"),
    ]).then(() => {
      if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
      db = window.firebase.firestore();
      fbAuth = window.firebase.auth();
      fbLoaded = true;
      resolve({ db, fbAuth });
    }).catch(reject);
  });
  return fbLoadPromise;
};

// ============================================================
// DATOS INICIALES
// ============================================================
const INITIAL_USERS = [
  { id: "admin-1", username: "admin", email: "admin@cristaldesarrollos.com", password: "cristal2024", role: "admin", name: "Administrador", avatar: "A", zona: "" },
  { id: "vend-1", username: "lucas", email: "lucas@cristaldesarrollos.com", password: "lucas123", role: "vendedor", name: "Lucas Martínez", avatar: "L", zona: "Zona Sur" },
  { id: "vend-2", username: "sofia", email: "sofia@cristaldesarrollos.com", password: "sofia123", role: "vendedor", name: "Sofía Ramírez", avatar: "S", zona: "Zona Norte" },
  { id: "vend-3", username: "martin", email: "martin@cristaldesarrollos.com", password: "martin123", role: "vendedor", name: "Martín González", avatar: "M", zona: "Zona Oeste" },
];

const PIPELINE_STAGES = [
  { id: "nuevo", label: "Nuevo Lead", color: "#26945F" },
  { id: "contactado", label: "Contactado", color: "#1C8450" },
  { id: "visita", label: "Visita Agendada", color: "#5BC8A0" },
  { id: "propuesta", label: "Propuesta", color: "#4DFFA0" },
  { id: "negociacion", label: "Negociación", color: "#f0c040" },
  { id: "cerrado", label: "Cerrado ✓", color: "#ffffff" },
  { id: "perdido", label: "Perdido", color: "#c0392b" },
];

// ============================================================
// UTILIDADES
// ============================================================
const formatUSD = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n || 0);
const formatARS = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n || 0);
const uid = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const today = () => new Date().toISOString().split("T")[0];

// Logo SVG de Cristal (casa + sol, igual al logo real)
const LogoIcon = ({ size = 36, white = false }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Casa */}
    <polygon points="50,10 15,45 25,45 25,80 75,80 75,45 85,45" fill={white ? "white" : "white"} opacity="0.95"/>
    <rect x="38" y="55" width="24" height="25" fill={white ? "rgba(0,0,0,0.15)" : "rgba(38,148,95,0.4)"}/>
    {/* Sol - circulo */}
    <circle cx="62" cy="38" r="14" fill="none" stroke={white ? "white" : "white"} strokeWidth="5"/>
    {/* Rayos del sol */}
    <line x1="62" y1="18" x2="62" y2="12" stroke={white ? "white" : "white"} strokeWidth="4" strokeLinecap="round"/>
    <line x1="78" y1="24" x2="82" y2="20" stroke={white ? "white" : "white"} strokeWidth="4" strokeLinecap="round"/>
    <line x1="84" y1="38" x2="90" y2="38" stroke={white ? "white" : "white"} strokeWidth="4" strokeLinecap="round"/>
    <line x1="78" y1="52" x2="82" y2="56" stroke={white ? "white" : "white"} strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

// ============================================================
// ESTILOS — PALETA VERDE CRISTAL
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    /* === PALETA CRISTAL DESARROLLOS === */
    --verde-principal: #26945F;
    --verde-oscuro: #0D5C38;
    --verde-profundo: #09412A;
    --verde-hover: #1C8450;
    --verde-claro: #38B577;
    --verde-glow: #4DFFA0;
    --verde-suave: rgba(38, 148, 95, 0.15);
    --verde-border: rgba(38, 148, 95, 0.3);
    --verde-border2: rgba(38, 148, 95, 0.5);
    
    /* Fondos */
    --bg: #060f0b;
    --bg2: #0a1a12;
    --bg3: #0f2419;
    --bg4: #142e20;
    --bg5: #1a3d2b;
    
    /* Borders */
    --border: rgba(38,148,95,0.18);
    --border2: rgba(38,148,95,0.35);
    
    /* Texto */
    --text: #e8f5ed;
    --text2: #9cc8b0;
    --text3: #5a8a70;
    --text4: #3d6652;
    
    /* Accent blanco/plata (logo) */
    --white: #ffffff;
    --silver: #d4e8dd;
    --silver2: #a8c8b8;
    
    /* Estados */
    --green: #38B577;
    --green-dim: rgba(56,181,119,0.12);
    --red: #e05050;
    --red-dim: rgba(224,80,80,0.12);
    --yellow: #f0c040;
    --yellow-dim: rgba(240,192,64,0.12);
    --cyan: #4DFFA0;
    --cyan-dim: rgba(77,255,160,0.1);
    
    /* Sombras */
    --shadow: 0 4px 24px rgba(0,0,0,0.5);
    --shadow-green: 0 4px 24px rgba(38,148,95,0.25);
    --glow: 0 0 20px rgba(77,255,160,0.15);
    
    --radius: 12px;
    --radius-sm: 8px;
  }
  
  body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
  h1,h2,h3,h4,h5 { font-family: 'Outfit', sans-serif; }
  
  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--bg2); }
  ::-webkit-scrollbar-thumb { background: var(--verde-oscuro); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--verde-principal); }

  /* ======================== LOGIN ======================== */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    position: relative; overflow: hidden;
  }
  .login-bg {
    position: absolute; inset: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(38,148,95,0.18) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 80% 80%, rgba(77,255,160,0.06) 0%, transparent 50%),
      radial-gradient(ellipse 60% 50% at 10% 90%, rgba(38,148,95,0.08) 0%, transparent 50%);
  }
  /* Grid lines decorativas */
  .login-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: 
      linear-gradient(rgba(38,148,95,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(38,148,95,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .login-card {
    background: var(--bg2);
    border: 1px solid var(--verde-border);
    border-radius: 20px;
    padding: 48px 42px;
    width: 100%; max-width: 430px;
    position: relative; z-index: 1;
    box-shadow: var(--shadow), var(--shadow-green), 0 0 0 1px rgba(77,255,160,0.05);
    animation: loginIn 0.5s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes loginIn { from { opacity:0; transform:translateY(28px) scale(0.97); } to { opacity:1; transform:none; } }
  
  .login-logo { text-align: center; margin-bottom: 36px; }
  .login-logo-ring {
    width: 72px; height: 72px; border-radius: 18px;
    background: linear-gradient(135deg, var(--verde-principal), var(--verde-claro));
    display: inline-flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
    box-shadow: 0 8px 32px rgba(38,148,95,0.4), var(--glow);
    position: relative;
  }
  .login-logo-ring::after {
    content: '';
    position: absolute; inset: -3px;
    border-radius: 20px;
    border: 1px solid rgba(77,255,160,0.3);
    pointer-events: none;
  }
  .login-logo h1 { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.5px; }
  .login-logo h1 span { color: var(--verde-claro); }
  .login-logo p { font-size: 13px; color: var(--text3); margin-top: 4px; }
  .login-divider { height: 1px; background: var(--border); margin: 24px 0; }

  /* ======================== INPUTS ======================== */
  .form-group { margin-bottom: 16px; }
  .form-label { display: block; font-size: 11px; font-weight: 600; color: var(--text3); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.6px; font-family: 'Outfit', sans-serif; }
  .form-input, .form-select, .form-textarea {
    width: 100%;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 11px 14px;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    outline: none;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--verde-principal);
    background: var(--bg4);
    box-shadow: 0 0 0 3px rgba(38,148,95,0.15);
  }
  .form-input::placeholder { color: var(--text4); }
  .form-select option { background: var(--bg3); color: var(--text); }
  .form-textarea { resize: vertical; min-height: 80px; }
  .form-input.err { border-color: var(--red); box-shadow: 0 0 0 3px rgba(224,80,80,0.12); }
  
  /* ======================== BUTTONS ======================== */
  .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: var(--radius-sm);
    border: none; font-family: 'Outfit', sans-serif;
    font-size: 14px; font-weight: 600;
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .btn-primary {
    background: linear-gradient(135deg, var(--verde-principal), var(--verde-claro));
    color: white;
    box-shadow: 0 4px 14px rgba(38,148,95,0.35);
  }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(38,148,95,0.45), var(--glow); filter: brightness(1.08); }
  .btn-primary:active { transform: translateY(0); }
  .btn-ghost { background: var(--bg3); border: 1px solid var(--border); color: var(--text2); }
  .btn-ghost:hover { border-color: var(--verde-principal); color: var(--verde-claro); background: var(--verde-suave); }
  .btn-danger { background: var(--red-dim); border: 1px solid var(--red); color: var(--red); }
  .btn-danger:hover { background: var(--red); color: white; }
  .btn-success { background: var(--green-dim); border: 1px solid var(--green); color: var(--green); }
  .btn-success:hover { background: var(--green); color: white; }
  .btn-outline { background: transparent; border: 1px solid var(--verde-border2); color: var(--verde-claro); }
  .btn-outline:hover { background: var(--verde-suave); border-color: var(--verde-principal); }
  .btn-sm { padding: 6px 12px; font-size: 12px; }
  .btn-full { width: 100%; justify-content: center; padding: 13px; font-size: 15px; }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }

  /* ======================== LAYOUT ======================== */
  .app { display: flex; min-height: 100vh; }
  
  .sidebar {
    width: 248px; flex-shrink: 0;
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0;
    z-index: 100;
  }
  /* Efecto glow verde sutil en sidebar */
  .sidebar::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(180deg, rgba(38,148,95,0.04) 0%, transparent 40%);
    pointer-events: none;
  }
  
  .sidebar-top {
    padding: 22px 18px 18px;
    border-bottom: 1px solid var(--border);
    position: relative;
  }
  .sidebar-brand { display: flex; align-items: center; gap: 11px; }
  .sidebar-brand-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: linear-gradient(135deg, var(--verde-principal), var(--verde-claro));
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 14px rgba(38,148,95,0.4);
    flex-shrink: 0;
  }
  .sidebar-brand-text {}
  .sidebar-brand-text h2 { font-size: 15px; font-weight: 800; color: var(--text); line-height: 1.1; }
  .sidebar-brand-text span { font-size: 11px; color: var(--text3); }
  
  .sidebar-nav { flex: 1; padding: 14px 12px; overflow-y: auto; }
  .nav-group { margin-bottom: 22px; }
  .nav-group-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text4); padding: 0 8px; margin-bottom: 6px; font-family: 'Outfit', sans-serif; }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: var(--radius-sm);
    cursor: pointer; transition: all 0.15s;
    color: var(--text3); font-size: 13.5px; font-weight: 500;
    margin-bottom: 2px; border: 1px solid transparent;
    position: relative;
  }
  .nav-item:hover { background: var(--verde-suave); color: var(--text2); border-color: var(--verde-border); }
  .nav-item.active {
    background: linear-gradient(135deg, rgba(38,148,95,0.2), rgba(56,181,119,0.1));
    color: var(--verde-claro);
    border-color: var(--verde-border2);
    font-weight: 600;
  }
  .nav-item.active::before {
    content: ''; position: absolute;
    left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 60%; border-radius: 0 2px 2px 0;
    background: var(--verde-claro);
  }
  .nav-icon { font-size: 15px; width: 22px; text-align: center; flex-shrink: 0; }
  .nav-badge {
    margin-left: auto; background: var(--verde-principal);
    color: white; border-radius: 10px;
    padding: 1px 7px; font-size: 10px; font-weight: 700;
    animation: pulseBadge 2s infinite;
  }
  @keyframes pulseBadge { 0%,100%{box-shadow:0 0 0 0 rgba(38,148,95,0.4)} 50%{box-shadow:0 0 0 6px rgba(38,148,95,0)} }
  
  .sidebar-footer {
    padding: 14px 16px;
    border-top: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, var(--verde-principal), var(--verde-claro));
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; color: white;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(38,148,95,0.35);
  }
  .avatar-lg { width: 46px; height: 46px; font-size: 17px; }
  .user-meta { flex: 1; min-width: 0; }
  .user-name { font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-role { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; }
  .logout-btn { cursor: pointer; color: var(--text4); font-size: 15px; padding: 4px; border-radius: 6px; transition: all 0.15s; }
  .logout-btn:hover { color: var(--red); background: var(--red-dim); }

  .main { margin-left: 248px; flex: 1; min-height: 100vh; }
  
  .topbar {
    padding: 14px 28px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    background: rgba(10,26,18,0.9);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 50;
  }
  .topbar-left h2 { font-size: 17px; font-weight: 700; color: var(--text); font-family: 'Outfit', sans-serif; }
  .topbar-left p { font-size: 12px; color: var(--text3); margin-top: 1px; }
  
  .page { padding: 26px 28px; }

  /* ======================== CARDS ======================== */
  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
  }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .card-title { font-size: 14px; font-weight: 700; color: var(--text); font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 7px; }
  
  /* ======================== STAT CARDS ======================== */
  .stats-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; margin-bottom: 22px; }
  .stat {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    position: relative; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .stat:hover { border-color: var(--verde-border2); box-shadow: var(--shadow-green); }
  .stat::after {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .stat.c-verde::after { background: linear-gradient(90deg, var(--verde-principal), var(--verde-claro)); }
  .stat.c-cyan::after { background: linear-gradient(90deg, var(--cyan), #26945F); }
  .stat.c-yellow::after { background: var(--yellow); }
  .stat.c-red::after { background: var(--red); }
  .stat.c-silver::after { background: linear-gradient(90deg, #a8c8b8, #d4e8dd); }
  .stat-icon { font-size: 22px; margin-bottom: 8px; }
  .stat-label { font-size: 10.5px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-family: 'Outfit', sans-serif; }
  .stat-val { font-size: 22px; font-weight: 800; color: var(--text); font-family: 'Outfit', sans-serif; letter-spacing: -0.5px; }
  .stat-sub { font-size: 11px; color: var(--text4); margin-top: 3px; }
  
  /* ======================== TABLE ======================== */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 14px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text3); border-bottom: 1px solid var(--border); font-family: 'Outfit', sans-serif; }
  td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid rgba(38,148,95,0.08); color: var(--text2); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(38,148,95,0.04); }
  
  /* ======================== BADGES ======================== */
  .badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; font-family: 'Outfit', sans-serif; }
  .b-verde { background: var(--verde-suave); color: var(--verde-claro); border: 1px solid var(--verde-border); }
  .b-cyan { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(77,255,160,0.2); }
  .b-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(224,80,80,0.2); }
  .b-yellow { background: var(--yellow-dim); color: var(--yellow); border: 1px solid rgba(240,192,64,0.2); }
  .b-silver { background: rgba(168,200,184,0.12); color: var(--silver2); border: 1px solid rgba(168,200,184,0.2); }
  .b-dark { background: var(--bg4); color: var(--text3); border: 1px solid var(--border); }
  
  /* ======================== MODAL ======================== */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: fadeIn 0.2s; }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  .modal {
    background: var(--bg2); border: 1px solid var(--verde-border);
    border-radius: 16px; width: 100%; max-width: 660px;
    max-height: 92vh; overflow-y: auto;
    box-shadow: var(--shadow), var(--shadow-green), var(--glow);
    animation: modalIn 0.28s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(16px); } to { opacity:1; transform:none; } }
  .modal-head {
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: var(--bg2);
    border-radius: 16px 16px 0 0; z-index: 1;
  }
  .modal-title { font-size: 16px; font-weight: 700; font-family: 'Outfit', sans-serif; }
  .modal-close { width: 28px; height: 28px; background: var(--bg3); border: 1px solid var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; color: var(--text3); transition: all 0.15s; }
  .modal-close:hover { background: var(--bg4); color: var(--text); border-color: var(--border2); }
  .modal-body { padding: 22px 24px 26px; }
  
  /* ======================== FORM GRID ======================== */
  .fg { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .fg-full { grid-column: 1/-1; }
  .section-sep { font-size: 11px; font-weight: 700; color: var(--verde-claro); text-transform: uppercase; letter-spacing: 0.7px; margin: 18px 0 12px; display: flex; align-items: center; gap: 8px; font-family: 'Outfit', sans-serif; }
  .section-sep::after { content: ''; flex: 1; height: 1px; background: var(--verde-border); }
  .divider { height: 1px; background: var(--border); margin: 18px 0; }
  
  /* ======================== COMISION BOX ======================== */
  .comision-box {
    background: linear-gradient(135deg, rgba(38,148,95,0.1), rgba(77,255,160,0.04));
    border: 1px solid var(--verde-border2);
    border-radius: var(--radius); padding: 16px; margin-top: 14px;
    position: relative; overflow: hidden;
  }
  .comision-box::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--verde-principal), var(--cyan));
  }
  .comision-label { font-size: 10px; color: var(--verde-claro); font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 10px; font-family: 'Outfit', sans-serif; }
  .comision-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text2); margin-bottom: 7px; }
  .comision-row span:last-child { font-weight: 600; color: var(--text); }
  .comision-total {
    border-top: 1px solid var(--verde-border);
    padding-top: 10px; margin-top: 4px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .comision-total span:first-child { font-size: 12px; font-weight: 700; color: var(--verde-claro); font-family: 'Outfit', sans-serif; }
  .comision-total-val { font-size: 22px; font-weight: 800; color: var(--cyan); font-family: 'Outfit', sans-serif; letter-spacing: -0.5px; text-shadow: 0 0 20px rgba(77,255,160,0.4); }
  
  /* ======================== PIPELINE ======================== */
  .pipeline-board { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; min-height: 68vh; }
  .pip-col { min-width: 195px; max-width: 210px; flex-shrink: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); display: flex; flex-direction: column; }
  .pip-col-head { padding: 12px 14px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 7px; }
  .pip-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .pip-col-title { font-size: 12px; font-weight: 700; flex: 1; font-family: 'Outfit', sans-serif; }
  .pip-count { background: var(--bg4); color: var(--text3); border-radius: 8px; padding: 1px 7px; font-size: 11px; }
  .pip-body { padding: 8px; flex: 1; overflow-y: auto; }
  .pip-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 11px; margin-bottom: 7px; cursor: pointer; transition: all 0.15s; }
  .pip-card:hover { border-color: var(--verde-border2); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(38,148,95,0.2); }
  .pip-card-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .pip-card-phone { font-size: 11px; color: var(--text3); margin-bottom: 6px; }
  .pip-card-foot { display: flex; justify-content: space-between; align-items: center; }
  .pip-budget { font-size: 11px; color: var(--verde-claro); font-weight: 600; }
  .pip-date { font-size: 10px; color: var(--text4); }
  .pip-move { display: flex; gap: 3px; margin-top: 7px; flex-wrap: wrap; }
  .pip-move-btn { padding: 2px 7px; font-size: 10px; background: var(--bg4); border: 1px solid var(--border); border-radius: 4px; cursor: pointer; color: var(--text3); transition: all 0.12s; font-family: 'Outfit', sans-serif; }
  .pip-move-btn:hover { background: var(--verde-suave); border-color: var(--verde-border); color: var(--verde-claro); }
  
  /* ======================== UPLOAD ======================== */
  .upload-zone {
    border: 2px dashed var(--verde-border);
    border-radius: var(--radius); padding: 22px;
    text-align: center; cursor: pointer;
    transition: all 0.2s; background: var(--bg3);
  }
  .upload-zone:hover { border-color: var(--verde-principal); background: var(--verde-suave); }
  .upload-zone.has-file { border-color: var(--verde-claro); border-style: solid; background: var(--green-dim); }
  .file-chip { background: var(--bg3); border: 1px solid var(--verde-border); border-radius: var(--radius-sm); padding: 9px 13px; display: flex; align-items: center; gap: 9px; margin-top: 10px; font-size: 13px; }
  
  /* ======================== AI RESULT ======================== */
  .ai-box {
    background: linear-gradient(135deg, rgba(56,181,119,0.08), rgba(77,255,160,0.04));
    border: 1px solid rgba(77,255,160,0.2); border-radius: var(--radius); padding: 14px; margin-top: 12px;
  }
  .ai-label { font-size: 10px; color: var(--cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; font-family: 'Outfit', sans-serif; }
  
  /* ======================== VENTA DETAIL ======================== */
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .detail-item { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 11px 13px; }
  .detail-label { font-size: 10px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; font-family: 'Outfit', sans-serif; }
  .detail-val { font-size: 14px; font-weight: 600; color: var(--text); }
  
  /* ======================== TOGGLE ======================== */
  .toggle-row { display: flex; align-items: center; gap: 10px; }
  .toggle { width: 38px; height: 21px; background: var(--bg4); border: 1px solid var(--border); border-radius: 11px; cursor: pointer; position: relative; transition: all 0.2s; }
  .toggle.on { background: var(--verde-principal); border-color: var(--verde-claro); box-shadow: 0 0 10px rgba(38,148,95,0.3); }
  .toggle::after { content: ''; position: absolute; width: 17px; height: 17px; background: white; border-radius: 50%; top: 1px; left: 1px; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .toggle.on::after { transform: translateX(17px); }
  
  /* ======================== PREFIX INPUT ======================== */
  .pfx-wrap { display: flex; }
  .pfx { padding: 11px 13px; background: var(--bg4); border: 1px solid var(--border); border-right: none; border-radius: var(--radius-sm) 0 0 var(--radius-sm); font-size: 12px; color: var(--text3); white-space: nowrap; font-family: 'Outfit', sans-serif; font-weight: 600; }
  .pfx + .form-input { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
  
  /* ======================== WHATSAPP ======================== */
  .wa-card { max-width: 380px; margin: 0 auto; text-align: center; }
  .wa-qr { width: 180px; height: 180px; border: 2px dashed var(--verde-border2); border-radius: var(--radius); margin: 18px auto; display: flex; align-items: center; justify-content: center; background: var(--bg3); }
  .wa-dot { width: 8px; height: 8px; border-radius: 50%; }
  .wa-dot.on { background: var(--verde-claro); box-shadow: 0 0 10px rgba(56,181,119,0.6); animation: glowPulse 1.8s infinite; }
  .wa-dot.off { background: var(--text4); }
  @keyframes glowPulse { 0%,100%{opacity:1; box-shadow:0 0 10px rgba(56,181,119,0.6)} 50%{opacity:0.5; box-shadow:0 0 4px rgba(56,181,119,0.3)} }
  
  /* ======================== MISC ======================== */
  .spinner { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.25); border-top-color: currentColor; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .alert { padding: 11px 15px; border-radius: var(--radius-sm); margin-bottom: 14px; font-size: 13px; }
  .alert-err { background: var(--red-dim); border: 1px solid rgba(224,80,80,0.3); color: var(--red); }
  .alert-ok { background: var(--green-dim); border: 1px solid rgba(56,181,119,0.3); color: var(--green); }
  
  .empty { padding: 50px 20px; text-align: center; color: var(--text3); }
  .empty-icon { font-size: 44px; margin-bottom: 10px; }
  .empty p { font-size: 14px; }
  
  .ph { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
  .ph-title { font-size: 20px; font-weight: 800; font-family: 'Outfit', sans-serif; color: var(--text); }
  
  .tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab { padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; color: var(--text3); transition: all 0.15s; margin-bottom: -1px; font-family: 'Outfit', sans-serif; }
  .tab:hover { color: var(--text2); }
  .tab.act { color: var(--verde-claro); border-bottom-color: var(--verde-claro); }
  
  .pill-filters { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 16px; }
  
  .vendor-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: all 0.2s; }
  .vendor-card:hover { border-color: var(--verde-border2); box-shadow: var(--shadow-green); }
  
  .notif-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--verde-claro); animation: glowPulse 1.5s infinite; flex-shrink: 0; }
  
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .sidebar.mobile-open {
      display: flex !important;
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 999; width: 100vw; border-radius: 0;
    }
    .mobile-overlay {
      display: block !important;
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 998;
    }
    .main { margin-left: 0; padding-bottom: 72px; }
    .topbar { position: sticky; top: 0; z-index: 100; }
    .hamburger { display: flex !important; }
    .mobile-bottom-nav { display: flex !important; }
    .fg { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: 1fr 1fr; }
    .detail-grid { grid-template-columns: 1fr; }
    .pipeline-board { gap: 8px; }
    .pip-col { min-width: 260px; }
    .modal { margin: 12px; max-height: calc(100vh - 24px); }
  }
  .mobile-overlay { display: none; }
  .hamburger { display: none; }
  .mobile-bottom-nav { display: none; }

  /* BOTTOM NAV MOBILE */
  .mobile-bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: var(--bg2); border-top: 1px solid var(--border);
    flex-direction: row; align-items: stretch;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
    padding: 0; height: 64px;
  }
  .mobile-nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px; cursor: pointer; position: relative;
    padding: 8px 4px; transition: background 0.15s; border: none; background: none;
  }
  .mobile-nav-item.active { background: var(--verde-suave); }
  .mobile-nav-item.active .mobile-nav-label { color: var(--verde-claro); }
  .mobile-nav-item .mobile-nav-icon { font-size: 20px; line-height: 1; }
  .mobile-nav-item .mobile-nav-label { font-size: 9px; font-weight: 600; color: var(--text3); font-family: 'Outfit', sans-serif; text-transform: uppercase; letter-spacing: 0.3px; }
  .mobile-nav-badge { position: absolute; top: 6px; right: calc(50% - 18px); background: var(--verde-claro); color: #000; border-radius: 8px; font-size: 9px; font-weight: 700; padding: 1px 5px; min-width: 16px; text-align: center; }

  /* HAMBURGER BTN */
  .hamburger {
    width: 36px; height: 36px; border-radius: 8px; background: var(--bg3);
    border: 1px solid var(--border); align-items: center; justify-content: center;
    cursor: pointer; font-size: 18px; flex-shrink: 0;
  }
`;

// ============================================================
// LOGIN
// ============================================================
const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { db: firestore, auth: firebaseAuth } = await loadFirebase();
        
        // Setup initial users if needed
        const usersSnapshot = await firestore.collection('users').get();
        if (usersSnapshot.empty) {
          console.log('Creating initial users...');
          
          for (const user of INITIAL_USERS) {
            try {
              // Create auth user
              await firebaseAuth.createUserWithEmailAndPassword(user.email, user.password);
              
              // Create user document
              await firestore.collection('users').doc(user.email).set({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.name,
                avatar: user.avatar,
                zona: user.zona,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
              });
            } catch (err) {
              if (err.code !== 'auth/email-already-in-use') {
                console.error('Error creating user:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setInitializing(false);
      }
    };
    
    init();
  }, []);

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError("Completá email y contraseña");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { db: firestore, auth: firebaseAuth } = await loadFirebase();
      
      // Sign in with Firebase
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(form.email, form.password);
      
      // Get user data from Firestore
      const userDoc = await firestore.collection('users').doc(form.email).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        onLogin({
          uid: userCredential.user.uid,
          email: form.email,
          ...userData
        });
      } else {
        setError("Usuario no encontrado en la base de datos");
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Email o contraseña incorrectos");
      } else if (err.code === 'auth/invalid-email') {
        setError("Email inválido");
      } else {
        setError("Error al iniciar sesión. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="login-wrap">
        <div className="login-bg" />
        <div className="login-grid" />
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-ring">
              <LogoIcon size={44} white />
            </div>
            <h1>Cristal <span>Desarrollos</span></h1>
            <p>Sistema de Gestión Comercial · CRM</p>
          </div>
          <div className="login-divider" />
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ marginTop: 16, fontSize: 13, color: 'var(--text3)' }}>
              Inicializando Firebase...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-bg" />
      <div className="login-grid" />
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-ring">
            <LogoIcon size={44} white />
          </div>
          <h1>Cristal <span>Desarrollos</span></h1>
          <p>Sistema de Gestión Comercial · CRM</p>
        </div>
        <div className="login-divider" />
        {error && <div className="alert alert-err">{error}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input 
            className="form-input" 
            type="email"
            placeholder="tu@email.com" 
            value={form.email} 
            onChange={e => setForm({ ...form, email: e.target.value })} 
            onKeyDown={e => e.key === "Enter" && handleLogin()} 
          />
        </div>
        <div className="form-group" style={{ marginBottom: 22 }}>
          <label className="form-label">Contraseña</label>
          <input 
            className="form-input" 
            type="password" 
            placeholder="••••••••" 
            value={form.password} 
            onChange={e => setForm({ ...form, password: e.target.value })} 
            onKeyDown={e => e.key === "Enter" && handleLogin()} 
          />
        </div>
        <button className="btn btn-primary btn-full" onClick={handleLogin} disabled={loading}>
          {loading ? <><span className="spinner" /> Verificando...</> : "Ingresar al Sistema →"}
        </button>
        <div style={{ marginTop: 20, padding: "11px 14px", background: "var(--bg3)", borderRadius: 8, fontSize: 12, color: "var(--text3)", lineHeight: 1.6, border: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text2)", fontWeight: 600 }}>Accesos demo:</span><br />
          admin@cristaldesarrollos.com / cristal2024<br />
          lucas@cristaldesarrollos.com / lucas123<br />
          sofia@cristaldesarrollos.com / sofia123<br />
          martin@cristaldesarrollos.com / martin123
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SIDEBAR
// ============================================================
const Sidebar = ({ user, active, setActive, onLogout, pendientes, mobileOpen }) => {
  const adminNav = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "ventas", label: "Ventas", icon: "💰", badge: pendientes || null },
    { id: "gastos", label: "Gastos", icon: "🚗" },
    { id: "pipeline", label: "Pipeline", icon: "🔄" },
    { id: "vendedores", label: "Vendedores", icon: "👥" },
    { id: "documentacion", label: "Documentación", icon: "📄" },
    { id: "config", label: "Configuración", icon: "⚙️" },
  ];
  const vendedorNav = [
    { id: "resumen", label: "Mi Resumen", icon: "🏠" },
    { id: "mis-ventas", label: "Mis Ventas", icon: "💰" },
    { id: "mis-gastos", label: "Mis Gastos", icon: "🚗" },
    { id: "pipeline", label: "Pipeline", icon: "🔄" },
    { id: "documentacion", label: "Documentación", icon: "📄" },
    { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  ];
  const nav = user.role === "admin" ? adminNav : vendedorNav;
  return (
    <div className={`sidebar${mobileOpen ? " mobile-open" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon"><LogoIcon size={26} white /></div>
          <div className="sidebar-brand-text">
            <h2>Cristal</h2>
            <span>Desarrollos</span>
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-group">
          <div className="nav-group-label">{user.role === "admin" ? "Administración" : "Mi Panel"}</div>
          {nav.map(item => (
            <div key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
            </div>
          ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="avatar">{user.avatar}</div>
        <div className="user-meta">
          <div className="user-name">{user.name}</div>
          <div className="user-role">{user.role === "admin" ? "Administrador" : user.zona}</div>
        </div>
        <div className="logout-btn" onClick={onLogout} title="Cerrar sesión">🚪</div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL NUEVA VENTA
// ============================================================
const ModalVenta = ({ onClose, onSave, vendedor }) => {
  const [f, sf] = useState({ proyecto: "", zona: "", cNombre: "", cDni: "", cTel: "", cEmail: "", cDir: "", cOcup: "", reserva: "", total: "", financiado: false, cuotas: "", cuotaVal: "", anticipo: "", comisionCompartida: false, notas: "", compNombre: "" });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k, v) => sf(p => ({ ...p, [k]: v }));

  const comisionBase = (parseFloat(f.total) || 0) * 0.04;
  const comisionTotal = comisionBase + 200;
  const comisionVendedor = f.comisionCompartida ? comisionTotal / 2 : comisionTotal;

  const validate = () => {
    const req = ["proyecto", "cNombre", "cDni", "cTel", "cEmail", "reserva", "total"];
    const e = {};
    req.forEach(k => { if (!f[k]) e[k] = true; });
    if (f.financiado && !f.cuotas) e.cuotas = true;
    if (f.financiado && !f.cuotaVal) e.cuotaVal = true;
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    onSave({ id: uid(), vendedorId: vendedor.id, vendedorNombre: vendedor.name, fecha: today(), cliente: { nombre: f.cNombre, dni: f.cDni, telefono: f.cTel, email: f.cEmail, direccion: f.cDir, ocupacion: f.cOcup }, montoReserva: parseFloat(f.reserva), montoTotal: parseFloat(f.total), financiado: f.financiado, cuotas: f.financiado ? parseInt(f.cuotas) : null, valorCuota: f.financiado ? parseFloat(f.cuotaVal) : null, anticipo: f.financiado ? parseFloat(f.anticipo) || null : null, comision: comisionVendedor, comisionTotal: comisionTotal, comisionCompartida: f.comisionCompartida, estado: "pendiente", proyecto: f.proyecto, zona: f.zona, notas: f.notas, comprobante: f.compNombre });
    setSaving(false); onClose();
  };

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal-head">
          <div className="modal-title">💰 Cargar Nueva Venta</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="modal-body">
          <div className="section-sep">Proyecto</div>
          <div className="fg">
            <div className="form-group"><label className="form-label">Proyecto / Desarrollo *</label><input className={`form-input ${errs.proyecto ? "err" : ""}`} placeholder="Torres del Sur I" value={f.proyecto} onChange={e => set("proyecto", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Zona</label><select className="form-select" value={f.zona} onChange={e => set("zona", e.target.value)}><option value="">Sin especificar</option><option>Zona Sur</option><option>Zona Norte</option><option>Zona Oeste</option></select></div>
          </div>

          <div className="section-sep">Datos del Cliente</div>
          <div className="fg">
            <div className="form-group"><label className="form-label">Nombre Completo *</label><input className={`form-input ${errs.cNombre ? "err" : ""}`} placeholder="Juan Pérez" value={f.cNombre} onChange={e => set("cNombre", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">DNI *</label><input className={`form-input ${errs.cDni ? "err" : ""}`} placeholder="30.123.456" value={f.cDni} onChange={e => set("cDni", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Teléfono *</label><input className={`form-input ${errs.cTel ? "err" : ""}`} placeholder="11-4567-8901" value={f.cTel} onChange={e => set("cTel", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email *</label><input className={`form-input ${errs.cEmail ? "err" : ""}`} type="email" placeholder="cliente@mail.com" value={f.cEmail} onChange={e => set("cEmail", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Dirección</label><input className="form-input" placeholder="Av. Corrientes 1234, CABA" value={f.cDir} onChange={e => set("cDir", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Ocupación</label><input className="form-input" placeholder="Comerciante, Empleado..." value={f.cOcup} onChange={e => set("cOcup", e.target.value)} /></div>
          </div>

          <div className="section-sep">Datos de la Venta</div>
          <div className="fg">
            <div className="form-group">
              <label className="form-label">Monto de Reserva (USD) *</label>
              <div className="pfx-wrap"><span className="pfx">USD</span><input className={`form-input ${errs.reserva ? "err" : ""}`} type="number" placeholder="5.000" value={f.reserva} onChange={e => set("reserva", e.target.value)} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Monto Total de Venta (USD) *</label>
              <div className="pfx-wrap"><span className="pfx">USD</span><input className={`form-input ${errs.total ? "err" : ""}`} type="number" placeholder="120.000" value={f.total} onChange={e => set("total", e.target.value)} /></div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 14 }}>
            <div className="toggle-row">
              <div className={`toggle ${f.financiado ? "on" : ""}`} onClick={() => set("financiado", !f.financiado)} />
              <span className="form-label" style={{ margin: 0 }}>Venta Financiada</span>
            </div>
          </div>

          {f.financiado && (
            <div className="fg" style={{ marginBottom: 14 }}>
              <div className="form-group"><label className="form-label">Cantidad de Cuotas *</label><input className={`form-input ${errs.cuotas ? "err" : ""}`} type="number" placeholder="24" value={f.cuotas} onChange={e => set("cuotas", e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Valor de Cuota (USD) *</label><div className="pfx-wrap"><span className="pfx">USD</span><input className={`form-input ${errs.cuotaVal ? "err" : ""}`} type="number" placeholder="4.500" value={f.cuotaVal} onChange={e => set("cuotaVal", e.target.value)} /></div></div>
              <div className="form-group fg-full"><label className="form-label">Anticipo (USD)</label><div className="pfx-wrap"><span className="pfx">USD</span><input className="form-input" type="number" placeholder="Ej: 20.000" value={f.anticipo} onChange={e => set("anticipo", e.target.value)} /></div></div>
            </div>
          )}

          {f.total && (
            <div className="comision-box">
              <div className="comision-label">🏆 Cálculo Automático de Comisión</div>
              <div className="comision-row"><span>Monto total de la venta</span><span>{formatUSD(parseFloat(f.total) || 0)}</span></div>
              <div className="comision-row"><span>Comisión 4% sobre total</span><span>{formatUSD(comisionBase.toFixed(2))}</span></div>
              <div className="comision-row"><span>Bonus fijo por venta</span><span style={{ color: "var(--verde-claro)" }}>+ USD 200</span></div>
              <div className="comision-total">
                <span>COMISIÓN TOTAL</span>
                <span className="comision-total-val">{formatUSD(comisionTotal.toFixed(2))}</span>
              </div>

              {/* TOGGLE COMISIÓN COMPARTIDA */}
              <div style={{ borderTop: "1px dashed rgba(77,255,160,0.2)", marginTop: 14, paddingTop: 14 }}>
                <div className="toggle-row" style={{ marginBottom: f.comisionCompartida ? 12 : 0 }}>
                  <div className={`toggle ${f.comisionCompartida ? "on" : ""}`} onClick={() => set("comisionCompartida", !f.comisionCompartida)} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: f.comisionCompartida ? "var(--yellow)" : "var(--text3)", fontFamily: "Outfit", textTransform: "uppercase", letterSpacing: "0.5px", transition: "color 0.2s" }}>
                    🤝 Comisión Compartida
                  </span>
                  {!f.comisionCompartida && <span style={{ fontSize: 11, color: "var(--text4)", marginLeft: 4 }}>(dividir en 2)</span>}
                </div>
                {f.comisionCompartida && (
                  <div style={{ background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.25)", borderRadius: 8, padding: "12px 14px", animation: "fadeIn 0.2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                      <span>Comisión total generada</span>
                      <span style={{ fontWeight: 600, color: "var(--text2)" }}>{formatUSD(comisionTotal.toFixed(2))}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
                      <span>Dividido entre 2 vendedores</span>
                      <span style={{ fontWeight: 600, color: "var(--text2)" }}>÷ 2</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(240,192,64,0.2)", paddingTop: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", fontFamily: "Outfit", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tu comisión (50%)</span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "var(--yellow)", fontFamily: "Outfit", letterSpacing: "-0.5px", textShadow: "0 0 16px rgba(240,192,64,0.4)" }}>
                        {formatUSD(comisionVendedor.toFixed(2))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="section-sep" style={{ marginTop: 18 }}>Comprobante de Reserva</div>
          <div className="form-group">
            <label className={`upload-zone ${f.compNombre ? "has-file" : ""}`} style={{ display: "block" }}>
              <input type="file" style={{ display: "none" }} accept="image/*,.pdf" onChange={e => { if (e.target.files[0]) set("compNombre", e.target.files[0].name); }} />
              {f.compNombre ? (
                <div style={{ color: "var(--verde-claro)", fontWeight: 600 }}>✅ {f.compNombre}</div>
              ) : (
                <>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>📎</div>
                  <div style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>Subir comprobante de reserva</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>JPG, PNG o PDF — obligatorio</div>
                </>
              )}
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Notas adicionales</label>
            <textarea className="form-textarea" placeholder="Observaciones, acuerdos especiales, preferencias del cliente..." value={f.notas} onChange={e => set("notas", e.target.value)} />
          </div>

          {Object.keys(errs).length > 0 && <div className="alert alert-err">⚠️ Completá todos los campos obligatorios (*) antes de guardar.</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2 }}>
              {saving ? <><span className="spinner" /> Guardando...</> : "💾 Guardar Venta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL NUEVO GASTO
// ============================================================
const ModalGasto = ({ onClose, onSave, vendedor, apiKey }) => {
  const [f, sf] = useState({ categoria: "", descripcion: "", monto: "", moneda: "USD", fecha: today(), compNombre: "", aiData: null });
  const [aiLoading, setAiLoading] = useState(false);
  const [errs, setErrs] = useState({});
  const set = (k, v) => sf(p => ({ ...p, [k]: v }));
  const cats = ["Meta Ads", "Google Ads", "Anuncios General", "Combustible", "Reparación de Auto", "Otro"];

  const analyzeAI = async () => {
    if (!apiKey) { alert("Configurá tu API Key de OpenAI en Configuración → Admin"); return; }
    setAiLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages: [{ role: "user", content: `Analiza este comprobante de gasto para una empresa inmobiliaria argentina. Archivo: "${f.compNombre}". Categoría: "${f.categoria}". Descripción: "${f.descripcion}". Monto ingresado: "${f.monto} ${f.moneda}". Responde SOLO con JSON: { monto_detectado, moneda, descripcion_resumida, categoria_sugerida, valido, observacion }` }], max_tokens: 300 })
      });
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      set("aiData", parsed);
      if (parsed.monto_detectado) set("monto", parsed.monto_detectado);
      if (parsed.descripcion_resumida) set("descripcion", parsed.descripcion_resumida);
    } catch (e) { alert("Error IA: " + e.message); }
    setAiLoading(false);
  };

  const handleSave = () => {
    const e = {};
    if (!f.categoria) e.categoria = true;
    if (!f.descripcion) e.descripcion = true;
    if (!f.monto) e.monto = true;
    setErrs(e);
    if (Object.keys(e).length > 0) return;
    onSave({ id: uid(), vendedorId: vendedor.id, vendedorNombre: vendedor.name, fecha: f.fecha, categoria: f.categoria, descripcion: f.descripcion, monto: parseFloat(f.monto), moneda: f.moneda, comprobante: f.compNombre, aiInterpretacion: f.aiData });
    onClose();
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">🚗 Cargar Gasto</div>
          <div className="modal-close" onClick={onClose}>✕</div>
        </div>
        <div className="modal-body">
          <div className="fg">
            <div className="form-group"><label className="form-label">Categoría *</label><select className={`form-select ${errs.categoria ? "err" : ""}`} value={f.categoria} onChange={e => set("categoria", e.target.value)}><option value="">Seleccionar...</option>{cats.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={f.fecha} onChange={e => set("fecha", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Monto *</label><input className={`form-input ${errs.monto ? "err" : ""}`} type="number" placeholder="0.00" value={f.monto} onChange={e => set("monto", e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Moneda</label><select className="form-select" value={f.moneda} onChange={e => set("moneda", e.target.value)}><option>USD</option><option>ARS</option></select></div>
            <div className="form-group fg-full"><label className="form-label">Descripción *</label><input className={`form-input ${errs.descripcion ? "err" : ""}`} placeholder="Detalle del gasto..." value={f.descripcion} onChange={e => set("descripcion", e.target.value)} /></div>
          </div>
          <div className="divider" />
          <div className="form-group">
            <label className="form-label">Comprobante de Pago</label>
            <label className={`upload-zone ${f.compNombre ? "has-file" : ""}`} style={{ display: "block" }}>
              <input type="file" style={{ display: "none" }} accept="image/*,.pdf" onChange={e => { if (e.target.files[0]) set("compNombre", e.target.files[0].name); }} />
              {f.compNombre ? <div style={{ color: "var(--verde-claro)", fontWeight: 600 }}>✅ {f.compNombre}</div> : <div><div style={{ fontSize: 22, marginBottom: 4 }}>📎</div><div style={{ fontSize: 13, color: "var(--text2)" }}>Subir ticket o factura</div><div style={{ fontSize: 11, color: "var(--text3)", marginTop: 3 }}>La IA puede interpretarlo automáticamente</div></div>}
            </label>
          </div>
          {f.compNombre && (
            <button className="btn btn-outline btn-full" onClick={analyzeAI} disabled={aiLoading} style={{ marginBottom: 12 }}>
              {aiLoading ? <><span className="spinner" /> Analizando con IA...</> : "🤖 Analizar Comprobante con IA (OpenAI)"}
            </button>
          )}
          {f.aiData && (
            <div className="ai-box">
              <div className="ai-label">🤖 Interpretación IA — OpenAI</div>
              <div style={{ fontSize: 13, color: "var(--text2)" }}>
                <div style={{ marginBottom: 4 }}><strong style={{ color: "var(--text)" }}>Monto detectado:</strong> {f.aiData.monto_detectado} {f.aiData.moneda}</div>
                <div style={{ marginBottom: 4 }}><strong style={{ color: "var(--text)" }}>Descripción:</strong> {f.aiData.descripcion_resumida}</div>
                <div style={{ marginBottom: 4 }}><strong style={{ color: "var(--text)" }}>Categoría sugerida:</strong> {f.aiData.categoria_sugerida}</div>
                {f.aiData.observacion && <div style={{ color: "var(--text3)" }}>Obs: {f.aiData.observacion}</div>}
              </div>
            </div>
          )}
          {Object.keys(errs).length > 0 && <div className="alert alert-err" style={{ marginTop: 12 }}>⚠️ Completá los campos obligatorios.</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>💾 Guardar Gasto</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL NUEVO LEAD
// ============================================================
const ModalLead = ({ onClose, onSave, vendedor }) => {
  const [f, sf] = useState({ nombre: "", telefono: "", email: "", origen: "Meta Ads", presupuesto: "", zona: "", notas: "", etapa: "nuevo" });
  const handleSave = () => {
    if (!f.nombre || !f.telefono) { alert("Nombre y teléfono son obligatorios"); return; }
    onSave({ id: uid(), vendedorId: vendedor.id, ...f, fecha: today(), ultimoContacto: today() });
    onClose();
  };
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head"><div className="modal-title">👤 Nuevo Lead</div><div className="modal-close" onClick={onClose}>✕</div></div>
        <div className="modal-body">
          <div className="fg">
            <div className="form-group"><label className="form-label">Nombre Completo *</label><input className="form-input" placeholder="Juan Pérez" value={f.nombre} onChange={e => sf({ ...f, nombre: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Teléfono *</label><input className="form-input" placeholder="11-1234-5678" value={f.telefono} onChange={e => sf({ ...f, telefono: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="mail@ejemplo.com" value={f.email} onChange={e => sf({ ...f, email: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Origen</label><select className="form-select" value={f.origen} onChange={e => sf({ ...f, origen: e.target.value })}><option>Meta Ads</option><option>Google Ads</option><option>WhatsApp</option><option>Referido</option><option>General</option><option>Orgánico</option></select></div>
            <div className="form-group"><label className="form-label">Presupuesto Aprox.</label><input className="form-input" placeholder="$80.000 USD" value={f.presupuesto} onChange={e => sf({ ...f, presupuesto: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Zona de Interés</label><select className="form-select" value={f.zona} onChange={e => sf({ ...f, zona: e.target.value })}><option value="">Sin especificar</option><option>Zona Sur</option><option>Zona Norte</option><option>Zona Oeste</option></select></div>
            <div className="form-group"><label className="form-label">Etapa Inicial</label><select className="form-select" value={f.etapa} onChange={e => sf({ ...f, etapa: e.target.value })}>{PIPELINE_STAGES.filter(s => s.id !== "perdido").map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
            <div className="form-group fg-full"><label className="form-label">Notas</label><textarea className="form-textarea" placeholder="Intereses, preferencias, detalles..." value={f.notas} onChange={e => sf({ ...f, notas: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} style={{ flex: 2 }}>💾 Agregar Lead</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MODAL DETALLE VENTA
// ============================================================
const ModalDetalleVenta = ({ v, onClose, onUpdate }) => {
  if (!v) return null;
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-head"><div className="modal-title">📄 Venta #{v.id.slice(-4).toUpperCase()}</div><div className="modal-close" onClick={onClose}>✕</div></div>
        <div className="modal-body">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <span className={`badge ${v.estado === "aprobada" ? "b-cyan" : v.estado === "rechazada" ? "b-red" : "b-yellow"}`}>{v.estado?.toUpperCase()}</span>
            <span className="badge b-verde">{v.vendedorNombre}</span>
            <span className="badge b-dark">{v.fecha}</span>
            {v.zona && <span className="badge b-silver">{v.zona}</span>}
          </div>
          <div className="section-sep">Datos del Cliente</div>
          <div className="detail-grid" style={{ marginBottom: 18 }}>
            {[["Nombre", v.cliente?.nombre], ["DNI", v.cliente?.dni], ["Teléfono", v.cliente?.telefono], ["Email", v.cliente?.email], ["Dirección", v.cliente?.direccion || "—"], ["Ocupación", v.cliente?.ocupacion || "—"]].map(([l, val]) => (
              <div key={l} className="detail-item"><div className="detail-label">{l}</div><div className="detail-val">{val || "—"}</div></div>
            ))}
          </div>
          <div className="section-sep">Datos de la Venta</div>
          <div className="detail-grid" style={{ marginBottom: 18 }}>
            <div className="detail-item"><div className="detail-label">Proyecto</div><div className="detail-val">{v.proyecto}</div></div>
            <div className="detail-item"><div className="detail-label">Reserva</div><div className="detail-val" style={{ color: "var(--verde-claro)" }}>{formatUSD(v.montoReserva)}</div></div>
            <div className="detail-item"><div className="detail-label">Monto Total</div><div className="detail-val" style={{ color: "var(--cyan)", fontSize: 18 }}>{formatUSD(v.montoTotal)}</div></div>
            <div className="detail-item"><div className="detail-label">Financiamiento</div><div className="detail-val">{v.financiado ? `${v.cuotas} cuotas de ${formatUSD(v.valorCuota)}` : "Contado"}</div></div>
            {v.financiado && v.anticipo && <div className="detail-item"><div className="detail-label">Anticipo</div><div className="detail-val" style={{ color: "var(--verde-claro)" }}>{formatUSD(v.anticipo)}</div></div>}
          </div>
          <div className="comision-box">
            <div className="comision-label">🏆 Comisión — {v.vendedorNombre}</div>
            <div className="comision-row"><span>Total de la venta</span><span>{formatUSD(v.montoTotal)}</span></div>
            <div className="comision-row"><span>4% comisión</span><span>{formatUSD((v.montoTotal * 0.04).toFixed(2))}</span></div>
            <div className="comision-row"><span>Bonus fijo</span><span style={{ color: "var(--verde-claro)" }}>+ USD 200</span></div>
            <div className="comision-total"><span>COMISIÓN TOTAL GENERADA</span><span className="comision-total-val">{formatUSD(v.comisionTotal || v.comision)}</span></div>
            {v.comisionCompartida && (
              <div style={{ borderTop: "1px dashed rgba(240,192,64,0.25)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text3)", marginBottom: 6 }}>
                  <span>🤝 Comisión Compartida (÷ 2)</span>
                  <span style={{ color: "var(--yellow)", fontWeight: 600 }}>Activa</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", fontFamily: "Outfit", textTransform: "uppercase" }}>Comisión del Vendedor (50%)</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: "var(--yellow)", fontFamily: "Outfit", textShadow: "0 0 12px rgba(240,192,64,0.4)" }}>{formatUSD(v.comision)}</span>
                </div>
              </div>
            )}
          </div>
          {v.notas && <div style={{ marginTop: 14, padding: "11px 14px", background: "var(--bg3)", borderRadius: 8, fontSize: 13, color: "var(--text2)", border: "1px solid var(--border)" }}><strong>Notas:</strong> {v.notas}</div>}
          {v.comprobante && <div className="file-chip" style={{ marginTop: 12 }}>📎 {v.comprobante}</div>}
          {v.estado === "pendiente" && (
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { onUpdate(v.id, "rechazada"); onClose(); }}>✗ Rechazar</button>
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => { onUpdate(v.id, "aprobada"); onClose(); }}>✓ Aprobar Venta</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// DASHBOARD ADMIN
// ============================================================
const Dashboard = ({ ventas, gastos, leads }) => {
  const totalVentas = ventas.reduce((s, v) => s + v.montoTotal, 0);
  const totalComisiones = ventas.reduce((s, v) => s + v.comision, 0);
  const totalGastos = gastos.filter(g => g.moneda === "USD").reduce((s, g) => s + g.monto, 0);
  const pendientes = ventas.filter(v => v.estado === "pendiente").length;
  return (
    <div>
      <div className="stats-row">
        <div className="stat c-verde"><div className="stat-icon">💰</div><div className="stat-label">Total Ventas</div><div className="stat-val">{formatUSD(totalVentas)}</div><div className="stat-sub">{ventas.length} operaciones</div></div>
        <div className="stat c-cyan"><div className="stat-icon">🏆</div><div className="stat-label">Comisiones</div><div className="stat-val">{formatUSD(totalComisiones)}</div><div className="stat-sub">4% + USD 200 c/u</div></div>
        <div className="stat c-silver"><div className="stat-icon">🔄</div><div className="stat-label">Leads Activos</div><div className="stat-val">{leads.filter(l => l.etapa !== "perdido").length}</div><div className="stat-sub">{leads.filter(l => l.etapa === "cerrado").length} cerrados</div></div>
        <div className="stat c-yellow"><div className="stat-icon">⏳</div><div className="stat-label">Pendientes</div><div className="stat-val" style={{ color: pendientes > 0 ? "var(--yellow)" : "inherit" }}>{pendientes}</div><div className="stat-sub">Requieren aprobación</div></div>
        <div className="stat c-red"><div className="stat-icon">💸</div><div className="stat-label">Gastos USD</div><div className="stat-val">{formatUSD(totalGastos)}</div><div className="stat-sub">{gastos.length} registros</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Performance por Vendedor</div></div>
          {INITIAL_USERS.filter(u => u.role === "vendedor").map(u => {
            const vv = ventas.filter(v => v.vendedorId === u.id);
            const total = vv.reduce((s, v) => s + v.montoTotal, 0);
            const pct = totalVentas > 0 ? (total / totalVentas * 100) : 0;
            const com = vv.reduce((s, v) => s + v.comision, 0);
            return (
              <div key={u.id} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div className="avatar" style={{ width: 26, height: 26, fontSize: 10 }}>{u.avatar}</div>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.zona} · {vv.length} ventas</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "var(--verde-claro)", fontWeight: 700 }}>{formatUSD(total)}</div>
                    <div style={{ fontSize: 11, color: "var(--cyan)" }}>Comisión: {formatUSD(com)}</div>
                  </div>
                </div>
                <div style={{ height: 5, background: "var(--bg4)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg, var(--verde-principal), var(--verde-claro))", borderRadius: 3, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">⚡ Últimas Ventas</div></div>
          {[...ventas].reverse().slice(0, 4).map(v => (
            <div key={v.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <div style={{ fontSize: 22 }}>🏠</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v.cliente?.nombre}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{v.vendedorNombre} · {v.fecha}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--verde-claro)" }}>{formatUSD(v.montoTotal)}</div>
                <span className={`badge ${v.estado === "aprobada" ? "b-cyan" : v.estado === "rechazada" ? "b-red" : "b-yellow"}`} style={{ fontSize: 10 }}>{v.estado}</span>
              </div>
            </div>
          ))}
          {ventas.length === 0 && <div className="empty"><div className="empty-icon">📋</div><p>Sin ventas aún</p></div>}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// VENTAS VIEW
// ============================================================
const VentasView = ({ ventas, setVentas, currentUser }) => {
  const [modal, setModal] = useState(false);
  const [detalle, setDetalle] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const myVentas = currentUser.role === "admin" ? ventas : ventas.filter(v => v.vendedorId === currentUser.id);
  const filtered = filtro === "todos" ? myVentas : myVentas.filter(v => v.estado === filtro);
  const totalComision = myVentas.reduce((s, v) => s + v.comision, 0);
  const updateEstado = (id, estado) => setVentas(prev => prev.map(v => v.id === id ? { ...v, estado } : v));
  return (
    <div>
      <div className="ph">
        <div className="ph-title">{currentUser.role === "admin" ? "Gestión de Ventas" : "Mis Ventas"}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {currentUser.role === "vendedor" && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar Venta</button>}
        </div>
      </div>
      {currentUser.role === "vendedor" && (
        <div className="stats-row" style={{ marginBottom: 20 }}>
          <div className="stat c-cyan"><div className="stat-label">Mis Comisiones</div><div className="stat-val">{formatUSD(totalComision)}</div></div>
          <div className="stat c-verde"><div className="stat-label">Aprobadas</div><div className="stat-val">{myVentas.filter(v => v.estado === "aprobada").length}</div></div>
          <div className="stat c-silver"><div className="stat-label">Total Vendido</div><div className="stat-val">{formatUSD(myVentas.reduce((s, v) => s + v.montoTotal, 0))}</div></div>
        </div>
      )}
      <div className="pill-filters">
        {["todos", "pendiente", "aprobada", "rechazada"].map(e => (
          <button key={e} className={`btn btn-sm ${filtro === e ? "btn-primary" : "btn-ghost"}`} onClick={() => setFiltro(e)}>
            {e.charAt(0).toUpperCase() + e.slice(1)}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Fecha</th>
              {currentUser.role === "admin" && <th>Vendedor</th>}
              <th>Cliente</th><th>Proyecto</th><th>Reserva</th><th>Total</th><th>Financiado</th><th>Comisión</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10}><div className="empty"><div className="empty-icon">💰</div><p>{currentUser.role === "vendedor" ? "Cargá tu primera venta" : "Sin ventas"}</p></div></td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td>{v.fecha}</td>
                  {currentUser.role === "admin" && <td><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div className="avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{INITIAL_USERS.find(u => u.id === v.vendedorId)?.avatar}</div><span style={{ fontSize: 12 }}>{v.vendedorNombre}</span></div></td>}
                  <td style={{ fontWeight: 600, color: "var(--text)" }}>{v.cliente?.nombre}</td>
                  <td style={{ fontSize: 12 }}>{v.proyecto}</td>
                  <td style={{ color: "var(--verde-claro)", fontWeight: 600 }}>{formatUSD(v.montoReserva)}</td>
                  <td style={{ color: "var(--cyan)", fontWeight: 700 }}>{formatUSD(v.montoTotal)}</td>
                  <td>{v.financiado ? <span className="badge b-verde">{v.cuotas}c</span> : <span className="badge b-dark">Contado</span>}</td>
                  <td style={{ fontWeight: 700, color: "var(--verde-claro)" }}>{formatUSD(v.comision)}</td>
                  <td><span className={`badge ${v.estado === "aprobada" ? "b-cyan" : v.estado === "rechazada" ? "b-red" : "b-yellow"}`}>{v.estado}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setDetalle(v)}>Ver</button>
                      {v.estado === "pendiente" && currentUser.role === "admin" && <>
                        <button className="btn btn-sm btn-success" onClick={() => updateEstado(v.id, "aprobada")}>✓</button>
                        <button className="btn btn-sm btn-danger" onClick={() => updateEstado(v.id, "rechazada")}>✗</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && <ModalVenta onClose={() => setModal(false)} onSave={v => setVentas(p => [v, ...p])} vendedor={currentUser} />}
      {detalle && <ModalDetalleVenta v={detalle} onClose={() => setDetalle(null)} onUpdate={updateEstado} />}
    </div>
  );
};

// ============================================================
// GASTOS VIEW
// ============================================================
const GastosView = ({ gastos, setGastos, currentUser, apiKey }) => {
  const [modal, setModal] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const mine = currentUser.role === "admin" ? gastos : gastos.filter(g => g.vendedorId === currentUser.id);
  const cats = [...new Set(mine.map(g => g.categoria))];
  const filtered = filtro === "todos" ? mine : mine.filter(g => g.categoria === filtro);
  const totalUSD = mine.filter(g => g.moneda === "USD").reduce((s, g) => s + g.monto, 0);
  const totalARS = mine.filter(g => g.moneda === "ARS").reduce((s, g) => s + g.monto, 0);
  return (
    <div>
      <div className="ph">
        <div className="ph-title">{currentUser.role === "admin" ? "Gastos del Equipo" : "Mis Gastos"}</div>
        {currentUser.role === "vendedor" && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar Gasto</button>}
      </div>
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat c-red"><div className="stat-label">Total USD</div><div className="stat-val">{formatUSD(totalUSD)}</div></div>
        <div className="stat c-yellow"><div className="stat-label">Total ARS</div><div className="stat-val">{formatARS(totalARS)}</div></div>
        <div className="stat c-silver"><div className="stat-label">Registros</div><div className="stat-val">{mine.length}</div></div>
      </div>
      <div className="pill-filters">
        <button className={`btn btn-sm ${filtro === "todos" ? "btn-primary" : "btn-ghost"}`} onClick={() => setFiltro("todos")}>Todos</button>
        {cats.map(c => <button key={c} className={`btn btn-sm ${filtro === c ? "btn-primary" : "btn-ghost"}`} onClick={() => setFiltro(c)}>{c}</button>)}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Fecha</th>
              {currentUser.role === "admin" && <th>Vendedor</th>}
              <th>Categoría</th><th>Descripción</th><th>Monto</th><th>Comprobante</th><th>IA</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty"><div className="empty-icon">💸</div><p>Sin gastos registrados</p></div></td></tr>
              ) : filtered.map(g => (
                <tr key={g.id}>
                  <td>{g.fecha}</td>
                  {currentUser.role === "admin" && <td style={{ fontSize: 12 }}>{g.vendedorNombre}</td>}
                  <td><span className="badge b-verde">{g.categoria}</span></td>
                  <td style={{ fontSize: 13 }}>{g.descripcion}</td>
                  <td style={{ fontWeight: 700, color: g.moneda === "USD" ? "var(--verde-claro)" : "var(--text)" }}>{g.moneda === "USD" ? formatUSD(g.monto) : formatARS(g.monto)}</td>
                  <td>{g.comprobante ? <span className="badge b-cyan">📎 Sí</span> : <span className="badge b-dark">—</span>}</td>
                  <td>{g.aiInterpretacion ? <span className="badge b-verde">🤖 Sí</span> : <span className="badge b-dark">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {modal && <ModalGasto onClose={() => setModal(false)} onSave={g => setGastos(p => [g, ...p])} vendedor={currentUser} apiKey={apiKey} />}
    </div>
  );
};

// ============================================================
// MODAL DETALLE + EDITAR LEAD
// ============================================================
const ModalDetalleLead = ({ lead, onClose, onMove, onSave }) => {
  const [modo, setModo] = useState("ver"); // "ver" | "editar"
  const [f, setF] = useState({ ...lead });
  const [errs, setErrs] = useState({});

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const handleGuardar = () => {
    const e = {};
    if (!f.nombre?.trim()) e.nombre = true;
    if (!f.telefono?.trim()) e.telefono = true;
    setErrs(e);
    if (Object.keys(e).length > 0) return;
    onSave({ ...f, ultimoContacto: today() });
    setModo("ver");
  };

  const handleCancelar = () => {
    setF({ ...lead });
    setErrs({});
    setModo("ver");
  };

  const etapaActual = PIPELINE_STAGES.find(s => s.id === f.etapa);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>👤</div>
            <div>
              <div className="modal-title" style={{ marginBottom: 0 }}>{lead.nombre}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: etapaActual?.color }} />
                {etapaActual?.label}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {modo === "ver" ? (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setModo("editar")}
                style={{ gap: 5 }}
              >
                ✏️ Editar
              </button>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={handleCancelar}>✕ Cancelar</button>
            )}
            <div className="modal-close" onClick={onClose}>✕</div>
          </div>
        </div>

        <div className="modal-body">
          {modo === "ver" ? (
            /* ---- MODO VER ---- */
            <>
              <div className="detail-grid" style={{ marginBottom: 14 }}>
                {[
                  ["Teléfono", lead.telefono],
                  ["Email", lead.email || "—"],
                  ["Origen", lead.origen],
                  ["Presupuesto", lead.presupuesto || "—"],
                  ["Zona", lead.zona || "—"],
                  ["Fecha alta", lead.fecha],
                  ["Último contacto", lead.ultimoContacto],
                ].map(([label, val]) => (
                  <div key={label} className="detail-item">
                    <div className="detail-label">{label}</div>
                    <div className="detail-val">{val}</div>
                  </div>
                ))}
              </div>
              {lead.notas && (
                <div style={{ padding: "10px 14px", background: "var(--bg3)", borderRadius: 8, fontSize: 13, color: "var(--text2)", border: "1px solid var(--border)", marginBottom: 14, lineHeight: 1.5 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Notas</div>
                  {lead.notas}
                </div>
              )}
              {/* Mover etapa */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Mover a etapa</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                {PIPELINE_STAGES.map(s => {
                  const isCurrent = lead.etapa === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !isCurrent && onMove(lead.id, s.id)}
                      style={{
                        padding: "9px 12px", borderRadius: 8,
                        border: `2px solid ${isCurrent ? s.color : "var(--border)"}`,
                        background: isCurrent ? "rgba(38,148,95,0.08)" : "var(--bg3)",
                        cursor: isCurrent ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 12, fontWeight: isCurrent ? 700 : 400,
                        color: isCurrent ? "var(--text)" : "var(--text2)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                      {s.label}
                      {isCurrent && <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--verde-claro)", fontWeight: 700 }}>ACTUAL</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cerrar</button>
                <button className="btn btn-primary" onClick={() => setModo("editar")} style={{ flex: 2 }}>✏️ Editar Lead</button>
              </div>
            </>
          ) : (
            /* ---- MODO EDITAR ---- */
            <>
              {Object.keys(errs).length > 0 && (
                <div className="alert alert-err" style={{ marginBottom: 14 }}>⚠️ Completá nombre y teléfono antes de guardar.</div>
              )}
              <div className="fg">
                <div className="form-group">
                  <label className="form-label">Nombre Completo *</label>
                  <input className={`form-input ${errs.nombre ? "err" : ""}`} value={f.nombre} onChange={e => set("nombre", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Teléfono *</label>
                  <input className={`form-input ${errs.telefono ? "err" : ""}`} value={f.telefono} onChange={e => set("telefono", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={f.email} onChange={e => set("email", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Origen</label>
                  <select className="form-select" value={f.origen} onChange={e => set("origen", e.target.value)}>
                    {["Meta Ads","Google Ads","WhatsApp","Referido","General","Orgánico"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Presupuesto</label>
                  <input className="form-input" placeholder="USD 80.000" value={f.presupuesto} onChange={e => set("presupuesto", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Zona de Interés</label>
                  <select className="form-select" value={f.zona} onChange={e => set("zona", e.target.value)}>
                    <option value="">Sin especificar</option>
                    <option>Zona Sur</option>
                    <option>Zona Norte</option>
                    <option>Zona Oeste</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Etapa</label>
                  <select className="form-select" value={f.etapa} onChange={e => set("etapa", e.target.value)}>
                    {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="form-group fg-full">
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" placeholder="Intereses, preferencias, detalles..." value={f.notas} onChange={e => set("notas", e.target.value)} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-ghost" onClick={handleCancelar} style={{ flex: 1 }}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleGuardar} style={{ flex: 2 }}>💾 Guardar Cambios</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PIPELINE VIEW — con Drag & Drop nativo + Modal mover etapa
// ============================================================
const PipelineView = ({ leads, setLeads, currentUser }) => {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [moverModal, setMoverModal] = useState(null); // lead a mover
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const mine = currentUser.role === "admin" ? leads : leads.filter(l => l.vendedorId === currentUser.id);
  const move = (id, etapa) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, etapa, ultimoContacto: today() } : l));
    if (selected?.id === id) setSelected(s => ({ ...s, etapa }));
    if (moverModal?.id === id) setMoverModal(null);
  };

  // ---- DRAG & DROP handlers ----
  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Pequeño delay para que el ghost se vea bien
    setTimeout(() => e.target.style.opacity = "0.4", 0);
  };
  const onDragEnd = (e) => {
    e.target.style.opacity = "1";
    setDragId(null);
    setDragOver(null);
  };
  const onDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(stageId);
  };
  const onDrop = (e, stageId) => {
    e.preventDefault();
    if (dragId) move(dragId, stageId);
    setDragOver(null);
  };

  const origenColor = (o) => o === "Meta Ads" ? "b-verde" : o === "Google Ads" ? "b-cyan" : o === "WhatsApp" ? "b-yellow" : "b-dark";

  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">Pipeline de Leads</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
            Arrastrá las tarjetas entre columnas o usá el botón ↕ para mover
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Nuevo Lead</button>
      </div>

      <div className="pipeline-board">
        {PIPELINE_STAGES.map(stage => {
          const sl = mine.filter(l => l.etapa === stage.id);
          const isOver = dragOver === stage.id;
          return (
            <div
              key={stage.id}
              className="pip-col"
              onDragOver={e => onDragOver(e, stage.id)}
              onDrop={e => onDrop(e, stage.id)}
              onDragLeave={() => setDragOver(null)}
              style={{
                transition: "background 0.15s",
                background: isOver ? "rgba(77,255,160,0.06)" : undefined,
                border: isOver ? "2px dashed rgba(77,255,160,0.4)" : "2px solid transparent",
                borderRadius: 12,
              }}
            >
              <div className="pip-col-head">
                <div className="pip-dot" style={{ background: stage.color }} />
                <div className="pip-col-title">{stage.label}</div>
                <div className="pip-count">{sl.length}</div>
              </div>
              <div className="pip-body">
                {sl.map(l => (
                  <div
                    key={l.id}
                    className="pip-card"
                    draggable
                    onDragStart={e => onDragStart(e, l.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setSelected(l)}
                    style={{ cursor: "grab", transition: "opacity 0.15s, box-shadow 0.15s", userSelect: "none" }}
                  >
                    {/* Grip visual */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                      <div className="pip-card-name" style={{ flex: 1 }}>{l.nombre}</div>
                      <div
                        title="Mover a etapa"
                        onClick={e => { e.stopPropagation(); setMoverModal(l); }}
                        style={{
                          width: 24, height: 24, borderRadius: 6, background: "var(--bg4)",
                          border: "1px solid var(--border)", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: 13, cursor: "pointer", flexShrink: 0, marginLeft: 6,
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--verde-suave)"}
                        onMouseLeave={e => e.currentTarget.style.background = "var(--bg4)"}
                      >
                        ↕
                      </div>
                    </div>
                    <div className="pip-card-phone">📞 {l.telefono}</div>
                    <div style={{ marginBottom: 5, marginTop: 4 }}>
                      <span className={`badge ${origenColor(l.origen)}`} style={{ fontSize: 10 }}>{l.origen}</span>
                    </div>
                    <div className="pip-card-foot">
                      <div className="pip-budget">{l.presupuesto}</div>
                      <div className="pip-date">{l.ultimoContacto}</div>
                    </div>
                    {/* Hint drag */}
                    <div style={{ marginTop: 6, fontSize: 10, color: "var(--text4)", display: "flex", alignItems: "center", gap: 4 }}>
                      <span>⠿</span> Arrastrá para mover
                    </div>
                  </div>
                ))}
                {sl.length === 0 && (
                  <div style={{
                    padding: "24px 10px", textAlign: "center", color: "var(--text4)",
                    fontSize: 12, border: "1px dashed var(--border)", borderRadius: 8, margin: "4px 0",
                    transition: "border-color 0.15s",
                    borderColor: isOver ? "rgba(77,255,160,0.5)" : undefined,
                  }}>
                    {isOver ? "📥 Soltar acá" : "Vacío"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- MODAL NUEVO LEAD ---- */}
      {modal && <ModalLead onClose={() => setModal(false)} onSave={l => setLeads(p => [l, ...p])} vendedor={currentUser} />}

      {/* ---- MODAL DETALLE / EDITAR LEAD ---- */}
      {selected && (
        <ModalDetalleLead
          lead={selected}
          onClose={() => setSelected(null)}
          onMove={(id, etapa) => { move(id, etapa); setSelected(s => ({ ...s, etapa })); }}
          onSave={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setSelected(updated);
          }}
        />
      )}

      {/* ---- MODAL MOVER ETAPA (botón ↕ dentro del ticket) ---- */}
      {moverModal && (
        <div className="overlay" onClick={() => setMoverModal(null)}>
          <div style={{
            background: "var(--bg2)", border: "1px solid var(--verde-border)", borderRadius: 16,
            width: "100%", maxWidth: 420, padding: "0 0 4px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(77,255,160,0.08)",
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "Outfit" }}>↕ Mover Lead</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{moverModal.nombre}</div>
              </div>
              <div className="modal-close" onClick={() => setMoverModal(null)}>✕</div>
            </div>
            {/* Etapa actual */}
            <div style={{ padding: "10px 20px 6px" }}>
              <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>Seleccioná la nueva etapa</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PIPELINE_STAGES.map((s, idx) => {
                  const isCurrent = moverModal.etapa === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isCurrent && move(moverModal.id, s.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                        borderRadius: 10, cursor: isCurrent ? "default" : "pointer",
                        border: `1.5px solid ${isCurrent ? s.color : "var(--border)"}`,
                        background: isCurrent ? "rgba(38,148,95,0.08)" : "var(--bg3)",
                        transition: "all 0.15s",
                        opacity: isCurrent ? 1 : 0.85,
                      }}
                      onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--bg4)"; }}
                      onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = "var(--bg3)"; }}
                    >
                      {/* Número de paso */}
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                        background: isCurrent ? s.color : "var(--bg4)",
                        border: `1.5px solid ${isCurrent ? s.color : "var(--border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 700, color: isCurrent ? "#fff" : "var(--text3)",
                      }}>{idx + 1}</div>
                      {/* Dot + nombre */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: "var(--text)", display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                          {s.label}
                        </div>
                      </div>
                      {isCurrent
                        ? <span style={{ fontSize: 10, fontWeight: 700, color: "var(--verde-claro)", background: "var(--verde-suave)", padding: "2px 7px", borderRadius: 5, border: "1px solid var(--verde-border)" }}>Actual</span>
                        : <span style={{ fontSize: 18, color: "var(--text4)" }}>›</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ padding: "12px 20px" }}>
              <button className="btn btn-ghost" style={{ width: "100%" }} onClick={() => setMoverModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// WHATSAPP VIEW
// ============================================================
const WAView = ({ connected, setConnected, leads, setLeads, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const msgs = [
    { id: 1, name: "Carlos Suárez", phone: "+5491187654321", text: "Hola! Vi el anuncio de los lotes en Zona Sur, ¿me pueden dar info?", time: "09:45", unread: 2 },
    { id: 2, name: "María Consulta", phone: "+5491112345678", text: "Buenos días, ¿tienen financiación? Busco propiedad en zona norte", time: "11:20", unread: 1 },
    { id: 3, name: "Diego Fernández", phone: "+5491198765432", text: "¿Cuál es el precio del lote de 300m2?", time: "13:05", unread: 0 },
  ];
  const connect = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 2500));
    setLoading(false); setConnected(true);
  };
  return (
    <div>
      <div className="ph">
        <div className="ph-title">WhatsApp — Leads de Pauta</div>
        {connected && <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="wa-dot on" /><span style={{ fontSize: 13, color: "var(--verde-claro)" }}>Conectado</span></div>}
      </div>
      {!connected ? (
        <div className="card wa-card">
          <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
          <h3 style={{ fontFamily: "Outfit", marginBottom: 8 }}>Conectar WhatsApp</h3>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6 }}>
            Recibí los leads de tus campañas de Meta Ads y Google Ads directamente en el CRM. Escaneá el código QR con tu teléfono para conectar.
          </p>
          <div className="wa-qr">
            {loading ? (
              <div style={{ textAlign: "center" }}>
                <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3, color: "var(--verde-claro)" }} />
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)" }}>Generando QR...</div>
              </div>
            ) : (
              <svg viewBox="0 0 100 100" width="140" height="140" style={{ opacity: 0.6 }}>
                {/* QR simulado */}
                {[[0,0],[0,1],[0,2],[1,0],[2,0],[2,1],[2,2],[1,2]].map(([r,c],i)=><rect key={i} x={c*12+2} y={r*12+2} width="10" height="10" fill="var(--verde-claro)" rx="1"/>)}
                {[[0,7],[0,8],[0,9],[1,7],[2,7],[2,8],[2,9],[1,9]].map(([r,c],i)=><rect key={"b"+i} x={c*12-20} y={r*12+2} width="10" height="10" fill="var(--verde-claro)" rx="1"/>)}
                {[[7,0],[7,1],[7,2],[8,0],[9,0],[9,1],[9,2],[8,2]].map(([r,c],i)=><rect key={"c"+i} x={c*12+2} y={r*12-20} width="10" height="10" fill="var(--verde-claro)" rx="1"/>)}
                {[4,5,6].map(v=>[3,5,7,4,6].map((h,i)=><rect key={`d${v}${i}`} x={h*11+1} y={v*11+1} width="8" height="8" fill="var(--text3)" rx="0.5" opacity={Math.random()>0.4?"0.7":"0"}/>))}
              </svg>
            )}
          </div>
          <button className="btn btn-primary btn-full" onClick={connect} disabled={loading} style={{ marginBottom: 12 }}>
            {loading ? "Generando código QR..." : "🔗 Conectar WhatsApp"}
          </button>
          <div style={{ fontSize: 12, color: "var(--text3)", padding: "10px", background: "var(--bg3)", borderRadius: 8, border: "1px solid var(--border)" }}>
            ⚠️ Integración no oficial (Baileys/whatsapp-web.js). Solo para recibir y responder leads de pauta. Opcional.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14, height: "72vh" }}>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13, fontFamily: "Outfit", color: "var(--verde-claro)" }}>
              💬 Chats ({msgs.length})
            </div>
            {msgs.map(m => (
              <div key={m.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: active?.id === m.id ? "var(--verde-suave)" : "transparent", transition: "background 0.15s" }} onClick={() => setActive(m)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{m.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text3)" }}>{m.time}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.text}</span>
                  {m.unread > 0 && <span className="badge b-verde" style={{ flexShrink: 0 }}>{m.unread}</span>}
                </div>
                <button className="btn btn-sm btn-ghost" style={{ marginTop: 6, fontSize: 11 }} onClick={e => {
                  e.stopPropagation();
                  setLeads(prev => [{ id: uid(), vendedorId: currentUser.id, nombre: m.name, telefono: m.phone, email: "", origen: "WhatsApp", presupuesto: "", zona: "", etapa: "nuevo", notas: m.text, fecha: today(), ultimoContacto: today() }, ...prev]);
                  alert("✅ Lead agregado al Pipeline");
                }}>+ Agregar al Pipeline</button>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column" }}>
            {active ? (
              <>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontFamily: "Outfit" }}>
                  {active.name} <span style={{ fontSize: 12, color: "var(--text3)", fontWeight: 400 }}>— {active.phone}</span>
                </div>
                <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
                  <div style={{ maxWidth: "80%", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: "4px 12px 12px 12px", padding: "10px 14px", fontSize: 13 }}>
                    {active.text}
                    <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 4 }}>{active.time}</div>
                  </div>
                </div>
                <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
                  <input className="form-input" placeholder="Escribir respuesta..." value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => e.key === "Enter" && setReply("")} />
                  <button className="btn btn-primary" onClick={() => setReply("")}>Enviar</button>
                </div>
              </>
            ) : (
              <div className="empty"><div className="empty-icon">💬</div><p>Seleccioná una conversación</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// VENDEDORES VIEW (Admin)
// ============================================================
const VendedoresView = ({ ventas, gastos, leads }) => (
  <div>
    <div className="ph-title" style={{ marginBottom: 22 }}>Equipo de Vendedores</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
      {INITIAL_USERS.filter(u => u.role === "vendedor").map(u => {
        const vv = ventas.filter(x => x.vendedorId === u.id);
        const gg = gastos.filter(x => x.vendedorId === u.id);
        const ll = leads.filter(x => x.vendedorId === u.id);
        return (
          <div key={u.id} className="vendor-card">
            <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
              <div className="avatar avatar-lg">{u.avatar}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "Outfit" }}>{u.name}</div>
                <div style={{ fontSize: 12, color: "var(--verde-claro)" }}>{u.zona}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{u.email}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Ventas cerradas", vv.length, "var(--verde-claro)"], ["Leads activos", ll.filter(l => l.etapa !== "perdido").length, "var(--cyan)"], ["Comisiones", formatUSD(vv.reduce((s, v) => s + v.comision, 0)), "var(--cyan)"], ["Total vendido", formatUSD(vv.reduce((s, v) => s + v.montoTotal, 0)), "var(--verde-claro)"]].map(([l, val, col]) => (
                <div key={l} style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "Outfit", fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: col, marginTop: 2, fontFamily: "Outfit" }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
              {vv.filter(v => v.estado === "pendiente").length > 0 && <span className="badge b-yellow">{vv.filter(v => v.estado === "pendiente").length} pendientes</span>}
              <span className="badge b-dark">{gg.length} gastos</span>
              <span className="badge b-verde">{vv.filter(v => v.estado === "aprobada").length} aprobadas</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ============================================================
// RESUMEN VENDEDOR
// ============================================================
const ResumenView = ({ ventas, gastos, leads, user, setVentas }) => {
  const [modal, setModal] = useState(false);
  const vv = ventas.filter(v => v.vendedorId === user.id);
  const gg = gastos.filter(g => g.vendedorId === user.id);
  const ll = leads.filter(l => l.vendedorId === user.id);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 26, padding: "18px 20px", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: "12px" }}>
        <div className="avatar" style={{ width: 50, height: 50, fontSize: 18 }}>{user.avatar}</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 20, fontFamily: "Outfit" }}>Bienvenido, {user.name.split(" ")[0]} 👋</h2>
          <div style={{ fontSize: 13, color: "var(--text3)" }}>{user.zona} · {today()}</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}>+ Cargar Venta</button>
      </div>
      <div className="stats-row">
        <div className="stat c-cyan"><div className="stat-icon">🏆</div><div className="stat-label">Mis Comisiones</div><div className="stat-val">{formatUSD(vv.reduce((s, v) => s + v.comision, 0))}</div></div>
        <div className="stat c-verde"><div className="stat-icon">✅</div><div className="stat-label">Ventas Aprobadas</div><div className="stat-val">{vv.filter(v => v.estado === "aprobada").length}</div><div className="stat-sub">{vv.length} total</div></div>
        <div className="stat c-silver"><div className="stat-icon">🔄</div><div className="stat-label">Leads Activos</div><div className="stat-val">{ll.filter(l => l.etapa !== "perdido").length}</div></div>
        <div className="stat c-yellow"><div className="stat-icon">⏳</div><div className="stat-label">Pendientes</div><div className="stat-val">{vv.filter(v => v.estado === "pendiente").length}</div><div className="stat-sub">en revisión</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>📊 Mi Pipeline</div>
          {PIPELINE_STAGES.map(s => {
            const cnt = ll.filter(l => l.etapa === s.id).length;
            return (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 12 }}>
                  <span style={{ color: "var(--text2)" }}>{s.label}</span>
                  <span style={{ color: "var(--text3)" }}>{cnt}</span>
                </div>
                <div style={{ height: 4, background: "var(--bg4)", borderRadius: 2 }}>
                  <div style={{ width: ll.length > 0 ? (cnt / ll.length * 100) + "%" : "0%", height: "100%", background: s.color, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>💸 Últimos Gastos</div>
          {gg.slice(0, 4).map(g => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <div>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{g.categoria}</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>{g.fecha}</div>
              </div>
              <div style={{ color: "var(--red)", fontWeight: 700 }}>{g.moneda === "USD" ? formatUSD(g.monto) : formatARS(g.monto)}</div>
            </div>
          ))}
          {gg.length === 0 && <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "20px 0" }}>Sin gastos aún</div>}
        </div>
      </div>
      {modal && <ModalVenta onClose={() => setModal(false)} onSave={v => setVentas(p => [v, ...p])} vendedor={user} />}
    </div>
  );
};

// ============================================================
// CONFIG VIEW
// ============================================================
const ConfigView = ({ apiKey, setApiKey }) => {
  const [show, setShow] = useState(false);
  const [tmp, setTmp] = useState(apiKey);
  const [ok, setOk] = useState(false);
  const save = () => { setApiKey(tmp); setOk(true); setTimeout(() => setOk(false), 2500); };
  return (
    <div style={{ maxWidth: 580 }}>
      <div className="ph-title" style={{ marginBottom: 22 }}>Configuración del Sistema</div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">🤖 OpenAI API Key</div>
        <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>
          Usada para que la IA analice automáticamente los comprobantes de gastos que suben los vendedores. Ingresá tu clave de OpenAI.
        </p>
        <div style={{ position: "relative" }}>
          <input className="form-input" type={show ? "text" : "password"} placeholder="sk-proj-..." value={tmp} onChange={e => setTmp(e.target.value)} style={{ paddingRight: 44 }} />
          <button onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text3)" }}>{show ? "🙈" : "👁"}</button>
        </div>
        {ok && <div className="alert alert-ok" style={{ marginTop: 10 }}>✅ API Key guardada</div>}
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={save}>Guardar API Key</button>
      </div>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title">💰 Estructura de Comisiones</div>
        {[["Comisión base", "4% del monto total de venta"], ["Bonus fijo por operación", "+ USD 200"], ["Fórmula aplicada", "(Monto × 0.04) + 200"]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
            <span style={{ color: "var(--text2)" }}>{l}</span>
            <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-title">👥 Usuarios del Sistema</div>
        {INITIAL_USERS.map(u => (
          <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{u.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>@{u.username} · {u.email}</div>
            </div>
            <span className={`badge ${u.role === "admin" ? "b-yellow" : "b-verde"}`}>{u.role === "admin" ? "Admin" : "Vendedor"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// DOCUMENTACIÓN — HOJA DE VISITA
// ============================================================
const DocumentacionView = ({ currentUser, hojas, setHojas }) => {
  const EMPTY = {
    intNombre: "", intTelefono: "", intEmail: "",
    inmId: "", inmDireccion: "", fechaVisita: "", horaVisita: "",
    asesor: "", oficina: "",
    visitaEfectiva: "", montoOfertado: "", condicionesOferta: "",
    observaciones: "", firmaInteresado: "", firmaAsesor: "",
  };
  const [form, setForm] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [editId, setEditId] = useState(null);
  const [view, setView] = useState("lista"); // "lista" | "form"

  const myHojas = currentUser.role === "admin"
    ? hojas
    : hojas.filter(h => h.vendedorId === currentUser.id);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const req = ["intNombre","intTelefono","intEmail","inmId","inmDireccion","fechaVisita","horaVisita","asesor","oficina","visitaEfectiva","firmaInteresado","firmaAsesor"];
    const e = {};
    req.forEach(k => { if (!form[k] || form[k].trim() === "") e[k] = true; });
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = () => {
    if (!validate()) return;
    if (editId) {
      setHojas(prev => prev.map(h => h.id === editId ? { ...h, ...form, vendedorNombre: currentUser.name, fechaCreacion: h.fechaCreacion } : h));
      setEditId(null);
    } else {
      setHojas(prev => [{ id: uid(), vendedorId: currentUser.id, vendedorNombre: currentUser.name, fechaCreacion: today(), ...form }, ...prev]);
    }
    setForm(EMPTY);
    setErrs({});
    setView("lista");
  };

  const handleEditar = (hoja) => {
    const { id, vendedorId, vendedorNombre, fechaCreacion, ...datos } = hoja;
    setForm(datos);
    setEditId(id);
    setView("form");
    setErrs({});
  };

  const handleNueva = () => { setForm(EMPTY); setEditId(null); setErrs({}); setView("form"); };
  const handleCancelar = () => { setForm(EMPTY); setEditId(null); setErrs({}); setView("lista"); };

  const [pdfHoja, setPdfHoja] = useState(null);

  // ---- GENERACIÓN PDF — iframe oculto embebido, sin CDN ni ventana nueva ----
  const handleDescargar = (hoja) => { setPdfHoja(hoja); };

  const generarYImprimir = () => {
    const hoja = pdfHoja;
    const num = hoja.id.slice(-6).toUpperCase();
    const fecha = new Date().toLocaleDateString("es-AR");

    const campo = (label, valor) => `
      <div class="campo">
        <div class="campo-label">${label}</div>
        <div class="campo-valor">${valor || "—"}</div>
      </div>`;

    const fila2 = (l1, v1, l2, v2) => `
      <div class="fila2">
        ${campo(l1, v1)}
        ${campo(l2, v2)}
      </div>`;

    const fila3 = (l1, v1, l2, v2, l3, v3) => `
      <div class="fila3">
        ${campo(l1, v1)}
        ${campo(l2, v2)}
        ${campo(l3, v3)}
      </div>`;

    const seccion = (num, titulo) => `
      <div class="seccion-header">
        <span class="seccion-num">${num}</span>
        <span class="seccion-titulo">${titulo}</span>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Hoja de Visita — ${hoja.intNombre}</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #1e2a22; font-size: 11px; }

  .page { width: 210mm; min-height: 297mm; display: flex; flex-direction: column; }

  /* HEADER */
  .header { background: #0d5c38; padding: 14px 20px 10px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left { }
  .header-brand { font-size: 20px; font-weight: 900; color: #fff; letter-spacing: 1px; line-height: 1; }
  .header-sub { font-size: 8px; color: #96dcb4; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
  .header-right { text-align: right; }
  .header-doc { font-size: 14px; font-weight: 700; color: #fff; }
  .header-num { font-size: 9px; color: #96dcb4; margin-top: 3px; }
  .header-date { font-size: 9px; color: #70c898; margin-top: 1px; }
  .header-line { height: 3px; background: linear-gradient(90deg, #26945f, #4dffa0, #26945f); }

  /* BODY */
  .body { flex: 1; padding: 14px 18px; }

  /* SECCIÓN */
  .seccion { margin-bottom: 10px; }
  .seccion-header { display: flex; align-items: center; gap: 8px; background: #26945f; padding: 5px 10px; border-radius: 4px; margin-bottom: 7px; }
  .seccion-num { background: rgba(255,255,255,0.2); color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; }
  .seccion-titulo { color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }

  /* CAMPOS */
  .campo { background: #f0f5f2; border: 1px solid #c8ddd3; border-radius: 3px; padding: 5px 8px; min-height: 36px; }
  .campo-label { font-size: 7.5px; font-weight: 700; color: #5a8a70; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .campo-valor { font-size: 11px; color: #1e2a22; font-weight: 500; line-height: 1.3; }

  .fila2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .fila3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .fila1 { margin-bottom: 6px; }

  .campo-area { background: #f0f5f2; border: 1px solid #c8ddd3; border-radius: 3px; padding: 5px 8px; min-height: 52px; margin-bottom: 6px; }

  /* VISITA EFECTIVA */
  .visita-si { background: #e8f5ed; border-color: #26945f; }
  .visita-si .campo-valor { color: #0d5c38; font-weight: 700; font-size: 12px; }
  .visita-no { background: #fdf0f0; border-color: #e05050; }
  .visita-no .campo-valor { color: #c0392b; font-weight: 700; font-size: 12px; }

  /* FIRMAS */
  .firmas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px; }
  .firma-box { border: 1px solid #c8ddd3; border-radius: 4px; padding: 6px 8px; min-height: 44px; background: #f0f5f2; }
  .firma-label { font-size: 7.5px; font-weight: 700; color: #5a8a70; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .firma-valor { font-size: 12px; font-weight: 600; color: #0d5c38; font-style: italic; border-top: 1px solid #c8ddd3; padding-top: 5px; margin-top: 6px; }

  /* FOOTER */
  .footer { background: #0d5c38; padding: 8px 20px; text-align: center; margin-top: auto; }
  .footer-main { font-size: 8px; color: #96dcb4; margin-bottom: 2px; }
  .footer-sub { font-size: 7.5px; color: #5a9a78; }

  /* WATERMARK */
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 80px; font-weight: 900; color: rgba(38,148,95,0.04); pointer-events: none; z-index: 0; letter-spacing: 8px; white-space: nowrap; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="watermark">CRISTAL DESARROLLOS</div>
<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="header-brand">CRISTAL</div>
      <div class="header-sub">Desarrollos Inmobiliarios</div>
    </div>
    <div class="header-right">
      <div class="header-doc">HOJA DE VISITA</div>
      <div class="header-num">N° ${num}</div>
      <div class="header-date">Emitido: ${fecha}</div>
    </div>
  </div>
  <div class="header-line"></div>

  <div class="body">

    <div class="seccion">
      ${seccion("1", "Datos del Interesado")}
      <div class="fila1">${campo("Nombre(s) y Apellidos", hoja.intNombre)}</div>
      ${fila2("Teléfono Celular", hoja.intTelefono, "Correo Electrónico", hoja.intEmail)}
    </div>

    <div class="seccion">
      ${seccion("2", "Datos de la Propiedad")}
      ${fila2("ID del Inmueble", hoja.inmId, "Dirección", hoja.inmDireccion)}
      ${fila2("Fecha de Visita", hoja.fechaVisita, "Hora de Visita", hoja.horaVisita)}
    </div>

    <div class="seccion">
      ${seccion("3", "Datos del Asesor Participante")}
      ${fila2("Nombre del Asesor", hoja.asesor, "Oficina", hoja.oficina)}
    </div>

    <div class="seccion">
      ${seccion("4", "Oferta")}
      <div class="fila3">
        <div class="campo ${hoja.visitaEfectiva === 'SÍ' ? 'visita-si' : 'visita-no'}">
          <div class="campo-label">¿Visita Efectiva?</div>
          <div class="campo-valor">${hoja.visitaEfectiva === 'SÍ' ? '✓ SÍ' : '✗ NO'}</div>
        </div>
        ${campo("Monto Ofertado", hoja.montoOfertado ? "USD " + hoja.montoOfertado : "No aplica")}
        ${campo("Condiciones de la Oferta", hoja.condicionesOferta || "—")}
      </div>
    </div>

    <div class="seccion">
      ${seccion("5", "Observaciones")}
      <div class="campo-area">
        <div class="campo-label">Observaciones Generales</div>
        <div class="campo-valor" style="margin-top:4px">${hoja.observaciones || "Sin observaciones adicionales."}</div>
      </div>
    </div>

    <div class="seccion">
      ${seccion("6", "Firmas")}
      <div class="firmas-grid">
        <div class="firma-box">
          <div class="firma-label">Firma del Interesado</div>
          <div class="firma-valor">${hoja.firmaInteresado}</div>
        </div>
        <div class="firma-box">
          <div class="firma-label">Firma del Asesor</div>
          <div class="firma-valor">${hoja.firmaAsesor}</div>
        </div>
      </div>
    </div>

  </div>

  <div class="footer">
    <div class="footer-main">Cristal Desarrollos · Buenos Aires, Argentina · Zona Sur · Zona Norte · Zona Oeste</div>
    <div class="footer-sub">Documento generado el ${fecha} — Sistema CRM Cristal · N° ${num}</div>
  </div>
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

    // Crear iframe oculto dentro del mismo documento — sin abrir ventana nueva
    const iframeId = "cristal-print-frame";
    let iframe = document.getElementById(iframeId);
    if (iframe) iframe.remove();
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
    document.body.appendChild(iframe);

    const iDoc = iframe.contentDocument || iframe.contentWindow.document;
    iDoc.open();
    iDoc.write(html);
    iDoc.close();

    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch(e) {
        // Fallback: descarga como HTML
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Hoja_Visita_${hoja.intNombre.replace(/\s+/g, "_")}_${hoja.fechaCreacion}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    };
  };

  const errBorder = k => errs[k] ? "err" : "";
  const totalErrCount = Object.keys(errs).length;

  if (view === "form") {
    return (
      <div>
        <div className="ph">
          <div style={{ display: "flex", align: "center", gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleCancelar}>← Volver</button>
            <div className="ph-title">{editId ? "Editar Hoja de Visita" : "Nueva Hoja de Visita"}</div>
          </div>
          <button className="btn btn-primary" onClick={handleGuardar}>
            💾 {editId ? "Guardar Cambios" : "Guardar Hoja"}
          </button>
        </div>

        {totalErrCount > 0 && (
          <div className="alert alert-err" style={{ marginBottom: 20 }}>
            ⚠️ Hay {totalErrCount} campo{totalErrCount > 1 ? "s" : ""} obligatorio{totalErrCount > 1 ? "s" : ""} sin completar. Revisá los campos marcados en rojo.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, maxWidth: 780 }}>

          {/* SECCIÓN 1 */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit", color: "var(--verde-claro)" }}>1. Datos del Interesado</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Información personal del potencial comprador</div>
              </div>
            </div>
            <div className="fg">
              <div className="form-group fg-full">
                <label className="form-label">Nombre(s) y Apellidos *</label>
                <input className={`form-input ${errBorder("intNombre")}`} placeholder="Ej: Juan Carlos Pérez" value={form.intNombre} onChange={e => f("intNombre", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono Celular *</label>
                <input className={`form-input ${errBorder("intTelefono")}`} placeholder="Ej: 11-4567-8901" value={form.intTelefono} onChange={e => f("intTelefono", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Correo Electrónico *</label>
                <input className={`form-input ${errBorder("intEmail")}`} type="email" placeholder="cliente@email.com" value={form.intEmail} onChange={e => f("intEmail", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2 */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏠</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit", color: "var(--verde-claro)" }}>2. Datos de la Propiedad</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Información del inmueble visitado</div>
              </div>
            </div>
            <div className="fg">
              <div className="form-group">
                <label className="form-label">ID del Inmueble *</label>
                <input className={`form-input ${errBorder("inmId")}`} placeholder="Ej: CD-SUR-0042" value={form.inmId} onChange={e => f("inmId", e.target.value)} />
              </div>
              <div className="form-group fg-full">
                <label className="form-label">Dirección *</label>
                <input className={`form-input ${errBorder("inmDireccion")}`} placeholder="Calle, número, localidad" value={form.inmDireccion} onChange={e => f("inmDireccion", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Visita *</label>
                <input className={`form-input ${errBorder("fechaVisita")}`} type="date" value={form.fechaVisita} onChange={e => f("fechaVisita", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Hora de Visita *</label>
                <input className={`form-input ${errBorder("horaVisita")}`} type="time" value={form.horaVisita} onChange={e => f("horaVisita", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3 */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👔</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit", color: "var(--verde-claro)" }}>3. Datos del Asesor Participante</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Información del asesor que realizó la visita</div>
              </div>
            </div>
            <div className="fg">
              <div className="form-group">
                <label className="form-label">Nombre del Asesor *</label>
                <input className={`form-input ${errBorder("asesor")}`} placeholder="Nombre completo del asesor" value={form.asesor} onChange={e => f("asesor", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Oficina *</label>
                <input className={`form-input ${errBorder("oficina")}`} placeholder="Ej: Sucursal Zona Sur" value={form.oficina} onChange={e => f("oficina", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4 */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💼</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit", color: "var(--verde-claro)" }}>4. Oferta</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Resultado e información de la oferta</div>
              </div>
            </div>
            <div className="fg">
              <div className="form-group fg-full">
                <label className="form-label">¿Visita Efectiva? *</label>
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {["SÍ", "NO"].map(op => (
                    <div
                      key={op}
                      onClick={() => f("visitaEfectiva", op)}
                      style={{
                        flex: 1, padding: "11px 0", textAlign: "center", cursor: "pointer",
                        borderRadius: 8, fontWeight: 700, fontSize: 14, fontFamily: "Outfit",
                        border: `2px solid ${form.visitaEfectiva === op ? (op === "SÍ" ? "var(--verde-claro)" : "var(--red)") : errs.visitaEfectiva ? "var(--red)" : "var(--border)"}`,
                        background: form.visitaEfectiva === op ? (op === "SÍ" ? "var(--verde-suave)" : "var(--red-dim)") : "var(--bg3)",
                        color: form.visitaEfectiva === op ? (op === "SÍ" ? "var(--verde-claro)" : "var(--red)") : "var(--text3)",
                        transition: "all 0.15s",
                      }}
                    >
                      {op === "SÍ" ? "✓ SÍ" : "✗ NO"}
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Monto Ofertado (si aplica)</label>
                <div className="pfx-wrap"><span className="pfx">USD</span><input className="form-input" placeholder="0" value={form.montoOfertado} onChange={e => f("montoOfertado", e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Condiciones de la Oferta</label>
                <input className="form-input" placeholder="Ej: Contado, 50% anticipo..." value={form.condicionesOferta} onChange={e => f("condicionesOferta", e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: OBSERVACIONES */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📝</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit", color: "var(--verde-claro)" }}>5. Observaciones</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Notas adicionales sobre la visita</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Observaciones generales</label>
              <textarea className="form-textarea" style={{ minHeight: 90 }} placeholder="Detalles relevantes de la visita, estado del inmueble, comentarios del interesado..." value={form.observaciones} onChange={e => f("observaciones", e.target.value)} />
            </div>
          </div>

          {/* SECCIÓN 6: FIRMAS */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✍️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "Outfit", color: "var(--verde-claro)" }}>6. Firmas</div>
                <div style={{ fontSize: 11, color: "var(--text3)" }}>Nombre completo como firma de conformidad</div>
              </div>
            </div>
            <div className="fg">
              <div className="form-group">
                <label className="form-label">Firma del Interesado *</label>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Escribir nombre y apellido completo</div>
                <input
                  className={`form-input ${errBorder("firmaInteresado")}`}
                  placeholder="Nombre y Apellido del interesado"
                  value={form.firmaInteresado}
                  onChange={e => f("firmaInteresado", e.target.value)}
                  style={{ fontStyle: "italic", letterSpacing: "0.3px" }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Firma del Asesor *</label>
                <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>Escribir nombre y apellido completo</div>
                <input
                  className={`form-input ${errBorder("firmaAsesor")}`}
                  placeholder="Nombre y Apellido del asesor"
                  value={form.firmaAsesor}
                  onChange={e => f("firmaAsesor", e.target.value)}
                  style={{ fontStyle: "italic", letterSpacing: "0.3px" }}
                />
              </div>
            </div>
          </div>

          {/* BOTONES FINALES */}
          <div style={{ display: "flex", gap: 12, paddingBottom: 32 }}>
            <button className="btn btn-ghost" onClick={handleCancelar} style={{ flex: 1 }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleGuardar} style={{ flex: 3, fontSize: 15, padding: "13px" }}>
              💾 {editId ? "Guardar Cambios" : "Guardar Hoja de Visita"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- VISTA LISTA ----
  return (
    <div>
      <div className="ph">
        <div>
          <div className="ph-title">Documentación</div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>Hojas de visita — {myHojas.length} registrada{myHojas.length !== 1 ? "s" : ""}</div>
        </div>
        <button className="btn btn-primary" onClick={handleNueva}>+ Nueva Hoja de Visita</button>
      </div>

      {myHojas.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>📋</div>
          <h3 style={{ fontFamily: "Outfit", marginBottom: 8, color: "var(--text)" }}>Sin hojas de visita</h3>
          <p style={{ fontSize: 14, color: "var(--text3)", marginBottom: 24 }}>Registrá la primera hoja de visita para poder descargarla en PDF.</p>
          <button className="btn btn-primary" onClick={handleNueva}>+ Crear Primera Hoja</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {myHojas.map(hoja => (
            <div key={hoja.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--verde-suave)", border: "1px solid var(--verde-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📋</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", fontFamily: "Outfit" }}>{hoja.intNombre}</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>📞 {hoja.intTelefono}</span>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>🏠 {hoja.inmId}</span>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>📅 {hoja.fechaVisita}</span>
                  {currentUser.role === "admin" && <span style={{ fontSize: 12, color: "var(--verde-claro)", fontWeight: 600 }}>👤 {hoja.vendedorNombre}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span className={`badge ${hoja.visitaEfectiva === "SÍ" ? "b-cyan" : "b-red"}`}>{hoja.visitaEfectiva === "SÍ" ? "✓ Visita Efectiva" : "✗ No Efectiva"}</span>
                  <span className="badge b-dark">N° {hoja.id.slice(-6).toUpperCase()}</span>
                  <span className="badge b-dark">Creada: {hoja.fechaCreacion}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => handleEditar(hoja)}>✏️ Editar</button>
                <button className="btn btn-primary btn-sm" onClick={() => handleDescargar(hoja)}>📄 Ver PDF</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL PREVISUALIZACIÓN PDF */}
      {pdfHoja && (
        <div className="overlay" style={{ zIndex: 2000 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--verde-border)", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(77,255,160,0.08)" }}>
            {/* Header modal */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg3)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "Outfit", color: "var(--text)" }}>📄 Hoja de Visita — {pdfHoja.intNombre}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>N° {pdfHoja.id.slice(-6).toUpperCase()} · {pdfHoja.fechaCreacion}</div>
              </div>
              <div className="modal-close" onClick={() => setPdfHoja(null)}>✕</div>
            </div>

            {/* Previsualización compacta */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* Header documento */}
              <div style={{ background: "#0d5c38", borderRadius: "8px 8px 0 0", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>CRISTAL</div>
                  <div style={{ fontSize: 8, color: "#96dcb4", letterSpacing: 2, textTransform: "uppercase", marginTop: 2 }}>Desarrollos Inmobiliarios</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>HOJA DE VISITA</div>
                  <div style={{ fontSize: 9, color: "#96dcb4", marginTop: 2 }}>N° {pdfHoja.id.slice(-6).toUpperCase()}</div>
                  <div style={{ fontSize: 9, color: "#70c898" }}>{new Date().toLocaleDateString("es-AR")}</div>
                </div>
              </div>
              <div style={{ height: 3, background: "linear-gradient(90deg, #26945f, #4dffa0, #26945f)", marginBottom: 12 }} />

              {/* Secciones preview */}
              {[
                { num: "1", titulo: "Datos del Interesado", campos: [["Nombre(s) y Apellidos", pdfHoja.intNombre, true], ["Teléfono Celular", pdfHoja.intTelefono, false], ["Correo Electrónico", pdfHoja.intEmail, false]] },
                { num: "2", titulo: "Datos de la Propiedad", campos: [["ID del Inmueble", pdfHoja.inmId, false], ["Dirección", pdfHoja.inmDireccion, true], ["Fecha de Visita", pdfHoja.fechaVisita, false], ["Hora de Visita", pdfHoja.horaVisita, false]] },
                { num: "3", titulo: "Asesor Participante", campos: [["Nombre del Asesor", pdfHoja.asesor, false], ["Oficina", pdfHoja.oficina, false]] },
                { num: "4", titulo: "Oferta", campos: [["¿Visita Efectiva?", pdfHoja.visitaEfectiva, false], ["Monto Ofertado", pdfHoja.montoOfertado ? "USD " + pdfHoja.montoOfertado : "—", false], ["Condiciones", pdfHoja.condicionesOferta || "—", false]] },
                { num: "5", titulo: "Observaciones", campos: [["Observaciones Generales", pdfHoja.observaciones || "—", true]] },
                { num: "6", titulo: "Firmas", campos: [["Firma del Interesado", pdfHoja.firmaInteresado, false], ["Firma del Asesor", pdfHoja.firmaAsesor, false]] },
              ].map(sec => (
                <div key={sec.num} style={{ marginBottom: 12 }}>
                  <div style={{ background: "var(--verde-principal)", borderRadius: 4, padding: "5px 10px", display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                    <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>{sec.num}</span>
                    <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{sec.titulo}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: sec.campos.some(c => c[2]) ? "1fr" : "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                    {sec.campos.map(([label, valor, full]) => (
                      <div key={label} style={{ background: "var(--bg3)", border: "1px solid var(--verde-border)", borderRadius: 4, padding: "6px 10px", gridColumn: full ? "1/-1" : "auto" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: label.includes("Firma") ? "var(--verde-claro)" : "var(--text)", fontStyle: label.includes("Firma") ? "italic" : "normal" }}>{valor || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Footer preview */}
              <div style={{ background: "#0d5c38", borderRadius: "0 0 8px 8px", padding: "8px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#96dcb4" }}>Cristal Desarrollos · Buenos Aires, Argentina · Zona Sur · Zona Norte · Zona Oeste</div>
              </div>
            </div>

            {/* Botones acción */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, background: "var(--bg2)" }}>
              <button className="btn btn-ghost" onClick={() => setPdfHoja(null)} style={{ flex: 1 }}>Cerrar</button>
              <button
                className="btn btn-primary"
                onClick={generarYImprimir}
                style={{ flex: 2, gap: 8, fontSize: 14 }}
              >
                🖨️ Imprimir / Guardar como PDF
              </button>
            </div>

            {/* Instruccción */}
            <div style={{ padding: "10px 24px 16px", background: "var(--bg2)" }}>
              <div style={{ background: "var(--verde-suave)", border: "1px solid var(--verde-border)", borderRadius: 8, padding: "9px 13px", fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                💡 <strong>Cómo guardar como PDF:</strong> Al hacer clic en "Imprimir", en el diálogo del navegador seleccioná <strong>"Guardar como PDF"</strong> (o "Microsoft Print to PDF") como destino de impresión.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// APP PRINCIPAL
// ============================================================
export default function CristalCRM() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState(null);
  
  // LocalStorage persistence para datos
  const [ventas, setVentas] = useState(() => {
    const saved = localStorage.getItem('cristal_ventas');
    return saved ? JSON.parse(saved) : [
      { id: "v1", vendedorId: "vend-1", vendedorNombre: "Lucas Martínez", fecha: "2025-01-15", cliente: { nombre: "Roberto Pérez", dni: "30.123.456", telefono: "11-4567-8901", email: "roberto@mail.com", direccion: "Av. San Martín 456", ocupacion: "Comerciante" }, montoReserva: 5000, montoTotal: 120000, financiado: true, cuotas: 24, valorCuota: 4500, comision: 5000, estado: "aprobada", proyecto: "Torres del Sur I", zona: "Zona Sur", notas: "Cliente interesado en piso 8", comprobante: "reserva_perez.pdf" },
      { id: "v2", vendedorId: "vend-2", vendedorNombre: "Sofía Ramírez", fecha: "2025-01-18", cliente: { nombre: "María González", dni: "25.987.654", telefono: "11-2345-6789", email: "maria@mail.com", direccion: "", ocupacion: "" }, montoReserva: 8000, montoTotal: 95000, financiado: false, cuotas: null, valorCuota: null, comision: 4000, estado: "pendiente", proyecto: "Barrio Jardín Norte", zona: "Zona Norte", notas: "", comprobante: null },
    ];
  });
  
  const [gastos, setGastos] = useState(() => {
    const saved = localStorage.getItem('cristal_gastos');
    return saved ? JSON.parse(saved) : [
      { id: "g1", vendedorId: "vend-1", vendedorNombre: "Lucas Martínez", fecha: "2025-01-16", categoria: "Meta Ads", descripcion: "Campaña enero zona sur — 3 conjuntos de anuncios", monto: 350, moneda: "USD", comprobante: "factura_meta.pdf", aiInterpretacion: null },
      { id: "g2", vendedorId: "vend-1", vendedorNombre: "Lucas Martínez", fecha: "2025-01-17", categoria: "Combustible", descripcion: "Nafta — semana del 15 al 21", monto: 18500, moneda: "ARS", comprobante: null, aiInterpretacion: null },
      { id: "g3", vendedorId: "vend-2", vendedorNombre: "Sofía Ramírez", fecha: "2025-01-19", categoria: "Google Ads", descripcion: "Campaña Google zona norte Q1", monto: 200, moneda: "USD", comprobante: "factura_google.pdf", aiInterpretacion: { monto_detectado: 200, moneda: "USD", descripcion_resumida: "Google Ads enero", categoria_sugerida: "Google Ads", valido: true } },
    ];
  });
  
  const [leads, setLeads] = useState(() => {
    const saved = localStorage.getItem('cristal_leads');
    return saved ? JSON.parse(saved) : [
      { id: "l1", vendedorId: "vend-1", nombre: "Carlos Suárez", telefono: "11-9876-5432", email: "carlos@gmail.com", origen: "Meta Ads", presupuesto: "USD 80.000", zona: "Zona Sur", etapa: "contactado", notas: "Interesado en lote de 300m2", fecha: "2025-01-20", ultimoContacto: "2025-01-22" },
      { id: "l2", vendedorId: "vend-2", nombre: "Ana López", telefono: "11-5432-1098", email: "ana@gmail.com", origen: "Google Ads", presupuesto: "USD 120.000", zona: "Zona Norte", etapa: "visita", notas: "Prefiere departamento 2 ambientes", fecha: "2025-01-19", ultimoContacto: "2025-01-21" },
      { id: "l3", vendedorId: "vend-1", nombre: "Diego Fernández", telefono: "11-1234-5678", email: "diego@mail.com", origen: "WhatsApp", presupuesto: "USD 65.000", zona: "Zona Oeste", etapa: "nuevo", notas: "", fecha: "2025-01-23", ultimoContacto: "2025-01-23" },
      { id: "l4", vendedorId: "vend-3", nombre: "Valentina Torres", telefono: "11-8765-4321", email: "valen@mail.com", origen: "General", presupuesto: "USD 200.000", zona: "Zona Norte", etapa: "propuesta", notas: "Quiere 2 unidades para inversión", fecha: "2025-01-10", ultimoContacto: "2025-01-20" },
    ];
  });
  
  const [hojas, setHojas] = useState(() => {
    const saved = localStorage.getItem('cristal_hojas');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('cristal_apiKey') || "";
  });
  
  const [waConnected, setWaConnected] = useState(() => {
    return localStorage.getItem('cristal_waConnected') === 'true';
  });

  const [menuOpen, setMenuOpen] = useState(false);

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem('cristal_ventas', JSON.stringify(ventas));
  }, [ventas]);

  useEffect(() => {
    localStorage.setItem('cristal_gastos', JSON.stringify(gastos));
  }, [gastos]);

  useEffect(() => {
    localStorage.setItem('cristal_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('cristal_hojas', JSON.stringify(hojas));
  }, [hojas]);

  useEffect(() => {
    localStorage.setItem('cristal_apiKey', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('cristal_waConnected', waConnected.toString());
  }, [waConnected]);

  useEffect(() => {
    if (user) setActive(user.role === "admin" ? "dashboard" : "resumen");
  }, [user]);

  if (!user) return <><style>{styles}</style><Login onLogin={setUser} /></>;

  const pendientes = ventas.filter(v => v.estado === "pendiente").length;

  const titles = {
    dashboard: "Dashboard General", ventas: "Gestión de Ventas", gastos: "Gastos del Equipo",
    pipeline: "Pipeline de Leads", vendedores: "Equipo de Vendedores", config: "Configuración",
    resumen: "Mi Resumen", "mis-ventas": "Mis Ventas", "mis-gastos": "Mis Gastos",
    whatsapp: "WhatsApp", documentacion: "Documentación",
  };

  const renderPage = () => {
    switch (active) {
      case "dashboard": return <Dashboard ventas={ventas} gastos={gastos} leads={leads} />;
      case "ventas": return <VentasView ventas={ventas} setVentas={setVentas} currentUser={user} />;
      case "gastos": return <GastosView gastos={gastos} setGastos={setGastos} currentUser={user} apiKey={apiKey} />;
      case "pipeline": return <PipelineView leads={leads} setLeads={setLeads} currentUser={user} />;
      case "vendedores": return <VendedoresView ventas={ventas} gastos={gastos} leads={leads} />;
      case "config": return <ConfigView apiKey={apiKey} setApiKey={setApiKey} />;
      case "resumen": return <ResumenView ventas={ventas} gastos={gastos} leads={leads} user={user} setVentas={setVentas} />;
      case "mis-ventas": return <VentasView ventas={ventas} setVentas={setVentas} currentUser={user} />;
      case "mis-gastos": return <GastosView gastos={gastos} setGastos={setGastos} currentUser={user} apiKey={apiKey} />;
      case "whatsapp": return <WAView connected={waConnected} setConnected={setWaConnected} leads={leads} setLeads={setLeads} currentUser={user} />;
      case "documentacion": return <DocumentacionView currentUser={user} hojas={hojas} setHojas={setHojas} />;
      default: return null;
    }
  };

  const nav = user.role === "admin"
    ? [
        { id: "dashboard", label: "Dashboard", icon: "🏠" },
        { id: "ventas",    label: "Ventas",    icon: "💰", badge: pendientes || null },
        { id: "pipeline",  label: "Pipeline",  icon: "🔄" },
        { id: "gastos",    label: "Gastos",    icon: "🚗" },
        { id: "vendedores",label: "Equipo",    icon: "👥" },
        { id: "documentacion", label: "Docs",  icon: "📄" },
        { id: "config",    label: "Config",    icon: "⚙️" },
      ]
    : [
        { id: "resumen",   label: "Inicio",    icon: "🏠" },
        { id: "mis-ventas",label: "Ventas",    icon: "💰" },
        { id: "pipeline",  label: "Pipeline",  icon: "🔄" },
        { id: "mis-gastos",label: "Gastos",    icon: "🚗" },
        { id: "documentacion", label: "Docs",  icon: "📄" },
        { id: "whatsapp",  label: "WhatsApp",  icon: "💬" },
      ];

  // Bottom nav: mostrar solo los primeros 5, el resto en el menú lateral
  const bottomNav = nav.slice(0, 5);

  const handleNavMobile = (id) => {
    setActive(id);
    setMenuOpen(false);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app">

        {/* SIDEBAR DESKTOP + MOBILE DRAWER */}
        <Sidebar
          user={user}
          active={active}
          setActive={handleNavMobile}
          onLogout={() => setUser(null)}
          pendientes={user.role === "admin" ? pendientes : 0}
          mobileOpen={menuOpen}
        />

        {/* OVERLAY OSCURO cuando el menú mobile está abierto */}
        {menuOpen && (
          <div className="mobile-overlay" onClick={() => setMenuOpen(false)} />
        )}

        <div className="main">
          {/* TOPBAR */}
          <div className="topbar">
            {/* Hamburguesa — solo visible en mobile */}
            <div className="hamburger" onClick={() => setMenuOpen(o => !o)}>
              {menuOpen ? "✕" : "☰"}
            </div>

            <div className="topbar-left">
              <h2>{titles[active] || ""}</h2>
              <p style={{ fontSize: 11 }}>Cristal · {user.role === "admin" ? "Admin" : "Vendedor"}</p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {user.role === "admin" && pendientes > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setActive("ventas")} style={{ gap: 6 }}>
                  <div className="notif-pulse" />
                  <span style={{ fontSize: 12 }}>{pendientes}</span>
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{user.avatar}</div>
                <span style={{ fontSize: 13, color: "var(--text2)", fontWeight: 500 }}>{user.name.split(" ")[0]}</span>
              </div>
            </div>
          </div>

          {/* CONTENIDO */}
          <div className="page">{renderPage()}</div>
        </div>

        {/* BOTTOM NAV — solo mobile */}
        <div className="mobile-bottom-nav">
          {bottomNav.map(item => (
            <div
              key={item.id}
              className={`mobile-nav-item ${active === item.id ? "active" : ""}`}
              onClick={() => setActive(item.id)}
            >
              {item.badge ? <div className="mobile-nav-badge">{item.badge}</div> : null}
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </div>
          ))}
          {/* Botón "Más" para el resto del menú */}
          {nav.length > 5 && (
            <div
              className={`mobile-nav-item ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen(o => !o)}
            >
              <span className="mobile-nav-icon">⋯</span>
              <span className="mobile-nav-label">Más</span>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
