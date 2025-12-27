/* =================================================================
   1. CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
   ================================================================= */
let courseData = [];      
let graphDefinition = ""; 

// Link Mágico (Mantido para compatibilidade)
window.carregarAula = function(mod, less) {
    loadLesson(mod, less);
    document.getElementById("map-modal").style.display = "none";
};

/* =================================================================
   2. INICIALIZAÇÃO
   ================================================================= */
window.iniciarCurso = function(dadosDoFirebase) {
    console.log("Iniciando app...");
    
    courseData = dadosDoFirebase.lista_aulas;
    
    // Aceita exatamente o que o Admin criou (flowchart ou graph)
    graphDefinition = dadosDoFirebase.mapa_mermaid || "";

    generateMenu();
    
    if(courseData.length > 0) {
        loadLesson(0, 0);
    }

    generateSteps();
    
    const msgSetup = document.getElementById('display-text');
    if(msgSetup) msgSetup.innerHTML = "Selecione uma aula no menu.";
}

window.onload = function () {
    console.log("Interface carregada. Aguardando login...");
};

/* =================================================================
   3. LÓGICA DO SISTEMA DE AULAS
   ================================================================= */
function generateMenu() {
  const container = document.getElementById("menu-container");
  if(!container) return;
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
  if(list) list.classList.toggle("open");
}

let currentModule = 0;
let currentLesson = 0;

function loadLesson(modIdx, lessIdx) {
  if (!courseData[modIdx] || !courseData[modIdx].lessons[lessIdx]) return;

  currentModule = modIdx;
  currentLesson = lessIdx;
  const data = courseData[modIdx].lessons[lessIdx];

  document.getElementById("display-module").innerText = courseData[modIdx].module;
  document.getElementById("display-title").innerText = data.title;
  
  const textContainer = document.getElementById("display-text");
  textContainer.innerHTML = data.text ? data.text.replace(/\n/g, "<br>") : "";

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

  // AUDIO
  const audioContainer = document.getElementById("audio-container");
  const playerBass = document.getElementById("player-bass");
  const playerBack = document.getElementById("player-back");
  const rowBass = document.getElementById("row-bass");
  const rowBack = document.getElementById("row-backing");

  if(playerBass) playerBass.pause();
  if(playerBack) playerBack.pause();

  let hasAudio = false;

  if (data.audioBass && data.audioBass !== "") {
    if(playerBass) playerBass.src = data.audioBass;
    if(rowBass) rowBass.style.display = "block";
    hasAudio = true;
  } else {
    if(rowBass) rowBass.style.display = "none";
  }

  if (data.audioBack && data.audioBack !== "") {
    if(playerBack) playerBack.src = data.audioBack;
    if(rowBack) rowBack.style.display = "block";
    hasAudio = true;
  } else {
    if(rowBack) rowBack.style.display = "none";
  }

  if(audioContainer) audioContainer.style.display = hasAudio ? "block" : "none";

  updateActiveLink();
  updateNavButtons();
  initTimer(data.duration);
  
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains("mobile-open")) {
    toggleMobileMenu();
  }
}

function changeLesson(direction) {
  if(courseData.length === 0) return;
  let mod = currentModule;
  let less = currentLesson + direction;
  const maxLess = courseData[mod].lessons.length;

  if (less < 0) {
    if (mod > 0) {
      mod--;
      less = courseData[mod].lessons.length - 1;
      document.getElementById(`mod-list-${mod}`).classList.add("open");
    } else return;
  } else if (less >= maxLess) {
    if (mod < courseData.length - 1) {
      mod++;
      less = 0;
      document.getElementById(`mod-list-${mod}`).classList.add("open");
    } else return;
  }
  loadLesson(mod, less);
}

function updateNavButtons() {
  if(courseData.length === 0) return;
  const prevBtn = document.getElementById("btn-prev");
  const nextBtn = document.getElementById("btn-next");
  if(prevBtn) prevBtn.disabled = currentModule === 0 && currentLesson === 0;
  const lastMod = courseData.length - 1;
  const lastLess = courseData[lastMod].lessons.length - 1;
  if(nextBtn) nextBtn.disabled = currentModule === lastMod && currentLesson === lastLess;
}

