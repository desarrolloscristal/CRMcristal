# Cristal WhatsApp Server

Servidor Node.js con Baileys para manejar múltiples sesiones de WhatsApp en el CRM Cristal.

## Deploy en Railway

1. Subí esta carpeta a un repo de GitHub (ej: `cristal-whatsapp-server`)
2. En Railway → New Project → Deploy from GitHub → seleccioná ese repo
3. En **Variables** (Settings → Variables) agregá:
   ```
   CRM_ORIGIN=https://crm.cristaldesarrollos.com
   PORT=3001
   ```
4. Railway te da una URL pública tipo: `https://cristal-whatsapp-server-production.up.railway.app`
5. Copiá esa URL — la vas a necesitar en el CRM

## Variables de entorno

| Variable | Valor |
|----------|-------|
| `CRM_ORIGIN` | URL de tu CRM (sin slash al final) |
| `PORT` | 3001 (Railway lo setea automático) |

## Endpoints

- `GET /` — Health check
- `GET /api/sessions` — Estado de todas las sesiones
- `GET /api/sessions/:vendedorId` — Estado de una sesión

## WebSocket eventos

**Frontend → Servidor:**
- `wa:join` — unirse al room del vendedor
- `wa:connect` — iniciar conexión / generar QR
- `wa:send` — enviar mensaje
- `wa:disconnect` — cerrar sesión

**Servidor → Frontend:**
- `wa:qr` — QR en base64 para escanear
- `wa:status` — estado de la sesión (connecting/qr/connected/disconnected)
- `wa:message` — mensaje entrante
- `wa:sent` — confirmación de envío
- `wa:error` — error
