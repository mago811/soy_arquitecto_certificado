/* ============================================================
   sync.js — sincronización de progreso con Neon vía /api/progress
   localStorage sigue siendo la fuente primaria de lectura: esta capa
   solo empuja y trae diferencias. El blob único de estado se descompone
   en claves lógicas SOLO para el viaje (last-write-wins por clave);
   el formato de localStorage no cambia.
   ============================================================ */

"use strict";

(() => {
  const CLAVES = ["tasks", "skipped", "respuestas", "historial", "cards", "teoria"];
  const META_KEY = "ccarf-sync-meta";     // { updatedAt: { clave: iso } }
  const TOKEN_KEY = "ccarf-sync-token";
  const PROMPTED_KEY = "ccarf-sync-prompted";
  const API = "api/progress";
  const DEBOUNCE_MS = 3500;
  const EPOCH = "1970-01-01T00:00:00.000Z";

  let meta = cargarMeta();
  let lastSeen = {};        // clave -> JSON de lo último visto/sincronizado
  let timer = null;
  let aplicandoRemoto = false;
  let ultimo401 = false;

  function cargarMeta() {
    try {
      return Object.assign({ updatedAt: {} }, JSON.parse(localStorage.getItem(META_KEY) || "{}"));
    } catch {
      return { updatedAt: {} };
    }
  }

  const guardarMeta = () => localStorage.setItem(META_KEY, JSON.stringify(meta));
  const token = () => localStorage.getItem(TOKEN_KEY) || "";

  function chip(estado, titulo) {
    const el = document.getElementById("sync-chip");
    if (!el) return;
    el.hidden = false;
    el.dataset.estado = estado;
    el.textContent = { ok: "✓ sync", syncing: "⟳ sync", off: "⚠ sin sync" }[estado];
    el.title = titulo || {
      ok: "Progreso sincronizado",
      syncing: "Sincronizando…",
      off: "Sin sync — tocá para reintentar"
    }[estado];
  }

  function snapshot() {
    const s = {};
    for (const k of CLAVES) s[k] = JSON.stringify(state[k] ?? null);
    return s;
  }

  // llamado desde saveState() en app.js en cada escritura de estado
  function notificarCambio() {
    if (aplicandoRemoto) return;
    const ahora = new Date().toISOString();
    const snap = snapshot();
    let cambio = false;
    for (const k of CLAVES) {
      if (snap[k] !== lastSeen[k]) {
        meta.updatedAt[k] = ahora;
        cambio = true;
      }
    }
    if (!cambio) return;
    guardarMeta();
    clearTimeout(timer);
    timer = setTimeout(() => push(), DEBOUNCE_MS);
  }

  async function llamarApi(method, body) {
    const res = await fetch(API, {
      method,
      headers: {
        Authorization: `Bearer ${token()}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      keepalive: method === "PUT"
    });
    if (res.status === 401) throw new Error("401");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function fallo(e) {
    ultimo401 = e && e.message === "401";
    chip("off", ultimo401
      ? "Token inválido — tocá para reingresarlo"
      : "Sin conexión con el sync — tocá para reintentar");
  }

  async function push(reintentarConPull = true) {
    if (!token()) { chip("off", "Falta el token — tocá para conectarte"); return; }
    clearTimeout(timer);
    const snap = snapshot();
    const dirty = CLAVES.filter((k) => snap[k] !== lastSeen[k]);
    if (!dirty.length) { chip("ok"); return; }
    chip("syncing");
    try {
      const payload = dirty.map((k) => ({
        key: k,
        data: JSON.parse(snap[k]),
        client_updated_at: meta.updatedAt[k] || new Date().toISOString()
      }));
      const { results } = await llamarApi("PUT", payload);
      ultimo401 = false;
      for (const r of results) if (r.applied) lastSeen[r.key] = snap[r.key];
      if (reintentarConPull && results.some((r) => !r.applied)) {
        await pull(false); // algo remoto era más nuevo: traerlo
      }
      chip("ok");
    } catch (e) {
      fallo(e);
    }
  }

  async function pull(empujarDespues = true) {
    if (!token()) { chip("off", "Falta el token — tocá para conectarte"); return; }
    chip("syncing");
    try {
      const rows = await llamarApi("GET");
      ultimo401 = false;
      let aplicado = false;
      for (const row of rows) {
        if (!CLAVES.includes(row.key)) continue;
        const localTs = meta.updatedAt[row.key] || EPOCH;
        if (row.updated_at > localTs) {
          aplicandoRemoto = true;
          state[row.key] = row.data;
          meta.updatedAt[row.key] = row.updated_at;
          lastSeen[row.key] = JSON.stringify(row.data);
          aplicado = true;
        } else if (row.updated_at === localTs) {
          lastSeen[row.key] = JSON.stringify(row.data);
        }
        // si lo local es más nuevo, lastSeen queda distinto y el push lo sube
      }
      if (aplicado) {
        saveState();
        guardarMeta();
        aplicandoRemoto = false;
        if (typeof plan !== "undefined" && plan) renderTodo();
        toast("Progreso sincronizado desde la nube ⟳");
      }
      aplicandoRemoto = false;
      if (empujarDespues) await push(false);
      else chip("ok");
    } catch (e) {
      aplicandoRemoto = false;
      fallo(e);
    }
  }

  function pedirToken() {
    const t = prompt("Token de sync (te lo pasó el Coach una sola vez).\nCancelá para seguir en modo local:");
    localStorage.setItem(PROMPTED_KEY, "1");
    if (t && t.trim()) {
      localStorage.setItem(TOKEN_KEY, t.trim());
      ultimo401 = false;
      return true;
    }
    return false;
  }

  // click en el chip: reintentar, o pedir/reingresar token si falta o es inválido
  document.getElementById("sync-chip")?.addEventListener("click", () => {
    if (!token() || ultimo401) {
      if (pedirToken()) pull();
    } else {
      pull();
    }
  });

  // si la página se cierra con cambios pendientes, un último intento (keepalive)
  addEventListener("pagehide", () => {
    if (timer) { clearTimeout(timer); push(false); }
  });

  window.ccarfSync = { notificarCambio };

  // arranque: primer dispositivo pide el token una única vez; después, pull
  if (token()) {
    pull();
  } else if (!localStorage.getItem(PROMPTED_KEY)) {
    if (pedirToken()) pull();
    else chip("off", "Modo local — tocá para conectarte al sync");
  } else {
    chip("off", "Modo local — tocá para conectarte al sync");
  }
})();
