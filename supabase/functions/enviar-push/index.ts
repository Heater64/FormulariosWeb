// ============================================================================
// Edge Function: enviar-push
// ============================================================================
// Envía avisos de FormsBiblicos a los destinatarios de una notificación por
// dos canales independientes:
//   • Android nativo (FCM HTTP v1) → dispositivos_notificacion
//   • PWA en navegador (Web Push con VAPID) → suscripciones_web_push
//
// CONTRATO (llamada desde la app con el JWT del usuario autenticado):
//
//   POST /functions/v1/enviar-push
//   Authorization: Bearer <JWT del usuario>   (verify_jwt: true, por defecto)
//
//   {
//     "notificaciones": [
//       {
//         "usuario_id": "uuid del destinatario",
//         "tipo":       "desafio.creado",
//         "categoria":  "desafios",
//         "titulo":     "Ana te ha desafiado",
//         "cuerpo":     "Mazo: Salmos 23",
//         "datos":      { "desafio_id": 42, ... },   // opcional, aplanado en data
//         "url":        "/desafio/42",                // opcional, navegación al pulsar
//         "id":         "uuid de la fila en notificaciones"  // opcional, dedupe
//       }
//     ]
//   }
//
//   Respuesta: { "enviados": n, "sinTokens": m, "errores": [...] }
//
// SECRETS (Dashboard Supabase → Edge Functions → Secrets):
//   - SUPABASE_SERVICE_ROLE_KEY  (Settings → API → service_role)
//   - FCM_SERVICE_ACCOUNT        (opcional: JSON completo de la cuenta de
//                                 servicio de Firebase: project_id,
//                                 client_email, private_key). Sin él no se
//                                 envían avisos nativos.
//   - VAPID_PUBLIC_KEY           (opcional: clave pública VAPID; la misma que
//                                 window.ENV.VAPID_PUBLIC_KEY en la PWA)
//   - VAPID_PRIVATE_KEY          (opcional: clave privada VAPID; NUNCA al cliente)
//   - VAPID_SUBJECT              (opcional: "mailto:..." de contacto VAPID)
//   Web Push solo se activa si están las tres claves VAPID.
//
// Nota de diseño: la app llama a esta función DIRECTAMENTE con su JWT (en
// lugar de un trigger SQL con pg_net) para no almacenar la service_role key
// ni un secreto compartido dentro de la base de datos ni en el repositorio.
// Cualquier usuario autenticado puede enviar (mismo modelo de confianza que
// la RPC enviar_notificacion ya existente).
// ============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "";

// Solo usuarios autenticados (mismo modelo de confianza que la RPC
// enviar_notificacion). Con verify_jwt activado, el runtime ya validó la
// firma del JWT; aquí exigimos además que sea un JWT de USUARIO (sub
// presente), lo que descarta llamadas con la anon key pública.
function usuarioAutenticado(req) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const parte = token.split(".")[1];
    const b64 = parte.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const json = decodeURIComponent(escape(bin));
    const claims = JSON.parse(json);
    return claims.sub || null;
  } catch {
    return null;
  }
}

