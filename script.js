/* =================================================================
   1. GESTÃO DE ESTADO & CONFIG
   ================================================================= */
let courseData = [];
let graphDefinition = "";
const lessonCache = {}; 
let currentModule = 0;
let currentLesson = 0;

// Link Mágico (Mapa -> Aula)
window.carregarAula = function (mod, less) {
  loadLesson(mod, less);
  const mapModal = document.getElementById("map-modal");
  if(mapModal) mapModal.style.display = "none";
};

/* =================================================================
   2. INICIALIZAÇÃO (Boot)
   ================================================================= */
window.iniciarCurso = function (dadosDoFirebase) {
  console.log("🔥 App Iniciado");
  document.getElementById("app-container").style.opacity = "1";
  
  courseData = dadosDoFirebase.lista_aulas;
  graphDefinition = dadosDoFirebase.mapa_mermaid || "";

  generateMenu();

  if (courseData.length > 0) loadLesson(0, 0);

  generateSteps(); // Inicializa visual do metrônomo
};

/* === LÓGICA DE LOGIN === */
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Previne recarregamento da página
            
            const email = document.getElementById('email').value;
            const pass = document.getElementById('password').value;
            const btn = document.getElementById('btnLogin');
            
            btn.innerText = "Entrando...";
            btn.disabled = true;
            
            // Tenta usar a função global do firebase.js se existir
            if (window.loginWithFirebase) {
                window.loginWithFirebase(email, pass).catch(err => {
                    btn.innerText = "ENTRAR NA ÁREA DO ALUNO";
                    btn.disabled = false;
                    alert("Erro ao logar: " + err.message);
                });
            } else {
                console.warn("Função loginWithFirebase não encontrada. Verifique firebase.js");
                // Se o firebase.js ainda não carregou, ele pode capturar depois, 
                // mas isso aqui é um fallback de segurança.
                setTimeout(() => {
                    // Se nada acontecer em 3s, restaura o botão
                    btn.innerText = "ENTRAR NA ÁREA DO ALUNO";
                    btn.disabled = false;
                }, 3000);
            }
        });
    }
});

/* =================================================================
   3. MENU E NAVEGAÇÃO
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
      btn.onclick = () => {
          loadLesson(modIdx, lessIdx);
          closeMobileMenu();
      };
      lessonList.appendChild(btn);
    });
    container.appendChild(modHeader);
    container.appendChild(lessonList);
  });
}

function toggleModule(idx) {
  document.getElementById(`mod-list-${idx}`)?.classList.toggle("open");
}

function toggleMobileMenu() {
    document.getElementById("sidebar").classList.toggle("mobile-open");
}

function closeMobileMenu() {
    document.getElementById("sidebar").classList.remove("mobile-open");
}

function toggleGamesMenu() {
    const submenu = document.getElementById('games-submenu');
    const arrow = document.getElementById('games-arrow');
    if (submenu.style.display === "flex") {
        submenu.style.display = "none";
        arrow.classList.remove("rotate-arrow");
    } else {
        submenu.style.display = "flex";
        arrow.classList.add("rotate-arrow");
    }
}

/* =================================================================
   4. CARREGAMENTO DE AULA
   ================================================================= */
