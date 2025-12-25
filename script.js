/* =================================================================
   1. CONFIGURAÇÃO PWA E INICIALIZAÇÃO
   ================================================================= */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}

/* =================================================================
   2. DADOS DO CURSO (AQUI VOCÊ ADICIONA AS AULAS)
   ================================================================= */
const courseData = [
    {
        module: "Módulo 1: Fundamentos",
        lessons: [
            { 
                title: "Aula 01: Postura", 
                text: "Texto da aula de postura...", 
                img: "imagens/aula01-postura.png", 
                audioBass: "", audioBack: ""
            },
            { 
                title: "Aula 02: Cordas Soltas", 
                text: "Texto da aula de cordas...", 
                img: "imagens/aula02-cordas.png", 
                audioBass: "audios/aula02-bass.mp3", audioBack: "audios/aula02-back.mp3",
                duration: 10
            },
            { 
                title: "Aula 03: Mão Direita", 
                text: "Exercícios de alternância de dedos (I e M).", 
                img: "", 
                audioBass: "", audioBack: "",
                duration: 200
            }
        ]
    },
    {
        module: "Módulo 2: O Groove",
        lessons: [
            { 
                title: "Aula 04: Tônica e Quinta", 
                text: "Para entender esta aula, você precisa lembrar das cordas soltas.\n\nSe não lembra, revise a <span class='link-interno' onclick='loadLesson(0, 1)'>Aula 02: Cordas Soltas</span> antes de continuar.\n\nTambém é importante estar com a técnica em dia. Veja a <span class='link-interno' onclick='loadLesson(0, 2)'>Aula 03: Mão Direita</span>.",
                img: "imagens/aula03-quinta.png", 
                audioBass: "audios/aula03-bass.mp3", audioBack: ""
            },
            { 
                title: "Aula 05: Ritmo Básico", 
                text: "Introdução às semínimas e colcheias.", 
                img: "", 
                audioBass: "", audioBack: ""
            }
        ]
    }
];

/* =================================================================
   3. LÓGICA DO SISTEMA DE AULAS
   ================================================================= */
let currentModule = 0;
let currentLesson = 0;

window.onload = function() {
    generateMenu();
    loadLesson(0, 0); 
    generateSteps(); // Inicia o metrônomo visualmente
};

function generateMenu() {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';

    courseData.forEach((mod, modIdx) => {
        const modHeader = document.createElement('div');
        modHeader.className = 'module-header';
        modHeader.innerHTML = `${mod.module} <span style="font-size:0.8em">▼</span>`;
        modHeader.onclick = () => toggleModule(modIdx);
        
        const lessonList = document.createElement('div');
        lessonList.className = 'lessons-list';
        lessonList.id = `mod-list-${modIdx}`;
        
        if(modIdx === 0) lessonList.classList.add('open');

        mod.lessons.forEach((less, lessIdx) => {
            const btn = document.createElement('div');
            btn.className = 'lesson-link';
            btn.id = `link-${modIdx}-${lessIdx}`;
            btn.innerText = less.title;
            btn.onclick = () => {
                loadLesson(modIdx, lessIdx);
                if(window.innerWidth <= 768) toggleMobileMenu();
            };
            lessonList.appendChild(btn);
        });

        container.appendChild(modHeader);
        container.appendChild(lessonList);
    });
}

function toggleModule(modIdx) {
    const list = document.getElementById(`mod-list-${modIdx}`);
    list.classList.toggle('open');
}

function loadLesson(modIdx, lessIdx) {
    if (!courseData[modIdx] || !courseData[modIdx].lessons[lessIdx]) {
        console.error("Erro: Aula não encontrada!", modIdx, lessIdx);
        alert("Esta aula ainda não foi cadastrada no sistema.");
        return;
    }

    currentModule = modIdx;
    currentLesson = lessIdx;
    const data = courseData[modIdx].lessons[lessIdx];

    document.getElementById('display-module').innerText = courseData[modIdx].module;
    document.getElementById('display-title').innerText = data.title;
    document.getElementById('display-text').innerHTML = data.text.replace(/\n/g, "<br>");

    const imgEl = document.getElementById('display-img');
    const noImgEl = document.getElementById('no-image-msg');
    if (data.img && data.img !== "") {
        imgEl.src = data.img;
        imgEl.style.display = 'inline-block';
        noImgEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        noImgEl.style.display = 'block';
    }

    const audioContainer = document.getElementById('audio-container');
    const playerBass = document.getElementById('player-bass');
    const playerBack = document.getElementById('player-back');
    const rowBass = document.getElementById('row-bass');
    const rowBack = document.getElementById('row-backing');

    playerBass.pause(); playerBack.pause();
    
    let hasAudio = false;

    if (data.audioBass && data.audioBass !== "") {
        playerBass.src = data.audioBass;
        rowBass.style.display = 'block';
        hasAudio = true;
    } else {
        rowBass.style.display = 'none';
    }

    if (data.audioBack && data.audioBack !== "") {
        playerBack.src = data.audioBack;
        rowBack.style.display = 'block';
        hasAudio = true;
    } else {
        rowBack.style.display = 'none';
    }

    audioContainer.style.display = hasAudio ? 'block' : 'none';

    updateActiveLink();
    updateNavButtons();
    initTimer(data.duration);
}

