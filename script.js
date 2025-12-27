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
   3. LÓGICA DO SISTEMA DE AULAS (COM LAZY LOADING)
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

// === FUNÇÃO ASSÍNCRONA DE CARREGAMENTO ===
async function loadLesson(modIdx, lessIdx) {
  if (!courseData[modIdx] || !courseData[modIdx].lessons[lessIdx]) return;
  
  currentModule = modIdx;
  currentLesson = lessIdx;
  
  // Pega dados básicos do Índice Leve
  const basicData = courseData[modIdx].lessons[lessIdx];

  // Feedback imediato
  document.getElementById("display-module").innerText = courseData[modIdx].module;
  document.getElementById("display-title").innerText = basicData.title;
  
  const textContainer = document.getElementById("display-text");
  textContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#f39c12">⏳ Carregando conteúdo...</div>';
  
  // Reseta UI (Esconde players antes de carregar)
  document.getElementById("audio-container").style.display = "none";
  const imgEl = document.getElementById("display-img");
  const imgBox = document.getElementById("img-box"); // ID NOVO (ATENÇÃO AQUI)
  
  if(imgBox) imgBox.style.display = "none";
  if(imgEl) imgEl.style.display = "none";
  
  const rBass = document.getElementById("row-bass");
  const rBack = document.getElementById("row-backing");
  if(rBass) rBass.style.display = "none";
  if(rBack) rBack.style.display = "none";

  // Busca Conteúdo (Cache ou Nuvem)
  let fullData = null;
  const cacheKey = `m${modIdx}l${lessIdx}`;

  if (lessonCache[cacheKey]) {
      console.log("Usando cache local:", cacheKey);
      fullData = lessonCache[cacheKey];
  } else {
      console.log("Baixando da nuvem:", cacheKey);
      if (window.fetchLessonContent) {
          const content = await window.fetchLessonContent(modIdx, lessIdx);
          if (content) {
              fullData = { ...basicData, ...content };
              lessonCache[cacheKey] = fullData;
          }
      }
  }

  // Fallback se não achar
  if (!fullData) fullData = basicData;

  // Renderiza Texto Seguro (DOMPurify) e SVG
  if (fullData.text) {
      let rawText = fullData.text.replace(/\n/g, "<br>");
      if (typeof DOMPurify !== 'undefined') {
          textContainer.innerHTML = DOMPurify.sanitize(rawText, {
              // Permite SVG, Imagens e Botões
              ALLOWED_TAGS: [
                  'b', 'i', 'strong', 'em', 'p', 'br', 'ul', 'li', 'h3', 'h4', 'span', 'div', 'img', 
                  'svg', 'g', 'circle', 'line', 'text', 'button'
              ],
              ALLOWED_ATTR: [
                  'style', 'class', 'onclick', 'src', 'alt', 'title', 'data-view',
                  'width', 'height', 'viewBox', 'xmlns', 
                  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'r', 'dy', 
                  'fill', 'stroke', 'stroke-width', 'transform'
              ]
          });
      } else {
          textContainer.innerHTML = rawText;
      }
  } else {
      textContainer.innerHTML = "Conteúdo não disponível.";
  }

  // === ATIVAR BOTÕES DO DIAGRAMA (SVG) ===
  const diagBtns = textContainer.querySelectorAll('.btn-diagram');
  diagBtns.forEach(btn => {
      btn.onclick = function() {
          const mode = this.getAttribute('data-view');
          const wrapper = this.closest('.diagram-wrapper');
          if (wrapper) {
              const svg = wrapper.querySelector('svg');
              if (svg) {
                  svg.setAttribute('class', `bass-diagram ${mode}`);
                  wrapper.querySelectorAll('.btn-diagram').forEach(b => b.style.background = '#eee');
                  this.style.background = '#ccc';
              }
          }
      };
  });

  // Renderiza Imagem (Lógica corrigida para o novo layout)
  if (fullData.img && fullData.img !== "") {
    if(imgEl) {
        imgEl.src = fullData.img;
        imgEl.style.display = "inline-block";
    }
    if(imgBox) imgBox.style.display = "block";
  } else {
    if(imgBox) imgBox.style.display = "none";
  }

  // Configura Áudio
  const audioContainer = document.getElementById("audio-container");
  const pBass = document.getElementById("player-bass");
  const pBack = document.getElementById("player-back");
  
  if(pBass) pBass.pause();
  if(pBack) pBack.pause();

  let hasAudio = false;
  if (fullData.audioBass && fullData.audioBass !== "") {
      if(pBass) pBass.src = fullData.audioBass;
      if (rBass) rBass.style.display = "block";
      hasAudio = true;
  }
  if (fullData.audioBack && fullData.audioBack !== "") {
      if(pBack) pBack.src = fullData.audioBack;
      if (rBack) rBack.style.display = "block";
      hasAudio = true;
  }
  
  if (audioContainer) audioContainer.style.display = hasAudio ? "block" : "none";

  updateActiveLink();
  updateNavButtons();
  if (fullData.duration) initTimer(fullData.duration);
  
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains("mobile-open")) {
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
  document.querySelectorAll(".lesson-link").forEach((el) => el.classList.remove("active"));
  const activeEl = document.getElementById(`link-${currentModule}-${currentLesson}`);
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

/* =================================================================
   4. METRÔNOMO DE ALTA PRECISÃO (Lookahead Scheduling)
   ================================================================= */
const lookahead = 25.0; 
const scheduleAheadTime = 0.1; 
let nextNoteTime = 0.0; 
let timerID = null; 

let bpm = 100, isPlaying = false, currentStep = 0, totalSteps = 8, stepStates = [];
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

  totalSteps = sig === "4/4" ? 8 : sig === "2/4" ? 4 : sig === "3/4" ? 6 : sig === "2/2" ? 4 : sig === "7/4" ? 14 : 6;
  stepStates = new Array(totalSteps).fill(0);

  for (let i = 0; i < totalSteps; i++) {
    if (sig === "6/8") {
      if (i === 0 || i === 3) stepStates[i] = 2; else stepStates[i] = 1;
    } else {
      if (i % 2 === 0) stepStates[i] = 2;
    }

    const div = document.createElement("div");
    div.className = "step-box";
    div.id = `step-${i}`;
    div.onclick = () => cycleStepState(i);
    updateStepVisual(div, stepStates[i]);

    let labelText = "";
    if (sig === "6/8") labelText = (i + 1).toString();
    else labelText = (i % 2 === 0) ? (i / 2 + 1).toString() : "e";

    const label = document.createElement("span");
    label.innerText = labelText;
    label.style.fontSize = "12px"; label.style.marginTop = "5px"; label.style.color = "#888";

    const w = document.createElement("div");
    w.className = "step-wrapper";
    w.style.display = "flex"; w.style.flexDirection = "column"; w.style.alignItems = "center";
    w.appendChild(div); w.appendChild(label);
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

function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    const mul = document.getElementById("time-sig").value.includes("/4") ? 0.5 : 1;
    nextNoteTime += (secondsPerBeat * mul);
    currentStep++;
    if (currentStep === totalSteps) currentStep = 0;
}

function scheduleNote(stepNumber, time) {
    if (stepStates[stepNumber] > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = stepStates[stepNumber] === 2 ? 1200 : 600;
        gain.gain.value = stepStates[stepNumber] === 2 ? 1.0 : 0.4;
        osc.start(time);
        gain.gain.setValueAtTime(gain.gain.value, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.stop(time + 0.1);
    }
    const drawDelay = (time - audioCtx.currentTime) * 1000;
    setTimeout(() => {
        for(let i=0; i<totalSteps; i++) document.getElementById(`step-${i}`)?.classList.remove("playing");
        document.getElementById(`step-${stepNumber}`)?.classList.add("playing");
    }, Math.max(0, drawDelay));
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentStep, nextNoteTime);
        nextNote();
    }
}

