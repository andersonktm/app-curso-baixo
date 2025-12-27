/* =================================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ================================================================= */
let courseData = [];
let graphDefinition = "";
const lessonCache = {}; // Cache local para evitar downloads repetidos

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
   3. LÓGICA DO SISTEMA DE AULAS (AGORA COM LAZY LOADING)
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

// === NOVA FUNÇÃO ASSÍNCRONA DE CARREGAMENTO ===
async function loadLesson(modIdx, lessIdx) {
  // 1. Validação básica
  if (!courseData[modIdx] || !courseData[modIdx].lessons[lessIdx]) return;
  
  currentModule = modIdx;
  currentLesson = lessIdx;
  
  // Pega os dados básicos (Título) que já estão na memória (do Índice Leve)
  const basicData = courseData[modIdx].lessons[lessIdx];

  // 2. Atualiza UI IMEDIATAMENTE (Feedback rápido de navegação)
  document.getElementById("display-module").innerText = courseData[modIdx].module;
  document.getElementById("display-title").innerText = basicData.title;
  
  // Mostra um "Carregando..." na área de texto
  const textContainer = document.getElementById("display-text");
  textContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#f39c12">⏳ Carregando conteúdo...</div>';
  
  // Esconde elementos pesados e reseta rows de áudio para não mostrar lixo anterior
  document.getElementById("audio-container").style.display = "none";
  document.getElementById("display-img").style.display = "none";
  document.getElementById("no-image-msg").style.display = "none";
  
  const rBass = document.getElementById("row-bass");
  const rBack = document.getElementById("row-backing");
  if(rBass) rBass.style.display = "none";
  if(rBack) rBack.style.display = "none";

  // 3. Busca o Conteúdo Pesado (Cache ou Nuvem)
  let fullData = null;
  const cacheKey = `m${modIdx}l${lessIdx}`;

  if (lessonCache[cacheKey]) {
      console.log("Usando cache local para aula:", cacheKey);
      fullData = lessonCache[cacheKey];
  } else {
      console.log("Baixando aula da nuvem:", cacheKey);
      
      // Chama a função global definida no firebase.js
      if (window.fetchLessonContent) {
          const content = await window.fetchLessonContent(modIdx, lessIdx);
          if (content) {
              // Mescla os dados básicos (título) com o conteúdo baixado (texto, audio)
              fullData = { ...basicData, ...content };
              lessonCache[cacheKey] = fullData; // Salva no cache
          }
      }
  }

  // Fallback: Se não achou na nuvem (ainda não migrou DB), usa o que tem na memória local
  if (!fullData) fullData = basicData;

  // 4. Renderiza o Conteúdo Texto (Com Proteção DOMPurify)
  if (fullData.text) {
      let rawText = fullData.text.replace(/\n/g, "<br>");
      // Verifica se DOMPurify foi carregado no HTML
      if (typeof DOMPurify !== 'undefined') {
          textContainer.innerHTML = DOMPurify.sanitize(rawText, {
              ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'p', 'br', 'ul', 'li', 'h3', 'h4', 'span'],
              ALLOWED_ATTR: ['style', 'class', 'onclick'] // onclick permitido apenas se confiar muito na fonte
          });
      } else {
          textContainer.innerHTML = rawText; // Fallback sem sanitização
      }
  } else {
      textContainer.innerHTML = "Conteúdo não disponível.";
  }

  // 5. Renderiza Imagem
  const imgEl = document.getElementById("display-img");
  const noImgEl = document.getElementById("no-image-msg");
  
  if (fullData.img && fullData.img !== "") {
    imgEl.src = fullData.img;
    imgEl.style.display = "inline-block";
    noImgEl.style.display = "none";
  } else {
    imgEl.style.display = "none";
    noImgEl.style.display = "block";
  }

  // 6. Configura Áudio
  const audioContainer = document.getElementById("audio-container");
  const pBass = document.getElementById("player-bass");
  const pBack = document.getElementById("player-back");
  
  // Pausa anteriores
  if(pBass) pBass.pause();
  if(pBack) pBack.pause();

  let hasAudio = false;
  if (fullData.audioBass && fullData.audioBass !== "") {
      pBass.src = fullData.audioBass;
      if (rBass) rBass.style.display = "block";
      hasAudio = true;
  }
  if (fullData.audioBack && fullData.audioBack !== "") {
      pBack.src = fullData.audioBack;
      if (rBack) rBack.style.display = "block";
      hasAudio = true;
  }
  
  if (audioContainer) audioContainer.style.display = hasAudio ? "block" : "none";

  // 7. Finaliza UI
  updateActiveLink();
  updateNavButtons();
  if (fullData.duration) initTimer(fullData.duration);
  
  // Fecha menu mobile se necessário
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains("mobile-open")) {
    toggleMobileMenu();
  }
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

    // --- Label do Metrônomo ---
    let labelText = "";
    if (sig === "6/8") {
      labelText = (i + 1).toString();
    } else {
      if (i % 2 === 0) labelText = (i / 2 + 1).toString();
      else labelText = "e";
    }

    const label = document.createElement("span");
    label.innerText = labelText;
    label.style.fontSize = "12px"; 
    label.style.marginTop = "5px";
    label.style.color = "#888";

    const w = document.createElement("div");
    w.className = "step-wrapper";
    w.style.display = "flex";
    w.style.flexDirection = "column";
    w.style.alignItems = "center";

    w.appendChild(div); 
    w.appendChild(label); 
    tr.appendChild(w); 
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
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    for (let cycle = 0; cycle < 2; cycle++) {
    const cycleDelay = cycle * 1.5;
    for (let i = 0; i < 8; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'square'; 
        osc.frequency.value = 900; 
        const startTime = now + cycleDelay + (i * 0.15);
        const duration = 0.08; 
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01); 
        gain.gain.setValueAtTime(0.1, startTime + duration - 0.01); 
        gain.gain.linearRampToValueAtTime(0, startTime + duration); 
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

      const svgEl = container.querySelector("svg");
      if (svgEl) {
        svgEl.removeAttribute("width");
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