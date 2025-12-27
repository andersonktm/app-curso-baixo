/* =================================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ================================================================= */
let courseData = [];
let graphDefinition = "";

// Link Mágico para carregar aula via clique no mapa
window.carregarAula = function (mod, less) {
  loadLesson(mod, less);
  document.getElementById("map-modal").style.display = "none";
};

/* =================================================================
   2. INICIALIZAÇÃO (Conecta com o Firebase)
   ================================================================= */
window.iniciarCurso = function (dadosDoFirebase) {
  console.log("Iniciando app com dados da nuvem...");
  courseData = dadosDoFirebase.lista_aulas;
  graphDefinition = dadosDoFirebase.mapa_mermaid || "";

  generateMenu();

  // Se houver aulas, carrega a primeira
  if (courseData.length > 0) loadLesson(0, 0);

  generateSteps();

  const msg = document.getElementById("display-text");
  if (msg) msg.innerHTML = "Selecione uma aula no menu.";
};

window.onload = function () {
  console.log("Aguardando login...");
};

/* =================================================================
   3. LÓGICA DO SISTEMA DE AULAS
   ================================================================= */
function generateMenu() {
  const container = document.getElementById("menu-container");
  if (!container) return;
  container.innerHTML = "";

  courseData.forEach((mod, modIdx) => {
    const modHeader = document.createElement("div");
    modHeader.className = "module-header";
    modHeader.innerHTML = `${mod.module} <span style="font-size:0.8em">▼</span>`;
    modHeader.onclick = () => toggleModule(modIdx);

    const lessonList = document.createElement("div");
    lessonList.className = "lessons-list";
    lessonList.id = `mod-list-${modIdx}`;
    if (modIdx === 0) lessonList.classList.add("open");

    mod.lessons.forEach((less, lessIdx) => {
      const btn = document.createElement("div");
      btn.className = "lesson-link";
      btn.id = `link-${modIdx}-${lessIdx}`;
      btn.innerHTML = `${less.title} <span id="percent-${modIdx}-${lessIdx}" class="menu-percent"></span>`;
      btn.onclick = () => loadLesson(modIdx, lessIdx);
      lessonList.appendChild(btn);
    });
    container.appendChild(modHeader);
    container.appendChild(lessonList);
  });
}

function toggleModule(modIdx) {
  const list = document.getElementById(`mod-list-${modIdx}`);
  if (list) list.classList.toggle("open");
}

let currentModule = 0;
let currentLesson = 0;

function loadLesson(modIdx, lessIdx) {
  if (!courseData[modIdx] || !courseData[modIdx].lessons[lessIdx]) return;
  currentModule = modIdx;
  currentLesson = lessIdx;
  const data = courseData[modIdx].lessons[lessIdx];

  document.getElementById("display-module").innerText =
    courseData[modIdx].module;
  document.getElementById("display-title").innerText = data.title;
  const textContainer = document.getElementById("display-text");
  // LÓGICA ANTIGA (Insegura):
  //textContainer.innerHTML = data.text ? data.text.replace(/\n/g, "<br>") : "";


  // LÓGICA NOVA (Blindada):
  if (data.text) {
      // 1. Converte quebras de linha (\n) do banco de dados para <br>
      let rawText = data.text.replace(/\n/g, "<br>");

      // 2. O DOMPurify remove scripts maliciosos, mas mantém <b>, <i>, <br>, etc.
      // Ele limpa a sujeira antes de o navegador tentar ler.
      let cleanText = DOMPurify.sanitize(rawText, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'li', 'h3', 'h4'], // Lista branca do que é permitido
          ALLOWED_ATTR: ['href', 'target', 'style'] // Permite links e estilos básicos
      });

      textContainer.innerHTML = cleanText;
  } else {
      textContainer.innerHTML = "";
  }

  const imgEl = document.getElementById("display-img");
  const noImgEl = document.getElementById("no-image-msg");
  if (data.img && data.img !== "") {
    imgEl.src = data.img;
    imgEl.style.display = "inline-block";
    noImgEl.style.display = "none";
  } else {
    imgEl.style.display = "none";
    noImgEl.style.display = "block";
  }

  const audioContainer = document.getElementById("audio-container");
  const pBass = document.getElementById("player-bass");
  const pBack = document.getElementById("player-back");
  const rBass = document.getElementById("row-bass");
  const rBack = document.getElementById("row-backing");

  if (pBass) pBass.pause();
  if (pBack) pBack.pause();

  let hasAudio = false;
  if (data.audioBass && data.audioBass !== "") {
    if (pBass) pBass.src = data.audioBass;
    if (rBass) rBass.style.display = "block";
    hasAudio = true;
  } else {
    if (rBass) rBass.style.display = "none";
  }
  if (data.audioBack && data.audioBack !== "") {
    if (pBack) pBack.src = data.audioBack;
    if (rBack) rBack.style.display = "block";
    hasAudio = true;
  } else {
    if (rBack) rBack.style.display = "none";
  }
  if (audioContainer)
    audioContainer.style.display = hasAudio ? "block" : "none";

  updateActiveLink();
  updateNavButtons();
  initTimer(data.duration);
  const sidebar = document.getElementById("sidebar");
  if (
    window.innerWidth <= 768 &&
    sidebar &&
    sidebar.classList.contains("mobile-open")
  )
    toggleMobileMenu();
}

