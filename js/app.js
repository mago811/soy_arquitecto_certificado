/* ============================================================
   CCAR-F RETAKE — lógica del dashboard
   Vanilla JS, sin build step. Persistencia en localStorage.
   ============================================================ */

"use strict";

const LS_KEY = "ccarf-retake-v2"; // v2: se renombró la clave para resetear los tachados de prueba

// ---------- estado ----------

const defaultState = () => ({
  v: 1,
  tasks: {},      // dayId -> { taskId: true }
  skipped: {},    // dayId -> true
  respuestas: {}, // objetivoId -> [1,0,1,...] (últimas 20)
  historial: [],  // { ts, quizId, titulo, correctas, total }
  cards: {}       // cardId -> { box, due }
});

let state = loadState();
let plan = null;
let quizIndex = { disponibles: [] };
let mazos = { mazos: [] };

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultState(), parsed);
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ---------- helpers ----------

const $ = (sel) => document.querySelector(sel);

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function diasHasta(fechaISO) {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

let toastTimer = null;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 3200);
}

// ---------- confetti ----------

const confetti = (() => {
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  let parts = [];
  let raf = null;

  function resize() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  addEventListener("resize", resize);
  resize();

  function burst(x, y, n = 70) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#d97757", "#f08a63", "#52b788", "#c9bfb2", "#f4f0e9"];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 8;
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 3.5,
        g: 0.22,
        s: 4 + Math.random() * 5,
        c: colors[i % colors.length],
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 70 + Math.random() * 45
      });
    }
    if (!raf) tick();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.99;
      p.r += p.vr; p.life--;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : null;
  }

  return { burst };
})();

function burstDesde(el) {
  const r = el.getBoundingClientRect();
  confetti.burst(r.left + r.width / 2, r.top + r.height / 2);
}

// ---------- derivaciones ----------

function tareasHechas(dia) {
  const done = state.tasks[dia.id] || {};
  return dia.tareas.filter((t) => done[t.id]).length;
}

function diaCompleto(dia) {
  return tareasHechas(dia) === dia.tareas.length;
}

function progresoGlobal() {
  let total = 0, hechas = 0;
  for (const dia of plan.dias) {
    total += dia.tareas.length;
    hechas += tareasHechas(dia);
  }
  return total ? hechas / total : 0;
}

// ---------- hero ----------

function renderHero() {
  const ex = plan.examen;
  const dias = diasHasta(ex.fecha);
  const num = $("#countdown-num");
  const label = $("#countdown-label");
  if (dias > 1) {
    num.textContent = dias;
    label.textContent = "días para el examen";
  } else if (dias === 1) {
    num.textContent = "1";
    label.textContent = "día. Mañana es EL día.";
  } else if (dias === 0) {
    num.textContent = "HOY";
    label.textContent = "A romperla, Mago.";
  } else {
    num.textContent = "✓";
    label.textContent = "examen rendido";
  }

  const pct = progresoGlobal();
  const rango = ex.scoreObjetivo - ex.scoreAnterior;
  const proyectado = Math.round(ex.scoreAnterior + rango * pct);
  $("#score-fill").style.width = `${Math.round(pct * 100)}%`;
  $("#score-pass").style.left = `${(((ex.scorePassing - ex.scoreAnterior) / rango) * 100).toFixed(1)}%`;
  $("#score-note").innerHTML =
    `Plan completado: <strong>${Math.round(pct * 100)}%</strong> · ` +
    `camino del ${ex.scoreAnterior} al <strong>${ex.scoreObjetivo}</strong> (passing ${ex.scorePassing})`;

  $("#global-fill").style.width = `${Math.round(pct * 100)}%`;
  $("#global-pct").textContent = `${Math.round(pct * 100)}%`;
}

// ---------- calendario ----------

function estadoDia(dia) {
  if (diaCompleto(dia)) return "done";
  if (state.skipped[dia.id]) return "skipped";
  if (tareasHechas(dia) > 0) return "curso";
  return "pendiente";
}