async function loadLesson(modIdx, lessIdx) {
  if (!courseData[modIdx] || !courseData[modIdx].lessons[lessIdx]) return;
  
  currentModule = modIdx;
  currentLesson = lessIdx;
  const basicData = courseData[modIdx].lessons[lessIdx];

  document.getElementById("display-module").innerText = courseData[modIdx].module;
  document.getElementById("display-title").innerText = basicData.title;
  const textContainer = document.getElementById("display-text");
  textContainer.innerHTML = '<div style="opacity:0.6; text-align:center;">⏳ Carregando...</div>';

  resetMedia();

  let fullData = lessonCache[`m${modIdx}l${lessIdx}`];
  if (!fullData && window.fetchLessonContent) {
      const content = await window.fetchLessonContent(modIdx, lessIdx);
      if (content) {
          fullData = { ...basicData, ...content };
          lessonCache[`m${modIdx}l${lessIdx}`] = fullData;
      }
  }
  if (!fullData) fullData = basicData;

  if (fullData.text && typeof DOMPurify !== 'undefined') {
      textContainer.innerHTML = DOMPurify.sanitize(fullData.text.replace(/\n/g, "<br>"), {
          ALLOWED_TAGS: ['b', 'i', 'strong', 'em', 'p', 'br', 'ul', 'li', 'h3', 'h4', 'span', 'div', 'img', 'svg', 'g', 'circle', 'line', 'text', 'button'],
          ALLOWED_ATTR: ['style', 'class', 'onclick', 'src', 'alt', 'width', 'height', 'viewBox', 'x', 'y', 'r', 'fill', 'stroke', 'stroke-width', 'transform', 'data-view']
      });
  } else {
      textContainer.innerHTML = fullData.text || "Conteúdo indisponível.";
  }

  // Ativar botões de diagrama SVG
  const diagBtns = textContainer.querySelectorAll('.btn-diagram');
  diagBtns.forEach(btn => {
      btn.onclick = function() {
          const mode = this.getAttribute('data-view');
          const wrapper = this.closest('.diagram-wrapper');
          if (wrapper) {
              const svg = wrapper.querySelector('svg');
              if (svg) {
                  svg.setAttribute('class', `bass-diagram ${mode}`);
                  wrapper.querySelectorAll('.btn-diagram').forEach(b => {
                      b.style.backgroundColor = '#e0e0e0';
                      b.style.color = '#121212';
                  });
                  this.style.backgroundColor = '#ffffff';
                  this.style.color = '#000000';
                  this.style.borderColor = 'var(--accent-color)';
              }
          }
      };
  });

  const imgBox = document.getElementById("img-box");
  const imgEl = document.getElementById("display-img");
  if (fullData.img) {
      imgEl.src = fullData.img;
      imgBox.style.display = "block";
  } else {
      imgBox.style.display = "none";
  }

  if (fullData.audioBass || fullData.audioBack) {
      document.getElementById("audio-container").style.display = "block";
      if(fullData.audioBass) {
          document.getElementById("player-bass").src = fullData.audioBass;
          document.getElementById("row-bass").style.display = "block";
      }
      if(fullData.audioBack) {
          document.getElementById("player-back").src = fullData.audioBack;
          document.getElementById("row-backing").style.display = "block";
      }
  }

  updateActiveLink();
  updateNavButtons();
  if (fullData.duration) initTimer(fullData.duration);
  document.getElementById("content").scrollTop = 0;
}

function resetMedia() {
    document.getElementById("audio-container").style.display = "none";
    document.getElementById("row-bass").style.display = "none";
    document.getElementById("row-backing").style.display = "none";
    const p1 = document.getElementById("player-bass");
    const p2 = document.getElementById("player-back");
    p1.pause(); p1.src = "";
    p2.pause(); p2.src = "";
}

function changeLesson(dir) {
    let m = currentModule, l = currentLesson + dir;
    if (l < 0) {
        if (m > 0) { m--; l = courseData[m].lessons.length - 1; } else return;
    } else if (l >= courseData[m].lessons.length) {
        if (m < courseData.length - 1) { m++; l = 0; } else return;
    }
    const modList = document.getElementById(`mod-list-${m}`);
    if(modList && !modList.classList.contains('open')) modList.classList.add('open');
    loadLesson(m, l);
}

function updateNavButtons() {
    const isFirst = currentModule === 0 && currentLesson === 0;
    const isLast = currentModule === courseData.length - 1 && currentLesson === courseData[currentModule].lessons.length - 1;
    document.getElementById("btn-prev").disabled = isFirst;
    document.getElementById("btn-next").disabled = isLast;
}