function changeLesson(dir) {
  if (courseData.length === 0) return;
  let m = currentModule,
    l = currentLesson + dir;
  if (l < 0) {
    if (m > 0) {
      m--;
      l = courseData[m].lessons.length - 1;
      document.getElementById(`mod-list-${m}`).classList.add("open");
    } else return;
  } else if (l >= courseData[m].lessons.length) {
    if (m < courseData.length - 1) {
      m++;
      l = 0;
      document.getElementById(`mod-list-${m}`).classList.add("open");
    } else return;
  }
  loadLesson(m, l);
}

function updateNavButtons() {
  if (courseData.length === 0) return;
  document.getElementById("btn-prev").disabled =
    currentModule === 0 && currentLesson === 0;
  const lastMod = courseData.length - 1;
  document.getElementById("btn-next").disabled =
    currentModule === lastMod &&
    currentLesson === courseData[lastMod].lessons.length - 1;
}

function updateActiveLink() {
  document
    .querySelectorAll(".lesson-link")
    .forEach((el) => el.classList.remove("active"));
  const activeEl = document.getElementById(
    `link-${currentModule}-${currentLesson}`
  );
  if (activeEl) activeEl.classList.add("active");
}

function toggleMobileMenu() {
  const sb = document.getElementById("sidebar");
  if (!sb) return;
  sb.classList.toggle("mobile-open");
  const btn = document.querySelector(".mobile-menu-toggle");
  if (sb.classList.contains("mobile-open")) {
    btn.innerText = "✕ Fechar";
    btn.style.background = "#c0392b";
    btn.style.color = "white";
    btn.style.border = "none";
  } else {
    btn.innerText = "☰ Menu";
    btn.style.background = "transparent";
    btn.style.color = "var(--accent-color)";
    btn.style.border = "1px solid var(--accent-color)";
  }
}

