/* === CONFIGURAÇÕES E DADOS === */
const notesScale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Definição dos Intervalos (Nome e semitons de distância)
const intervals = [
    { name: "Segunda Menor", semitones: 1 },
    { name: "Segunda Maior", semitones: 2 },

    { name: "Terça Menor", semitones: 3 },
    { name: "Terça Maior", semitones: 4 },

    { name: "Quarta Justa", semitones: 5 },

    { name: "Quarta Trítono (4ª Aum / 5ª Dim)", semitones: 6 },

    { name: "Quinta Justa", semitones: 7 }, // Pulei trítono (6) para simplificar
    { name: "Sexta Menor", semitones: 8 },
    { name: "Sexta Maior", semitones: 9 },
    { name: "Sétima Menor", semitones: 10 },
    { name: "Sétima Maior", semitones: 11 },
    { name: "Oitava", semitones: 12 }
];

// Contexto de Áudio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Estado Atual
let currentRootIndex = 0; // 0 = C
let currentInterval = null;
let currentAnswerIndex = 0;
let completedCount = 0;
let isFlipped = false;

/* === ELEMENTOS === */
const card = document.getElementById("flashcard");
const questionText = document.getElementById("question-text");
const answerText = document.getElementById("answer-text");
const btnNext = document.getElementById("btnNext");
const counterVal = document.getElementById("counter-val");

/* === LÓGICA DE ÁUDIO (SINTETIZADOR) === */
function playTone(midiNote, duration = 1.0, type = 'triangle') {
    if(audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Frequência baseada em MIDI (60 = Dó Central)
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    
    osc.type = type;
    osc.frequency.value = freq;

    gain.connect(audioCtx.destination);
    osc.connect(gain);

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.start(now);
    osc.stop(now + duration);
}

/* === LÓGICA DO JOGO === */

function generateCard() {
    // 1. Resetar Estado
    isFlipped = false;
    card.classList.remove("is-flipped");
    btnNext.classList.remove("active");
    
    // 2. Sortear Nota Base (Root) - Entre C3 (48) e C4 (60)
    currentRootIndex = Math.floor(Math.random() * 12);
    const rootNoteName = notesScale[currentRootIndex];
    
    // 3. Sortear Intervalo
    currentInterval = intervals[Math.floor(Math.random() * intervals.length)];
    
    // 4. Calcular Resposta
    // A lógica é circular: se passar de B, volta para C (usando módulo %)
    currentAnswerIndex = (currentRootIndex + currentInterval.semitones) % 12;
    const answerNoteName = notesScale[currentAnswerIndex];

    // 5. Atualizar Interface
    questionText.innerHTML = `${currentInterval.name}<br>de <span style="color:#e67e22">${rootNoteName}</span>`;
    answerText.innerText = answerNoteName;

    // 6. Tocar a Nota Base (Root)
    setTimeout(() => {
        // Base MIDI 48 (C3) + índice
        playTone(48 + currentRootIndex, 1.5, 'triangle');
    }, 500);
}

function flipCard() {
    if(isFlipped) return; // Evita virar duas vezes

    isFlipped = true;
    card.classList.add("is-flipped");
    
    // Habilitar botão Próximo
    btnNext.classList.add("active");

    // Tocar o Intervalo (Resposta)
    // Tocamos a raiz de novo (curto) e a resposta (longo)
    const rootMidi = 48 + currentRootIndex;
    const answerMidi = rootMidi + currentInterval.semitones;

    playTone(rootMidi, 0.5, 'triangle'); // Raiz rápida
    setTimeout(() => {
        playTone(answerMidi, 1.5, 'triangle'); // Resposta
    }, 500);
}

function nextCard() {
    if(!isFlipped) return; // Só funciona se já tiver virado

    completedCount++;
    counterVal.innerText = completedCount;
    generateCard();
}

/* === EVENTOS === */
card.addEventListener('click', flipCard);

// Iniciar
window.onload = () => {
    generateCard();
};