function updateActiveLink() {
    document.querySelectorAll(".lesson-link").forEach(el => el.classList.remove("active"));
    const active = document.getElementById(`link-${currentModule}-${currentLesson}`);
    if (active) {
        active.classList.add("active");
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/* =================================================================
   5. METRÔNOMO PRO
   ================================================================= */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const lookahead = 25.0; 
const scheduleAheadTime = 0.1; 
let nextNoteTime = 0.0; 
let timerID = null; 
let bpm = 100, isPlaying = false, currentStep = 0, totalSteps = 8, stepStates = [];

function toggleMetronome() {
    const el = document.getElementById("metronome-modal");
    el.style.display = (el.style.display === "flex") ? "none" : "flex";
}

function togglePlayMetronome() {
    const btn = document.getElementById("btn-play-metro");
    if (isPlaying) {
        clearInterval(timerID);
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

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentStep, nextNoteTime);
        nextNote();
    }
}

function scheduleNote(step, time) {
    if (stepStates[step] > 0) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = stepStates[step] === 2 ? 1200 : 600; 
        gain.gain.value = stepStates[step] === 2 ? 1 : 0.4;
        osc.start(time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.stop(time + 0.1);
    }
    const drawDelay = (time - audioCtx.currentTime) * 1000;
    setTimeout(() => {
        document.querySelectorAll(".step-box").forEach(b => b.classList.remove("playing"));
        const box = document.getElementById(`step-${step}`);
        if(box) box.classList.add("playing");
    }, Math.max(0, drawDelay));
}

function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    const sig = document.getElementById("time-sig").value;
    const mul = sig.includes("/8") ? 0.5 : 1; 
    nextNoteTime += (secondsPerBeat * mul);
    currentStep++;
    if (currentStep === totalSteps) currentStep = 0;
}

function generateSteps() {
    const sig = document.getElementById("time-sig")?.value || "4/4";
    const track = document.getElementById("sequencer-track");
    if (!track) return;
    track.innerHTML = "";
    
    switch(sig) {
        case "2/4": totalSteps = 4; break;
        case "2/2": totalSteps = 4; break;
        case "3/4": totalSteps = 6; break;
        case "4/4": totalSteps = 8; break;
        case "5/4": totalSteps = 10; break;
        case "6/8": totalSteps = 6; break;
        case "9/8": totalSteps = 9; break;
        case "12/8": totalSteps = 12; break;
        case "7/4": totalSteps = 14; break;
        default: totalSteps = 8;
    }
    
    stepStates = new Array(totalSteps).fill(0);
    
    for(let i=0; i<totalSteps; i++) {
        if (sig.includes("/8")) {
            if (i % 3 === 0) stepStates[i] = (i === 0) ? 2 : 1;
        } else {
            if (i % 2 === 0) stepStates[i] = (i === 0) ? 2 : 1;
        }
        
        const div = document.createElement("div");
        div.className = `step-box ${stepStates[i] === 2 ? 'strong' : stepStates[i] === 1 ? 'weak' : ''}`;
        div.id = `step-${i}`;
        div.onclick = () => {
            stepStates[i] = (stepStates[i] + 1) % 3;
            div.className = `step-box ${stepStates[i] === 2 ? 'strong' : stepStates[i] === 1 ? 'weak' : ''}`;
        };

        let labelText = "";
        if (sig.includes("/8")) labelText = (i + 1).toString();
        else labelText = (i % 2 === 0) ? (i / 2 + 1).toString() : "e";

        const label = document.createElement("span");
        label.innerText = labelText;
        label.style.fontSize = "12px"; label.style.marginTop = "5px"; label.style.color = "#888";

        const wrapper = document.createElement("div");
        wrapper.className = "step-wrapper";
        wrapper.style.display = "flex"; wrapper.style.flexDirection = "column"; wrapper.style.alignItems = "center"; 
        wrapper.style.width = "40px"; wrapper.style.flexShrink = "0";
        
        wrapper.appendChild(div); wrapper.appendChild(label);
        track.appendChild(wrapper);
    }
}