// === METRÔNOMO E TIMER ===
let metroInterval = null,
  bpm = 100,
  isPlaying = false,
  currentStep = 0,
  totalSteps = 8,
  stepStates = [];
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function toggleMetronome() {
  const m = document.getElementById("metronome-modal");
  m.style.display = m.style.display === "flex" ? "none" : "flex";
}
function generateSteps() {
  const sig = document.getElementById("time-sig")?.value || "4/4";
  const tr = document.getElementById("sequencer-track");
  if (!tr) return;
  tr.innerHTML = "";

  // Define o total de passos baseado no compasso
  totalSteps =
    sig === "4/4"
      ? 8
      : sig === "2/4"
      ? 4
      : sig === "3/4"
      ? 6
      : sig === "2/2"
      ? 4
      : sig === "7/4"
      ? 14
      : 6;

  stepStates = new Array(totalSteps).fill(0);

  for (let i = 0; i < totalSteps; i++) {
    // Lógica dos estados (Forte/Fraco/Mudo)
    if (sig === "6/8") {
      if (i === 0 || i === 3) stepStates[i] = 2;
      else stepStates[i] = 1;
    } else {
      if (i % 2 === 0) stepStates[i] = 2;
    }

    // Cria a caixinha do passo
    const div = document.createElement("div");
    div.className = "step-box";
    div.id = `step-${i}`;
    div.onclick = () => cycleStepState(i);
    updateStepVisual(div, stepStates[i]);

    // --- PARTE ADICIONADA: Cria o Texto (Label) ---
    let labelText = "";
    if (sig === "6/8") {
      // No 6/8 conta-se: 1 2 3 4 5 6
      labelText = (i + 1).toString();
    } else {
      // Nos binários (4/4, 3/4, etc) conta-se: 1 e 2 e 3 e...
      // Se o índice é par (0, 2, 4...), é o número da cabeça do tempo
      if (i % 2 === 0) labelText = (i / 2 + 1).toString();
      // Se o índice é ímpar, é o contratempo ("e")
      else labelText = "e";
    }

    const label = document.createElement("span");
    label.innerText = labelText;
    label.style.fontSize = "12px"; // Ajuste visual rápido
    label.style.marginTop = "5px";
    label.style.color = "#888";
    // ---------------------------------------------

    // Cria o Wrapper (agrupa a caixa e o texto)
    const w = document.createElement("div");
    w.className = "step-wrapper";

    // Garante que fiquem um em cima do outro
    w.style.display = "flex";
    w.style.flexDirection = "column";
    w.style.alignItems = "center";

    w.appendChild(div); // Adiciona a caixa
    w.appendChild(label); // Adiciona o texto embaixo
    tr.appendChild(w); // Adiciona ao trilho
  }
}
function cycleStepState(i) {
  stepStates[i] = (stepStates[i] + 1) % 3;
  updateStepVisual(document.getElementById(`step-${i}`), stepStates[i]);
}
function updateStepVisual(d, s) {
  d.classList.remove("weak", "strong");
  if (s === 1) d.classList.add("weak");
  if (s === 2) d.classList.add("strong");
}
function playStep() {
  const prev = (currentStep - 1 + totalSteps) % totalSteps;
  document.getElementById(`step-${prev}`)?.classList.remove("playing");
  document.getElementById(`step-${currentStep}`)?.classList.add("playing");
  if (stepStates[currentStep] > 0) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.frequency.value = stepStates[currentStep] === 2 ? 1200 : 600;
    g.gain.value = stepStates[currentStep] === 2 ? 1.0 : 0.4;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    o.stop(audioCtx.currentTime + 0.1);
  }
  currentStep = (currentStep + 1) % totalSteps;
}
function updateBpm(v) {
  bpm = v;
  document.getElementById("bpm-val").innerText = v;
  if (isPlaying) restartInterval();
}
function restartInterval() {
  clearInterval(metroInterval);
  let mul = document.getElementById("time-sig").value.includes("/4") ? 0.5 : 1;
  metroInterval = setInterval(playStep, (60000 / bpm) * mul);
}
function togglePlayMetronome() {
  const btn = document.getElementById("btn-play-metro");
  if (isPlaying) {
    clearInterval(metroInterval);
    btn.innerText = "▶ INICIAR";
    btn.style.background = "#2c3e50";
    isPlaying = false;
  } else {
    currentStep = 0;
    restartInterval();
    btn.innerText = "⏹ PARAR";
    btn.style.background = "#c0392b";
    isPlaying = true;
  }
}

let studyTimerInterval = null,
  studyTimeRemaining = 0,
  isStudyTimerRunning = false,
  initialDuration = 0;