function changeLesson(direction) {
    let mod = currentModule;
    let less = currentLesson + direction;
    const maxLess = courseData[mod].lessons.length;

    if (less < 0) {
        if (mod > 0) {
            mod--;
            less = courseData[mod].lessons.length - 1;
            document.getElementById(`mod-list-${mod}`).classList.add('open');
        } else return;
    } else if (less >= maxLess) {
        if (mod < courseData.length - 1) {
            mod++;
            less = 0;
            document.getElementById(`mod-list-${mod}`).classList.add('open');
        } else return;
    }

    loadLesson(mod, less);
}

function updateNavButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    prevBtn.disabled = (currentModule === 0 && currentLesson === 0);
    const lastMod = courseData.length - 1;
    const lastLess = courseData[lastMod].lessons.length - 1;
    nextBtn.disabled = (currentModule === lastMod && currentLesson === lastLess);
}

function updateActiveLink() {
    document.querySelectorAll('.lesson-link').forEach(el => el.classList.remove('active'));
    const activeId = `link-${currentModule}-${currentLesson}`;
    const activeEl = document.getElementById(activeId);
    if(activeEl) activeEl.classList.add('active');
}

function toggleMobileMenu() {
    const menu = document.getElementById('menu-container');
    menu.classList.toggle('show-mobile');
}

/* =================================================================
   4. METRÔNOMO SEQUENCIADOR
   ================================================================= */
let metroInterval = null;
let bpm = 100;
let isPlaying = false;
let currentStep = 0;
let totalSteps = 8;
let stepStates = []; 
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function toggleMetronome() {
    const modal = document.getElementById('metronome-modal');
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
}

function generateSteps() {
    const sig = document.getElementById('time-sig').value;
    const track = document.getElementById('sequencer-track');
    track.innerHTML = '';
    
    switch(sig) {
        case '4/4': totalSteps = 8; break;
        case '2/4': totalSteps = 4; break;
        case '3/4': totalSteps = 6; break;
        case '2/2': totalSteps = 4; break; 
        case '7/4': totalSteps = 14; break;
        case '6/8': totalSteps = 6; break;
        default: totalSteps = 8;
    }

    stepStates = new Array(totalSteps).fill(0);
    
    for(let i=0; i<totalSteps; i++) {
        if(sig.includes('/4') || sig.includes('/2')) {
            if(i % 2 === 0) stepStates[i] = 2; 
            else stepStates[i] = 0; 
        } 
        else if (sig === '6/8') {
            if(i === 0 || i === 3) stepStates[i] = 2;
            else stepStates[i] = 1;
        }
    }

    for (let i = 0; i < totalSteps; i++) {
        const div = document.createElement('div');
        div.className = 'step-box';
        div.id = `step-${i}`;
        div.onclick = () => cycleStepState(i);
        updateStepVisual(div, stepStates[i]);
        track.appendChild(div);
    }
}

function cycleStepState(index) {
    stepStates[index] = (stepStates[index] + 1) % 3;
    const div = document.getElementById(`step-${index}`);
    updateStepVisual(div, stepStates[index]);
}

function updateStepVisual(div, state) {
    div.classList.remove('weak', 'strong');
    if (state === 1) div.classList.add('weak');
    if (state === 2) div.classList.add('strong');
}

function playStep() {
    const prevIndex = (currentStep - 1 + totalSteps) % totalSteps;
    document.getElementById(`step-${prevIndex}`).classList.remove('playing');
    const currDiv = document.getElementById(`step-${currentStep}`);
    if(currDiv) currDiv.classList.add('playing');

    const state = stepStates[currentStep];
    if (state > 0) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (state === 2) { 
            osc.frequency.value = 1200; 
            gain.gain.value = 1.0;
        } else { 
            osc.frequency.value = 600; 
            gain.gain.value = 0.4;
        }

        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc.stop(audioCtx.currentTime + 0.1);
    }
    currentStep = (currentStep + 1) % totalSteps;
}

function updateBpm(val) {
    bpm = val;
    document.getElementById('bpm-val').innerText = val;
    if (isPlaying) restartInterval();
}