function updateActiveLink() {
  document.querySelectorAll(".lesson-link").forEach((el) => el.classList.remove("active"));
  const activeId = `link-${currentModule}-${currentLesson}`;
  const activeEl = document.getElementById(activeId);
  if (activeEl) activeEl.classList.add("active");
}

function toggleMobileMenu() {
  const sidebar = document.getElementById("sidebar");
  if(!sidebar) return;
  sidebar.classList.toggle("mobile-open");
  const btn = document.querySelector(".mobile-menu-toggle");
  if(!btn) return;
  if (sidebar.classList.contains("mobile-open")) {
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
   4. METRÔNOMO E TIMER
   ================================================================= */
let metroInterval = null;
let bpm = 100;
let isPlaying = false;
let currentStep = 0;
let totalSteps = 8;
let stepStates = [];
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function toggleMetronome() {
  const modal = document.getElementById("metronome-modal");
  modal.style.display = modal.style.display === "flex" ? "none" : "flex";
}

function generateSteps() {
  const sigSelect = document.getElementById("time-sig");
  if(!sigSelect) return;
  const sig = sigSelect.value;
  const track = document.getElementById("sequencer-track");
  track.innerHTML = "";

  switch (sig) {
    case "4/4": totalSteps = 8; break;
    case "2/4": totalSteps = 4; break;
    case "3/4": totalSteps = 6; break;
    case "2/2": totalSteps = 4; break;
    case "7/4": totalSteps = 14; break;
    case "6/8": totalSteps = 6; break;
    default: totalSteps = 8;
  }

  stepStates = new Array(totalSteps).fill(0);
  for (let i = 0; i < totalSteps; i++) {
    if (sig.includes("/4") || sig.includes("/2")) {
      if (i % 2 === 0) stepStates[i] = 2; 
      else stepStates[i] = 0; 
    } else if (sig === "6/8") {
      if (i === 0 || i === 3) stepStates[i] = 2;
      else stepStates[i] = 1;
    }
  }

  for (let i = 0; i < totalSteps; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "step-wrapper";
    const div = document.createElement("div");
    div.className = "step-box";
    div.id = `step-${i}`; 
    div.onclick = () => cycleStepState(i);
    updateStepVisual(div, stepStates[i]);
    const label = document.createElement("div");
    label.className = "step-label";
    if (sig === "6/8") label.innerText = i + 1;
    else {
      if (i % 2 === 0) { label.innerText = i / 2 + 1; label.style.color = "#e0e0e0"; } 
      else label.innerText = "e";
    }
    wrapper.appendChild(div);
    wrapper.appendChild(label);
    track.appendChild(wrapper);
  }
}

function cycleStepState(index) {
  stepStates[index] = (stepStates[index] + 1) % 3;
  updateStepVisual(document.getElementById(`step-${index}`), stepStates[index]);
}
function updateStepVisual(div, state) {
  div.classList.remove("weak", "strong");
  if (state === 1) div.classList.add("weak");
  if (state === 2) div.classList.add("strong");
}
function playStep() {
  const prevIndex = (currentStep - 1 + totalSteps) % totalSteps;
  const prevEl = document.getElementById(`step-${prevIndex}`);
  if(prevEl) prevEl.classList.remove("playing");
  const currDiv = document.getElementById(`step-${currentStep}`);
  if (currDiv) currDiv.classList.add("playing");
  const state = stepStates[currentStep];
  if (state > 0) {
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    if (state === 2) { osc.frequency.value = 1200; gain.gain.value = 1.0; } 
    else { osc.frequency.value = 600; gain.gain.value = 0.4; }
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.1);
  }
  currentStep = (currentStep + 1) % totalSteps;
}
function updateBpm(val) {
  bpm = val;
  const bpmDisplay = document.getElementById("bpm-val");
  if(bpmDisplay) bpmDisplay.innerText = val;
  if (isPlaying) restartInterval();
}
function restartInterval() {
  clearInterval(metroInterval);
  const sigEl = document.getElementById("time-sig");
  const sig = sigEl ? sigEl.value : "4/4";
  let multiplier = 1;
  if (sig.includes("/4") || sig.includes("/2")) multiplier = 0.5;
  const intervalTime = (60000 / bpm) * multiplier;
  metroInterval = setInterval(playStep, intervalTime);
}
function togglePlayMetronome() {
  const btn = document.getElementById("btn-play-metro");
  if (isPlaying) {
    clearInterval(metroInterval);
    btn.innerText = "▶ INICIAR";
    btn.style.background = "#2c3e50";
    document.querySelectorAll(".step-box").forEach((b) => b.classList.remove("playing"));
    isPlaying = false;
  } else {
    currentStep = 0;
    restartInterval();
    btn.innerText = "⏹ PARAR";
    btn.style.background = "#c0392b";
    isPlaying = true;
  }
}

// Timer
let studyTimerInterval = null;
let studyTimeRemaining = 0;
let isStudyTimerRunning = false;
let initialDuration = 0;

function initTimer(seconds) {
  clearInterval(studyTimerInterval);
  isStudyTimerRunning = false;
  const timerBox = document.getElementById("study-timer");
  const btn = document.getElementById("btn-timer");
  const display = document.getElementById("timer-display");
  if (!timerBox || !seconds || seconds <= 0) {
    if(timerBox) timerBox.style.display = "none";
    return;
  }
  timerBox.style.display = "flex";
  initialDuration = seconds;
  studyTimeRemaining = seconds;
  if(display) updateTimerDisplay();
  if(btn) { btn.innerText = "▶ INICIAR"; btn.classList.remove("running"); btn.disabled = false; }
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
  const minutes = Math.floor(studyTimeRemaining / 60);
  const seconds = studyTimeRemaining % 60;
  const fmt = (n) => n.toString().padStart(2, "0");
  const el = document.getElementById("timer-display");
  if(el) el.innerText = `${fmt(minutes)}:${fmt(seconds)}`;
}
function finishTimer() {
  clearInterval(studyTimerInterval);
  isStudyTimerRunning = false;
  const btn = document.getElementById("btn-timer");
  if(btn) { btn.innerText = "✅ CONCLUÍDO"; btn.disabled = true; btn.classList.remove("running"); }
  playAlarmSound();
}
function playAlarmSound() {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    const startTime = now + i * 0.4;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, startTime + 0.2);
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }
}