// una frase por día (21 días, 21 frases — el día N siempre muestra la misma)
const FRASES_TACHADO = [
  "uno menos, crack",
  "vamo' máquina, falta poco",
  "no aflojes, va bárbaro",
  "así se recuperan las Malvinas",
  "con estas ganas ganó Messi",
  "¿qué mirás bobo? hecho",
  "la Scaloneta aprueba",
  "sos animal, seguí así",
  "golazo de media cancha",
  "lo atajaste como el Dibu",
  "barrilete cósmico",
  "paso a paso, decía Bilardo",
  "ni el VAR te lo saca",
  "la hinchada te canta",
  "ovación en la Bombonera",
  "titular indiscutido",
  "el 780 tiembla",
  "dale campeón, dale campeón",
  "muchaaachos, nos ilusionamo'",
  "mañana la rompés, Mago",
  "tercera estrella 🏆"
];

function renderGrid() {
  const grid = $("#day-grid");
  const hoy = hoyISO();
  grid.innerHTML = "";

  for (const dia of plan.dias) {
    const st = estadoDia(dia);
    const hechas = tareasHechas(dia);
    const esHoy = dia.fecha === hoy;
    const esManana = plan.examen.inicio > hoy && dia.dia === 1;

    const btn = document.createElement("button");
    btn.className = "day-card";
    btn.dataset.bloque = dia.bloque;
    btn.dataset.id = dia.id;
    if (st === "done") btn.classList.add("is-done");
    if (st === "skipped") btn.classList.add("is-skipped");
    if (esHoy) btn.classList.add("is-today");
    btn.setAttribute("aria-label", `Día ${dia.dia}: ${dia.titulo}`);

    const estadoTxt = {
      done: `✓ ${FRASES_TACHADO[(dia.dia - 1) % FRASES_TACHADO.length]}`,
      skipped: "⏭ salteado",
      curso: `${hechas}/${dia.tareas.length} tareas`,
      pendiente: dia.horas ? `${dia.horas}h` : "—"
    }[st];

    btn.innerHTML = `
      ${esHoy ? '<span class="badge-hoy">HOY</span>' : ""}
      ${esManana ? '<span class="badge-hoy">ARRANCA MAÑANA</span>' : ""}
      <div class="meta"><span>${escapeHTML(dia.fechaCorta)}</span><span>${escapeHTML(dia.bloqueLabel)}</span></div>
      <div class="num">${String(dia.dia).padStart(2, "0")}</div>
      <div class="titulo">${escapeHTML(dia.titulo)}</div>
      <div class="estado">
        <span>${estadoTxt}</span>
        <span class="mini-bar"><span class="mini-fill" style="width:${(hechas / dia.tareas.length) * 100}%"></span></span>
      </div>`;

    btn.addEventListener("click", () => abrirDia(dia.id));
    grid.appendChild(btn);
  }
}

// ---------- detalle de día ----------

const dayDialog = $("#day-dialog");

function abrirDia(diaId) {
  const dia = plan.dias.find((d) => d.id === diaId);
  const done = state.tasks[dia.id] || {};
  const skipped = !!state.skipped[dia.id];
  const completo = diaCompleto(dia);

  $("#dialog-content").innerHTML = `
    <div class="dialog-head">
      <div>
        <div class="dialog-eyebrow">Día ${String(dia.dia).padStart(2, "0")} · ${escapeHTML(dia.fechaCorta)} · ${escapeHTML(dia.bloqueLabel)} · ~${dia.horas}h</div>
        <div class="dialog-title">${escapeHTML(dia.titulo)}</div>
      </div>
      <button class="btn-close" data-close aria-label="Cerrar">×</button>
    </div>
    <div class="task-list">
      ${dia.tareas.map((t) => `
        <label class="task">
          <input type="checkbox" data-task="${t.id}" ${done[t.id] ? "checked" : ""}>
          <span class="box"><svg viewBox="0 0 16 16"><path d="M2.5 8.5 6 12l7.5-8"/></svg></span>
          <span class="task-text">${escapeHTML(t.texto)}</span>
        </label>`).join("")}
    </div>
    <div class="dialog-actions">
      <button class="btn ${completo ? "" : "btn-primary"}" data-todo>${completo ? "↩ Destachar (lo tildé por error)" : "Tachar el día completo"}</button>
      <button class="btn btn-ghost" data-skip>${skipped ? "Quitar salteado" : "⏭ Saltear (se reprograma)"}</button>
    </div>`;

  $("#dialog-content").querySelector("[data-close]").addEventListener("click", () => dayDialog.close());

  $("#dialog-content").querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const antes = diaCompleto(dia);
      state.tasks[dia.id] = state.tasks[dia.id] || {};
      if (cb.checked) state.tasks[dia.id][cb.dataset.task] = true;
      else delete state.tasks[dia.id][cb.dataset.task];
      saveState();
      renderGrid();
      renderHero();
      if (!antes && diaCompleto(dia)) celebrarDia(dia);
    });
  });

  $("#dialog-content").querySelector("[data-todo]").addEventListener("click", () => {
    const estabaCompleto = diaCompleto(dia);
    state.tasks[dia.id] = {};
    if (!estabaCompleto) {
      dia.tareas.forEach((t) => (state.tasks[dia.id][t.id] = true));
      delete state.skipped[dia.id];
    }
    saveState();
    renderGrid();
    renderHero();
    dayDialog.close();
    if (estabaCompleto) toast(`Día ${dia.dia} destachado. Acá no pasó nada.`);
    else celebrarDia(dia);
  });

  $("#dialog-content").querySelector("[data-skip]").addEventListener("click", () => {
    if (state.skipped[dia.id]) delete state.skipped[dia.id];
    else {
      state.skipped[dia.id] = true;
      toast(`Día ${dia.dia} salteado — lo recuperamos en el buffer, sin culpa.`);
    }
    saveState();
    renderGrid();
    dayDialog.close();
  });

  dayDialog.showModal();
}