function initTimer(sec) {
  clearInterval(studyTimerInterval);
  isStudyTimerRunning = false;
  const box = document.getElementById("study-timer");
  if (!sec || sec <= 0) {
    if (box) box.style.display = "none";
    return;
  }
  if (box) box.style.display = "flex";
  initialDuration = sec;
  studyTimeRemaining = sec;
  updateTimerDisplay();
  const btn = document.getElementById("btn-timer");
  if (btn) {
    btn.innerText = "▶ INICIAR";
    btn.disabled = false;
    btn.classList.remove("running");
  }
}
function toggleStudyTimer() {
  const btn = document.getElementById("btn-timer");
  if (isStudyTimerRunning) {
    clearInterval(studyTimerInterval);
    isStudyTimerRunning = false;
    btn.innerText = "▶ CONTINUAR";
    btn.classList.remove("running");
  } else {
    if (studyTimeRemaining <= 0) studyTimeRemaining = initialDuration;
    isStudyTimerRunning = true;
    btn.innerText = "⏸ PAUSAR";
    btn.classList.add("running");
    studyTimerInterval = setInterval(() => {
      studyTimeRemaining--;
      updateTimerDisplay();
      if (studyTimeRemaining <= 0) finishTimer();
    }, 1000);
  }
}
function updateTimerDisplay() {
  const m = Math.floor(studyTimeRemaining / 60),
    s = studyTimeRemaining % 60;
  const d = document.getElementById("timer-display");
  if (d)
    d.innerText = `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
}
function finishTimer() {
  clearInterval(studyTimerInterval);
  isStudyTimerRunning = false;
  const b = document.getElementById("btn-timer");
  if (b) {
    b.innerText = "✅ FIM";
    b.disabled = true;
    b.classList.remove("running");
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  playAlarm();
}
function playAlarm() {
    // Garante que o áudio está ativo
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const now = audioCtx.currentTime;


    // Loop externo: Executa a sequência 2 vezes
    for (let cycle = 0; cycle < 2; cycle++) {

    // Define o atraso inicial de cada ciclo
    // O ciclo 0 começa agora (0s). O ciclo 1 começa após 1.5 segundos (tempo para os 8 bips + pausa)
    const cycleDelay = cycle * 1.5;
    
    // Vamos criar um padrão de despertador digital: Bip-Bip-Bip-Bip
    // Faremos um loop para criar 8 bips rápidos
    for (let i = 0; i < 8; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        // 'square' é a onda que soa como um buzzer/alarme digital
        osc.type = 'square'; 
        
        // Frequência alta (tipo relógio Casio)
        osc.frequency.value = 900; 
        
        // Ritmo: Um bip a cada 0.15 segundos
        const startTime = now + cycleDelay + (i * 0.15);
        const duration = 0.08; // Duração curta para ser seco
        
        // Controle de Volume (Envelope) para não dar estalos
        // Square wave é alta, então usamos volume 0.1 ou 0.2
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01); // Ataque rápido
        gain.gain.setValueAtTime(0.1, startTime + duration - 0.01); // Sustentação
        gain.gain.linearRampToValueAtTime(0, startTime + duration); // Final seco
        
        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
    }
  }
}

// === MERMAID ===
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    flowchart: {
      curve: "basis",
      nodeSpacing: 10,
      rankSpacing: 30,
      padding: 5,
    },
  });
} catch (e) {}

async function toggleMap() {
  const modal = document.getElementById("map-modal");
  const container = document.getElementById("mermaid-graph");

  if (modal.style.display === "none" || modal.style.display === "") {
    modal.style.display = "flex";
    container.innerHTML = '<p style="margin-top:20px;">Carregando...</p>';

    if (!graphDefinition) {
      container.innerHTML =
        "<p style='color:red'>Erro: O mapa está vazio. Use o Painel Admin para gerar.</p>";
      return;
    }

    try {
      const { svg } = await mermaid.render(
        "graph-" + Date.now(),
        graphDefinition
      );
      container.innerHTML = svg;

      // --- CORREÇÃO FINAL: REMOVE LARGURA FORÇADA ---
      const svgEl = container.querySelector("svg");
      if (svgEl) {
        // Remove o atributo width fixo que o Mermaid coloca
        svgEl.removeAttribute("width");
        // Deixa o CSS (style.css) controlar o tamanho
        svgEl.style.width = "";
      }

      container.onclick = (e) => {
        let t = e.target;
        while (t && t !== container) {
          if (t.id && t.id.includes("N_")) {
            const m = t.id.match(/N_(\d+)_(\d+)/);
            if (m) {
              window.carregarAula(parseInt(m[1]), parseInt(m[2]));
              return;
            }
          }
          t = t.parentNode;
        }
      };
    } catch (e) {
      container.innerHTML = "Erro Mermaid: " + e.message;
    }
  } else {
    modal.style.display = "none";
  }
}