function togglePlayMetronome() {
  const btn = document.getElementById("btn-play-metro");
  if (isPlaying) {
    window.clearInterval(timerID);
    isPlaying = false;
    btn.innerText = "▶ INICIAR";
    btn.style.background = "#2c3e50";
    document.querySelectorAll(".step-box").forEach(el => el.classList.remove("playing"));
  } else {
    if (audioCtx.state === "suspended") audioCtx.resume();
    currentStep = 0;
    nextNoteTime = audioCtx.currentTime + 0.05;
    timerID = setInterval(scheduler, lookahead);
    isPlaying = true;
    btn.innerText = "⏹ PARAR";
    btn.style.background = "#c0392b";
  }
}

function updateBpm(v) {
  bpm = parseInt(v);
  document.getElementById("bpm-val").innerText = bpm;
}

/* =================================================================
   5. TIMER DE ESTUDO
   ================================================================= */
let studyTimerInterval = null, studyTimeRemaining = 0, isStudyTimerRunning = false, initialDuration = 0;

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
  const m = Math.floor(studyTimeRemaining / 60), s = studyTimeRemaining % 60;
  const d = document.getElementById("timer-display");
  if (d) d.innerText = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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

/* =================================================================
   6. MERMAID (MAPA MENTAL) COM TRATAMENTO DE ERRO
   ================================================================= */
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
    flowchart: { curve: "basis", nodeSpacing: 10, rankSpacing: 30, padding: 5 },
  });
} catch (e) {}

async function toggleMap() {
  const modal = document.getElementById("map-modal");
  const container = document.getElementById("mermaid-graph");

  if (modal.style.display === "none" || modal.style.display === "") {
    modal.style.display = "flex";
    container.innerHTML = '<p style="margin-top:20px;">Carregando...</p>';

    if (!graphDefinition) {
      container.innerHTML = "<p style='color:red'>Erro: O mapa está vazio. Use o Painel Admin para gerar.</p>";
      return;
    }

    try {
      const { svg } = await mermaid.render("graph-" + Date.now(), graphDefinition);
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
      console.error("Erro Mermaid:", e);
      container.innerHTML = `
        <div style="background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; border-radius: 8px; padding: 20px; color: #c0392b; margin-top: 20px;">
            <h3 style="margin-top:0">😕 Ops! Erro no Mapa</h3>
            <p>Não foi possível desenhar o mapa visual devido a um erro de formatação.</p>
            <p style="font-size: 0.8rem; font-family: monospace; background: rgba(0,0,0,0.05); padding: 5px;">${e.message}</p>
        </div>
      `;
    }
  } else {
    modal.style.display = "none";
  }
}