/* =================================================================
   5. MAPA DE ESTUDO (CORREÇÃO DE ROLAGEM E CLIQUE)
   ================================================================= */
try {
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
    securityLevel: "loose",
  });
} catch (e) {
  console.log("Aviso Mermaid:", e);
}

async function toggleMap() {
  const modal = document.getElementById("map-modal");
  const container = document.getElementById("mermaid-graph");

  if (modal.style.display === "none" || modal.style.display === "") {
    modal.style.display = "flex";
    container.innerHTML = '<p style="margin-top:20px;">Carregando mapa...</p>';
    
    if(!graphDefinition || graphDefinition === "") {
        container.innerHTML = '<p style="color:red">Mapa indisponível.</p>';
        return;
    }

    try {
      const uniqueId = "graph-" + Date.now();
      const { svg } = await mermaid.render(uniqueId, graphDefinition);
      container.innerHTML = svg;
      
      const svgElement = container.querySelector('svg');
      if (svgElement) {
          svgElement.style.maxWidth = 'none'; 
          svgElement.style.height = 'auto';
          svgElement.removeAttribute('width');
      }

      container.onclick = function(e) {
          let target = e.target;
          while (target && target !== container) {
              if (target.id && target.id.indexOf("N_") !== -1) {
                  const match = target.id.match(/N_(\d+)_(\d+)/);
                  if (match) {
                      const mod = parseInt(match[1]);
                      const less = parseInt(match[2]);
                      window.carregarAula(mod, less);
                      return;
                  }
              }
              target = target.parentNode;
          }
      };

    } catch (error) {
      console.error("Erro Mapa:", error);
      container.innerHTML = `<div style="padding:20px; color:red;">Erro ao desenhar mapa. Tente recarregar.</div>`;
    }
  } else {
    modal.style.display = "none";
  }
}