function celebrarDia(dia) {
  const card = document.querySelector(`.day-card[data-id="${dia.id}"]`);
  if (card) burstDesde(card);
  else confetti.burst(innerWidth / 2, innerHeight / 2);
  const frases = [
    `Día ${dia.dia} TACHADO. Un paso más cerca del 780. 🔥`,
    `Día ${dia.dia} liquidado. Así se estudia, Mago. 💪`,
    `Día ${dia.dia} hecho. El 592 quedó en el pasado. 🎯`
  ];
  toast(frases[dia.dia % frases.length]);
}

// ---------- quiz ----------

let quizActual = null; // { data, idx, correctas, porObjetivo }

async function renderQuizHome() {
  const home = $("#quiz-home");
  $("#quiz-stage").innerHTML = "";
  if (!quizIndex.disponibles.length) {
    home.innerHTML = `<div class="empty"><strong>Todavía no hay quizzes cargados.</strong><br>
      Se generan día a día en la Fase 2: al final de cada sesión el coach carga
      <span style="font-family:var(--font-mono)">data/quizzes/day-XX.json</span> y aparece acá.</div>`;
    return;
  }
  home.innerHTML = `<div class="quiz-picker">
    ${quizIndex.disponibles.map((q) => {
      const intentos = state.historial.filter((h) => h.quizId === q.archivo).length;
      return `<button class="quiz-pick-btn" data-file="${q.archivo}">
        <span>${escapeHTML(q.titulo)}</span>
        <span class="mono">${intentos ? `${intentos} intento${intentos > 1 ? "s" : ""}` : "sin intentos"} →</span>
      </button>`;
    }).join("")}
  </div>`;
  home.querySelectorAll("[data-file]").forEach((b) =>
    b.addEventListener("click", () => empezarQuiz(b.dataset.file))
  );
}

async function empezarQuiz(archivo) {
  let data;
  try {
    const res = await fetch(`data/quizzes/${archivo}`, { cache: "no-store" });
    data = await res.json();
  } catch {
    toast("No pude cargar ese quiz. ¿Está bien el JSON?");
    return;
  }
  quizActual = { data, idx: 0, correctas: 0, porObjetivo: {} };
  $("#quiz-home").innerHTML = "";
  renderPregunta();
}

function renderPregunta() {
  const { data, idx } = quizActual;
  const stage = $("#quiz-stage");

  if (idx >= data.preguntas.length) {
    renderResultadoQuiz();
    return;
  }

  const p = data.preguntas[idx];
  const letras = ["A", "B", "C", "D"];

  stage.innerHTML = `<div class="quiz-stage">
    <div class="quiz-progress">
      <span>${escapeHTML(data.titulo)}</span>
      <span>${idx + 1} / ${data.preguntas.length}</span>
    </div>
    <div class="quiz-scenario">${escapeHTML(p.escenario)}</div>
    <div class="quiz-options">
      ${p.opciones.map((o, i) =>
        `<button class="quiz-opt" data-i="${i}" data-letra="${letras[i]}">${escapeHTML(o)}</button>`
      ).join("")}
    </div>
    <div id="quiz-feedback"></div>
  </div>`;

  stage.querySelectorAll(".quiz-opt").forEach((btn) => {
    btn.addEventListener("click", () => responder(parseInt(btn.dataset.i, 10)));
  });
}