function updateBpm(val) {
    bpm = parseInt(val);
    document.getElementById("bpm-val").innerText = bpm;
}

/* =================================================================
   6. TIMER & ALARME
   ================================================================= */
let studyTimer = null, studySecs = 0, isTimerRunning = false, initialSecs = 0;

function initTimer(duration) {
    clearInterval(studyTimer);
    isTimerRunning = false;
    initialSecs = duration;
    studySecs = duration;
    
    const display = document.getElementById("study-timer");
    if(duration > 0) {
        display.style.display = "flex";
        updateTimerUI();
        const btn = document.getElementById("btn-timer");
        btn.innerText = "▶ INICIAR";
        btn.classList.remove("running");
    } else {
        display.style.display = "none";
    }
}

function toggleStudyTimer() {
    const btn = document.getElementById("btn-timer");
    if (isTimerRunning) {
        clearInterval(studyTimer);
        isTimerRunning = false;
        btn.innerText = "▶ CONTINUAR";
        btn.classList.remove("running");
    } else {
        if(studySecs <= 0) studySecs = initialSecs;
        isTimerRunning = true;
        btn.innerText = "⏸ PAUSAR";
        btn.classList.add("running");
        
        studyTimer = setInterval(() => {
            if(studySecs > 0) {
                studySecs--;
                updateTimerUI();
            } else {
                finishTimer();
            }
        }, 1000);
    }
}

function updateTimerUI() {
    const m = Math.floor(studySecs / 60).toString().padStart(2,'0');
    const s = (studySecs % 60).toString().padStart(2,'0');
    document.getElementById("timer-display").innerText = `${m}:${s}`;
}

function finishTimer() {
  clearInterval(studyTimer);
  isTimerRunning = false;
  const b = document.getElementById("btn-timer");
  if (b) {
    b.innerText = "✅ FIM";
    b.disabled = true;
    b.classList.remove("running");
  }
  playAlarm();
}

function playAlarm() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const volume = 0.5; // Volume Alto

    for (let cycle = 0; cycle < 2; cycle++) {
        const cycleDelay = cycle * 1.5; 
        for (let i = 0; i < 8; i++) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.type = 'square'; osc.frequency.value = 900; 
            const startTime = now + cycleDelay + (i * 0.15);
            const duration = 0.08; 
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.01); 
            gain.gain.setValueAtTime(volume, startTime + duration - 0.01); 
            gain.gain.linearRampToValueAtTime(0, startTime + duration); 
            osc.start(startTime);
            osc.stop(startTime + duration + 0.05);
        }
    }
}

// === MAPA MERMAID ===
try {
  mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
} catch (e) {}

async function toggleMap() {
  const el = document.getElementById("map-modal");
  const isOpen = el.style.display === "flex";
  
  if(!isOpen) {
      el.style.display = "flex";
      const container = document.getElementById("mermaid-graph");
      if(graphDefinition) {
          try {
              const { svg } = await mermaid.render("graphDiv", graphDefinition);
              container.innerHTML = svg;
              container.onclick = (e) => {
                  let target = e.target;
                  while (target && target !== container) {
                      if (target.id && target.id.includes("N_")) {
                          const match = target.id.match(/N_(\d+)_(\d+)/);
                          if (match) {
                              window.carregarAula(parseInt(match[1]), parseInt(match[2]));
                              return;
                          }
                      }
                      target = target.parentNode;
                  }
              };
          } catch(e) { container.innerHTML = "Erro ao gerar mapa visual."; }
      }
  } else {
      el.style.display = "none";
  }
}

// Fix Rotação Mobile
window.addEventListener('resize', () => {
    document.getElementById("app-container").style.height = window.innerHeight + "px";
});