function restartInterval() {
    clearInterval(metroInterval);
    const sig = document.getElementById('time-sig').value;
    let multiplier = 1;
    if(sig.includes('/4') || sig.includes('/2')) multiplier = 0.5;
    const intervalTime = (60000 / bpm) * multiplier; 
    metroInterval = setInterval(playStep, intervalTime);
}

function togglePlayMetronome() {
    const btn = document.getElementById('btn-play-metro');
    if (isPlaying) {
        clearInterval(metroInterval);
        btn.innerText = "▶ INICIAR";
        btn.style.background = "#2c3e50";
        document.querySelectorAll('.step-box').forEach(b => b.classList.remove('playing'));
        isPlaying = false;
    } else {
        currentStep = 0;
        restartInterval();
        btn.innerText = "⏹ PARAR";
        btn.style.background = "#c0392b";
        isPlaying = true;
    }
}

/* =================================================================
   5. TIMER DE ESTUDO
   ================================================================= */
let studyTimerInterval = null;
let studyTimeRemaining = 0;
let isStudyTimerRunning = false;
let initialDuration = 0;

function initTimer(seconds) {
    clearInterval(studyTimerInterval);
    isStudyTimerRunning = false;
    const timerBox = document.getElementById('study-timer');
    const btn = document.getElementById('btn-timer');
    
    if (!seconds || seconds <= 0) {
        timerBox.style.display = 'none';
        return;
    }

    timerBox.style.display = 'flex';
    initialDuration = seconds;
    studyTimeRemaining = seconds;
    updateTimerDisplay();
    btn.innerText = "▶ INICIAR";
    btn.classList.remove('running');
    btn.disabled = false;
}

function toggleStudyTimer() {
    const btn = document.getElementById('btn-timer');
    if (isStudyTimerRunning) {
        clearInterval(studyTimerInterval);
        isStudyTimerRunning = false;
        btn.innerText = "▶ CONTINUAR";
        btn.classList.remove('running');
    } else {
        if (studyTimeRemaining <= 0) studyTimeRemaining = initialDuration;
        isStudyTimerRunning = true;
        btn.innerText = "⏸ PAUSAR";
        btn.classList.add('running');
        
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
    const fmt = (n) => n.toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${fmt(minutes)}:${fmt(seconds)}`;
}

function finishTimer() {
    clearInterval(studyTimerInterval);
    isStudyTimerRunning = false;
    const btn = document.getElementById('btn-timer');
    btn.innerText = "✅ CONCLUÍDO";
    btn.disabled = true;
    btn.classList.remove('running');
    playAlarmSound();
}

function playAlarmSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880; 
        const startTime = now + (i * 0.4);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.2);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
    }
}

/* =================================================================
   6. MAPA DE ESTUDO (MERMAID)
   ================================================================= */
const lessonMap = {
    "A0": [0, 0], 
    "A1": [0, 1], 
    "A2": [0, 2], 
    "B0": [1, 0], 
    "B1": [1, 1]  
};

const graphDefinition = `
graph TD
    classDef default fill:#fff,stroke:#333,stroke-width:2px,cursor:pointer;
    classDef active fill:#e67e22,stroke:#d35400,color:white,cursor:pointer;

    subgraph M1 [Módulo 1: Fundamentos]
        direction TB
        A0[01. Postura] --> A1[02. Cordas Soltas]
        A1 --> A2[03. Mão Direita]
    end

    subgraph M2 [Módulo 2: O Groove]
        direction TB
        B0[04. Tônica e Quinta]
        B1[05. Ritmo Básico]
    end

    A2 --> B0
    B0 --> B1
`;

try {
    mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
} catch (e) { console.log("Aviso Mermaid:", e); }

async function toggleMap() {
    const modal = document.getElementById('map-modal');
    const container = document.getElementById('mermaid-graph');
    
    if (modal.style.display === 'none' || modal.style.display === '') {
        modal.style.display = 'flex';
        container.innerHTML = '<p style="margin-top:20px;">Carregando mapa...</p>';
        try {
            const uniqueId = 'graph-' + Date.now();
            const { svg } = await mermaid.render(uniqueId, graphDefinition);
            container.innerHTML = svg;
            container.onclick = function(event) {
                let target = event.target;
                while (target && target !== container) {
                    if (target.id) {
                        for (const key of Object.keys(lessonMap)) {
                            if (target.id.indexOf(key) !== -1) {
                                const [mod, less] = lessonMap[key];
                                goToLesson(mod, less);
                                return;
                            }
                        }
                    }
                    target = target.parentNode;
                }
            };
        } catch (error) {
            console.error('Erro Mapa:', error);
            container.innerHTML = `<div style="padding:20px; color:red;">Erro ao desenhar mapa. Use o menu lateral.</div>`;
        }
    } else {
        modal.style.display = 'none';
    }
}

function goToLesson(mod, less) {
    loadLesson(mod, less);
    document.getElementById('map-modal').style.display = 'none';
}