function responder(elegida) {
  const { data, idx } = quizActual;
  const p = data.preguntas[idx];
  const ok = elegida === p.correcta;
  const letras = ["A", "B", "C", "D"];

  document.querySelectorAll(".quiz-opt").forEach((btn) => {
    const i = parseInt(btn.dataset.i, 10);
    btn.disabled = true;
    if (i === p.correcta) btn.classList.add("is-correct");
    else if (i === elegida) btn.classList.add("is-wrong");
  });

  if (ok) {
    quizActual.correctas++;
    burstDesde(document.querySelector(`.quiz-opt[data-i="${elegida}"]`));
  }

  // registrar por objetivo (alimenta el semáforo)
  if (p.objetivo) {
    const po = quizActual.porObjetivo;
    po[p.objetivo] = po[p.objetivo] || { ok: 0, total: 0 };
    po[p.objetivo].total++;
    if (ok) po[p.objetivo].ok++;
    state.respuestas[p.objetivo] = state.respuestas[p.objetivo] || [];
    state.respuestas[p.objetivo].push(ok ? 1 : 0);
    if (state.respuestas[p.objetivo].length > 20) state.respuestas[p.objetivo].shift();
    saveState();
  }

  $("#quiz-feedback").innerHTML = `
    <div class="quiz-rationale">
      <h4>${ok ? "✓ Correcta" : "✗ No era esa"} — por qué</h4>
      <ul>
        ${p.rationales.map((r, i) =>
          `<li data-letra="${letras[i]}" class="${i === p.correcta ? "is-key" : ""}">${escapeHTML(r)}</li>`
        ).join("")}
      </ul>
      <button class="btn btn-primary quiz-next">${idx + 1 < data.preguntas.length ? "Siguiente →" : "Ver resultado"}</button>
    </div>`;

  $(".quiz-next").addEventListener("click", () => {
    quizActual.idx++;
    renderPregunta();
  });
  $(".quiz-next").focus();
}

function renderResultadoQuiz() {
  const { data, correctas, porObjetivo } = quizActual;
  const total = data.preguntas.length;
  const pct = Math.round((correctas / total) * 100);

  state.historial.push({
    ts: new Date().toISOString(),
    quizId: data.id ? `${data.id}.json` : "quiz.json",
    titulo: data.titulo,
    correctas,
    total
  });
  saveState();
  renderSemaforo();

  const objs = Object.entries(porObjetivo).map(([id, r]) => {
    const obj = plan.objetivos.find((o) => o.id === id);
    const p = Math.round((r.ok / r.total) * 100);
    const nivel = p < 60 ? "roja" : p < 85 ? "amarilla" : "verde";
    return `<div class="sema-row">
      <span class="sema-dot ${nivel}"></span>
      <span class="sema-name">${escapeHTML(obj ? obj.nombre : id)}</span>
      <span class="sema-bar"><span class="sema-fill ${nivel}" style="width:${p}%"></span></span>
      <span class="sema-pct">${r.ok}/${r.total}</span>
    </div>`;
  }).join("");

  $("#quiz-stage").innerHTML = `<div class="quiz-result">
    <div class="big">${pct}%</div>
    <div class="sub">${correctas} de ${total} correctas — ${
      pct >= 90 ? "nivel examen aprobado. Así, exactamente así." :
      pct >= 70 ? "vas bien, pero el examen pide más margen. Revisá los rationales." :
      "hay que volver sobre esto. Los rationales son la clase."}</div>
    <div class="quiz-breakdown">${objs}</div>
    <button class="btn btn-primary" id="quiz-volver">Volver a los quizzes</button>
  </div>`;

  if (pct >= 80) confetti.burst(innerWidth / 2, innerHeight / 3, 110);
  $("#quiz-volver").addEventListener("click", renderQuizHome);
  quizActual = null;
}

// ---------- flashcards ----------

let fcSesion = null; // { deck, queue, idx, bien, mal }

const FC_INTERVALOS = [0, 1, 3, 7]; // días según box 1..4