// JSON de la cuenta de servicio de Firebase (secret FCM_SERVICE_ACCOUNT).
function cuentaServicio() {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// FCM HTTP v1 — autenticación OAuth2 con la cuenta de servicio (RS256)
// ----------------------------------------------------------------------------

function b64url(data) {
  let bin = "";
  const bytes = new Uint8Array(data);
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function firmarJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const encoder = new TextEncoder();
  const datos = `${b64url(encoder.encode(JSON.stringify(header)))}.${b64url(encoder.encode(JSON.stringify(claims)))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(datos));
  return `${datos}.${b64url(new Uint8Array(firma))}`;
}

async function obtenerAccessToken(serviceAccount) {
  const jwt = await firmarJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const texto = await res.text();
    throw new Error(`OAuth2 FCM falló (${res.status}): ${texto.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.access_token;
}

// ----------------------------------------------------------------------------
// Mapeo categoría → canal Android (los canales se crean en la app con el
// mismo id: js/services/push-notification-service.js)
// ----------------------------------------------------------------------------

const CANALES = {
  desafios: "desafios",
  examenes: "examenes",
  estudio: "recordatorios",
  grupos: "general",
  logros: "general",
  sistema: "sistema",
  anuncios: "sistema",
};

function canalDe(categoria) {
  return CANALES[categoria] || "general";
}

// ----------------------------------------------------------------------------
// Construcción del mensaje FCM
// ----------------------------------------------------------------------------

// Los valores de `data` en FCM deben ser cadenas y el payload total < 4 KB.
function aplanarDatos(notif) {
  const data = {
    tipo: String(notif.tipo || "generica").slice(0, 80),
    categoria: String(notif.categoria || "sistema").slice(0, 40),
    url: notif.url ? String(notif.url).slice(0, 500) : "",
    notifId: notif.id ? String(notif.id) : "",
  };
  if (notif.datos && typeof notif.datos === "object") {
    for (const [clave, valor] of Object.entries(notif.datos)) {
      if (valor === null || valor === undefined) continue;
      const serializado = typeof valor === "object" ? JSON.stringify(valor) : String(valor);
      data[`d.${clave}`] = serializado.slice(0, 500);
      if (JSON.stringify(data).length > 3500) break; // margen bajo el límite de 4 KB
    }
  }
  return data;
}

function mensajeFcm(token, notif, accessToken) {
  const data = aplanarDatos(notif);

  // Los RETOS (desafio.creado) viajan como mensaje SOLO-DATOS: en segundo
  // plano FCM no llama a onMessageReceived cuando el mensaje lleva bloque
  // `notification` (lo muestra el sistema sin botones). Sin ese bloque, el
  // servicio nativo NotificacionesService construye la notificación con los
  // botones Aceptar/Rechazar, y al pulsarlos la app responde el reto sin
  // abrirse manualmente.
  const esReto = String(notif.tipo || "") === "desafio.creado";

  const mensaje = {
    message: {
      token,
      data,
      ...(esReto
        ? {}
        : {
            notification: {
              title: String(notif.titulo || "FormsBiblicos").slice(0, 200),
              body: String(notif.cuerpo || "").slice(0, 500),
            },
          }),
      android: {
        priority: "high",
        ...(esReto
          ? {}
          : {
              notification: {
                channelId: canalDe(notif.categoria),
                priority: "high",
                tag: notif.id ? String(notif.id) : undefined,
              },
            }),
      },
    },
  };
  return {
    url: `https://fcm.googleapis.com/v1/projects/${accessToken.projectId}/messages:send`,
    options: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken.accessToken}`,
      },
      body: JSON.stringify(mensaje),
    },
  };
}

// ----------------------------------------------------------------------------
// Web Push (PWA) — payload JSON que consume public/sw.js (evento push)
// ----------------------------------------------------------------------------

function payloadWeb(notif) {
  return JSON.stringify({
    title: String(notif.titulo || "FormsBiblicos").slice(0, 200),
    body: String(notif.cuerpo || "").slice(0, 500),
    url: notif.url ? String(notif.url).slice(0, 500) : "/",
    tag: notif.id ? String(notif.id) : String(notif.tipo || "generica"),
  });
}

// ----------------------------------------------------------------------------
// Handler
// ----------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cabeceras = { "Content-Type": "application/json" };

  // Exigir un JWT de usuario autenticado (no basta la anon key pública)
  if (!usuarioAutenticado(req)) {
    return new Response(JSON.stringify({ error: "No autorizado: se requiere un usuario autenticado" }), {
      status: 401,
      headers: cabeceras,
    });
  }

  // CORS simple (los clientes Capacitor no lo necesitan, pero no estorba)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...cabeceras, "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY no está configurado" }), {
      status: 500,
      headers: cabeceras,
    });
  }

  let cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "JSON inválido" }), { status: 400, headers: cabeceras });
  }

  const notificaciones = Array.isArray(cuerpo?.notificaciones) ? cuerpo.notificaciones : [];
  if (!notificaciones.length) {
    return new Response(JSON.stringify({ error: "No hay notificaciones para enviar" }), {
      status: 400,
      headers: cabeceras,
    });
  }

  const errores = [];

  // 1) FCM: OAuth2 → token de acceso de Firebase (solo si hay cuenta de
  //    servicio). Un fallo aquí no impide los avisos Web Push.
  const serviceAccount = cuentaServicio();
  let accessToken = null;
  if (serviceAccount) {
    try {
      accessToken = await obtenerAccessToken(serviceAccount);
    } catch (e) {
      errores.push({ canal: "fcm", error: `No se pudo autenticar con FCM: ${e.message}` });
    }
  }

  // 2) Web Push: configurar VAPID solo si hay las tres claves.
  let webPushActivo = false;
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT) {
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      webPushActivo = true;
    } catch (e) {
      errores.push({ canal: "web", error: `VAPID no válido: ${e.message}` });
    }
  }

  // 3) Suscriptores activos de los destinatarios (una consulta por canal)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const usuarios = [...new Set(notificaciones.map((n) => n?.usuario_id).filter(Boolean))];
  let dispositivos = [];
  let suscripciones = [];
  try {
    const { data, error } = await supabase
      .from("dispositivos_notificacion")
      .select("id, usuario_id, token_fcm, activo, ultima_actividad")
      .in("usuario_id", usuarios)
      .eq("activo", true);
    if (error) throw error;
    dispositivos = data || [];
    const { data: webs, error: errorWeb } = await supabase
      .from("suscripciones_web_push")
      .select("id, usuario_id, endpoint, p256dh, auth")
      .in("usuario_id", usuarios)
      .eq("activo", true);
    if (errorWeb) throw errorWeb;
    suscripciones = webs || [];
  } catch (e) {
    return new Response(JSON.stringify({ error: `No se pudieron leer los suscriptores: ${e.message}` }), {
      status: 500,
      headers: cabeceras,
    });
  }

  const tokensPorUsuario = new Map();
  for (const d of dispositivos) {
    const lista = tokensPorUsuario.get(d.usuario_id) || [];
    lista.push(d);
    tokensPorUsuario.set(d.usuario_id, lista);
  }

  const webPorUsuario = new Map();
  for (const s of suscripciones) {
    const lista = webPorUsuario.get(s.usuario_id) || [];
    lista.push(s);
    webPorUsuario.set(s.usuario_id, lista);
  }

  // 4) Envío
  const credenciales = accessToken ? { accessToken, projectId: serviceAccount.project_id } : null;
  let enviados = 0;
  let sinTokens = 0;

  for (const notif of notificaciones) {
    const tokens = (credenciales && tokensPorUsuario.get(notif.usuario_id)) || [];
    const webs = (webPushActivo && webPorUsuario.get(notif.usuario_id)) || [];
    if (!tokens.length && !webs.length) {
      sinTokens += 1;
      continue;
    }

    // 4a) Android nativo (FCM)
    for (const dispositivo of tokens) {
      try {
        const { url, options } = mensajeFcm(dispositivo.token_fcm, notif, credenciales);
        const res = await fetch(url, options);
        if (res.ok) {
          enviados += 1;
          // Refrescar actividad del dispositivo tras un envío con éxito
          await supabase
            .from("dispositivos_notificacion")
            .update({ ultima_actividad: new Date().toISOString() })
            .eq("id", dispositivo.id);
        } else {
          const texto = await res.text();
          const esNoRegistrado = /UNREGISTERED|NOT_FOUND|registration-token/i.test(texto);
          if (esNoRegistrado) {
            // Token inválido → desactivar para no reintentar en vano
            await supabase
              .from("dispositivos_notificacion")
              .update({ activo: false, ultimo_error: "UNREGISTERED" })
              .eq("id", dispositivo.id);
            errores.push({ canal: "fcm", token: dispositivo.token_fcm.slice(0, 12) + "…", error: "UNREGISTERED" });
          } else {
            errores.push({ canal: "fcm", token: dispositivo.token_fcm.slice(0, 12) + "…", error: `FCM ${res.status}` });
          }
        }
      } catch (e) {
        errores.push({ canal: "fcm", token: dispositivo.token_fcm.slice(0, 12) + "…", error: e.message });
      }
    }

    // 4b) PWA (Web Push)
    for (const sub of webs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadWeb(notif),
          { TTL: 3600, urgency: "normal" },
        );
        enviados += 1;
        await supabase
          .from("suscripciones_web_push")
          .update({ ultima_actividad: new Date().toISOString(), ultimo_error: null })
          .eq("id", sub.id);
      } catch (e) {
        const estado = e?.statusCode;
        // 404/410: el navegador ya no tiene la suscripción → desactivarla
        if (estado === 404 || estado === 410) {
          await supabase
            .from("suscripciones_web_push")
            .update({ activo: false, ultimo_error: `HTTP ${estado}` })
            .eq("id", sub.id);
        }
        errores.push({
          canal: "web",
          endpoint: sub.endpoint.slice(0, 40) + "…",
          error: estado ? `Web Push ${estado}` : e.message,
        });
      }
    }
  }

  return new Response(JSON.stringify({ enviados, sinTokens, errores }), {
    status: 200,
    headers: cabeceras,
  });
});