function cardMeta(id) {
  return state.cards[id] || { box: 1, due: hoyISO() };
}

function renderFcHome() {
  const home = $("#fc-home");
  $("#fc-stage").innerHTML = "";
  if (!mazos.mazos.length) {
    home.innerHTML = `<div class="empty"><strong>Todavía no hay mazos.</strong><br>Se cargan en la Fase 2.</div>`;
    return;
  }
  const hoy = hoyISO();
  home.innerHTML = `<div class="fc-deck-list">
    ${mazos.mazos.map((m) => {
      const due = m.cards.filter((c) => cardMeta(c.id).due <= hoy).length;
      return `<button class="quiz-pick-btn" data-deck="${m.id}">
        <span>${escapeHTML(m.nombre)}<br><span class="mono">${escapeHTML(m.descripcion || "")}</span></span>
        <span class="mono">${due ? `${due} para hoy` : "todo al día"} · ${m.cards.length} cards →</span>
      </button>`;
    }).join("")}
  </div>`;
  home.querySelectorAll("[data-deck]").forEach((b) =>
    b.addEventListener("click", () => empezarMazo(b.dataset.deck))
  );
}

function empezarMazo(deckId) {
  const deck = mazos.mazos.find((m) => m.id === deckId);
  const hoy = hoyISO();
  let queue = deck.cards.filter((c) => cardMeta(c.id).due <= hoy);
  if (!queue.length) queue = [...deck.cards]; // repaso libre si no hay vencidas
  queue = [...queue].sort((a, b) => cardMeta(a.id).box - cardMeta(b.id).box);
  fcSesion = { deck, queue, idx: 0, bien: 0, mal: 0 };
  $("#fc-home").innerHTML = "";
  renderFcCard();
}

function renderFcCard() {
  const s = fcSesion;
  const stage = $("#fc-stage");

  if (s.idx >= s.queue.length) {
    stage.innerHTML = `<div class="fc-stage"><div class="quiz-result">
      <div class="big">${s.bien}<span style="color:var(--muted);font-size:.45em"> / ${s.bien + s.mal}</span></div>
      <div class="sub">sabidas en esta vuelta. Las que fallaste vuelven antes — así funciona el repaso espaciado.</div>
      <button class="btn btn-primary" id="fc-volver">Volver a los mazos</button>
    </div></div>`;
    if (s.mal === 0 && s.bien > 0) confetti.burst(innerWidth / 2, innerHeight / 3, 90);
    $("#fc-volver").addEventListener("click", renderFcHome);
    fcSesion = null;
    return;
  }

  const card = s.queue[s.idx];
  stage.innerHTML = `<div class="fc-stage">
    <div class="fc-counter">${escapeHTML(s.deck.nombre)} · ${s.idx + 1} / ${s.queue.length}</div>
    <div class="fc-card-wrap">
      <div class="fc-card" id="fc-card" tabindex="0" role="button" aria-label="Dar vuelta la tarjeta">
        <div class="fc-face front">${escapeHTML(card.front)}<span class="hint">click para dar vuelta</span></div>
        <div class="fc-face back">${escapeHTML(card.back)}<span class="hint">¿la sabías?</span></div>
      </div>
    </div>
    <div class="fc-actions">
      <button class="btn fc-btn-mal" id="fc-mal" disabled>✗ No la sabía</button>
      <button class="btn fc-btn-bien" id="fc-bien" disabled>✓ La sabía</button>
    </div>
  </div>`;

  const el = $("#fc-card");
  const flip = () => {
    el.classList.toggle("is-flipped");
    $("#fc-mal").disabled = false;
    $("#fc-bien").disabled = false;
  };
  el.addEventListener("click", flip);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); }
  });

  $("#fc-bien").addEventListener("click", () => calificar(card, true));
  $("#fc-mal").addEventListener("click", () => calificar(card, false));
}

function calificar(card, bien) {
  const meta = cardMeta(card.id);
  if (bien) {
    fcSesion.bien++;
    meta.box = Math.min(meta.box + 1, 4);
  } else {
    fcSesion.mal++;
    meta.box = 1;
    // reinsertar la fallada un poco más adelante en la misma sesión
    const pos = Math.min(fcSesion.idx + 3, fcSesion.queue.length);
    fcSesion.queue.splice(pos, 0, card);
  }
  const d = new Date();
  d.setDate(d.getDate() + FC_INTERVALOS[meta.box - 1]);
  meta.due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  state.cards[card.id] = meta;
  saveState();
  fcSesion.idx++;
  renderFcCard();
}

// ---------- semáforo ----------

function nivelObjetivo(obj) {
  const resp = state.respuestas[obj.id] || [];
  if (resp.length >= 3) {
    const recientes = resp.slice(-10);
    const pct = Math.round((recientes.reduce((a, b) => a + b, 0) / recientes.length) * 100);
    const nivel = pct < 60 ? "roja" : pct < 85 ? "amarilla" : "verde";
    return { nivel, pct, src: `últimas ${recientes.length} respuestas` };
  }
  return { nivel: obj.zonaInicial, pct: obj.baseline, src: "baseline del 1er intento — todavía sin quizzes" };
}

function renderSemaforo() {
  const root = $("#sema-root");
  const grupos = { roja: [], amarilla: [], verde: [] };

  for (const obj of plan.objetivos) {
    const r = nivelObjetivo(obj);
    grupos[r.nivel].push({ obj, ...r });
  }

  const titulos = {
    roja: "🔴 Zonas rojas — acá se gana el examen",
    amarilla: "🟡 Zonas amarillas",
    verde: "🟢 Fortalezas — solo mantener"
  };

  root.innerHTML = ["roja", "amarilla", "verde"].map((nivel) => {
    if (!grupos[nivel].length) return "";
    return `<div class="sema-group">
      <h3>${titulos[nivel]}</h3>
      <div class="sema-list">
        ${grupos[nivel].map(({ obj, pct, src }) => `
          <div class="sema-row">
            <span class="sema-dot ${nivel}"></span>
            <span class="sema-name">${escapeHTML(obj.nombre)}<br><span class="sema-src">${escapeHTML(src)}</span></span>
            <span class="sema-bar"><span class="sema-fill ${nivel}" style="width:${pct}%"></span></span>
            <span class="sema-pct">${pct}%</span>
          </div>`).join("")}
      </div>
    </div>`;
  }).join("");
}

// ---------- tabs ----------

function initTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("is-active"));
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
      tab.classList.add("is-active");
      $(`#view-${tab.dataset.view}`).classList.add("is-active");
    });
  });
}

// ---------- export / import ----------

function initDatos() {
  $("#btn-export").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ccarf-progreso-${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Progreso exportado. Guardalo donde no se pierda.");
  });

  $("#btn-import").addEventListener("click", () => $("#import-file").click());

  $("#btn-reset").addEventListener("click", () => {
    if (!confirm("¿Borrar TODO el progreso (tachados, quizzes, flashcards)? No hay vuelta atrás.")) return;
    state = defaultState();
    saveState();
    renderTodo();
    toast("Tablero en cero. Arrancamos de nuevo.");
  });

  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.v !== 1) throw new Error("versión desconocida");
      state = Object.assign(defaultState(), parsed);
      saveState();
      renderTodo();
      toast("Progreso importado. Seguimos donde estabas.");
    } catch {
      toast("Ese archivo no parece un export válido.");
    }
    e.target.value = "";
  });
}

// ---------- init ----------

function renderTodo() {
  renderHero();
  renderGrid();
  renderQuizHome();
  renderFcHome();
  renderSemaforo();
}

async function init() {
  try {
    const res = await fetch("data/plan.json", { cache: "no-store" });
    plan = await res.json();
  } catch {
    document.querySelector(".wrap").innerHTML = `
      <div class="empty" style="margin:80px auto;max-width:560px">
        <strong>No pude cargar data/plan.json.</strong><br><br>
        Este dashboard necesita un servidor local (fetch no funciona con file://).<br><br>
        <span style="font-family:var(--font-mono)">python -m http.server 8000</span><br>
        o <span style="font-family:var(--font-mono)">npx serve</span><br><br>
        y abrí <span style="font-family:var(--font-mono)">http://localhost:8000</span>
      </div>`;
    return;
  }

  try {
    const res = await fetch("data/quizzes/index.json", { cache: "no-store" });
    quizIndex = await res.json();
  } catch { /* sin quizzes todavía */ }

  try {
    const res = await fetch("data/flashcards.json", { cache: "no-store" });
    mazos = await res.json();
  } catch { /* sin mazos todavía */ }

  initTabs();
  initDatos();
  renderTodo();
}

init();
