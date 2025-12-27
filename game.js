/* === CONFIGURAÇÕES === */
const strings = 4;
const frets = 12;
const fretboardEl = document.getElementById("fretboard");
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Cordas: G (topo visual), D, A, E (fundo visual)
// MIDI: G2=43, D2=38, A1=33, E1=28
const openStringsMidi = [43, 38, 33, 28]; 
const stringNames = ["G", "D", "A", "E"]; 

// Estado
let currentTarget = null; // { string, fret, midi }
let stats = { right: 0, wrong: 0 };
let isGameActive = true;

// Dicionário de notas (para saber o nome do MIDI)
const notesScale = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/* === 1. ÁUDIO === */
function playTone(midiNote) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    
    osc.type = 'sawtooth'; // Som suave
    osc.frequency.value = freq;
    
    // Filtro para simular grave
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.start(now);
    osc.stop(now + 1.5);
}

/* === 2. DESENHO DO BRAÇO === */
function drawFretboard() {
    fretboardEl.innerHTML = ''; 

    // Ajustes de margem
    const marginX = 60; // Espaço na esquerda para os nomes das cordas
    const marginY = 30;
    const boardWidth = 760;
    const boardHeight = 200;
    
    const fretDist = boardWidth / frets;

    // 1. Desenha NUT (Pestana)
    createLine(marginX, marginY, marginX, marginY + (strings-1)*50, "nut", 6);

    // 2. Desenha Trastes e Números
    for (let i = 1; i <= frets; i++) {
        const x = marginX + (i * fretDist);
        // Traste
        createLine(x, marginY, x, marginY + (strings-1)*50, "fret", 2);
        
        // Número da casa (1, 3, 5, 7, 9, 12)
        if ([1, 3, 5, 7, 9, 12].includes(i)) {
            createText(x - (fretDist/2), marginY + boardHeight + 5, i, "fret-number");
        }

        // Bolinhas (Marcadores padrão 3, 5, 7, 9, 12)
        if([3, 5, 7, 9].includes(i)) {
            drawDot(x - (fretDist/2), marginY + 75, "#ddd"); // Meio do braço
        }
        if(i === 12) {
            drawDot(x - (fretDist/2), marginY + 25, "#ddd");
            drawDot(x - (fretDist/2), marginY + 125, "#ddd");
        }
    }

    // 3. Desenha Cordas e Nomes
    for (let i = 0; i < strings; i++) {
        const y = marginY + (i * 50);
        // Linha da corda
        const strokeW = 1 + (i * 0.8);
        createLine(marginX, y, marginX + boardWidth, y, "string", strokeW);
        
        // Nome da corda (E, A, D, G)
        createText(25, y, stringNames[i], "string-name");
    }
}

function createLine(x1, y1, x2, y2, cls, w) {
    const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1);
    l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("class", cls);
    if(w) l.setAttribute("stroke-width", w);
    fretboardEl.appendChild(l);
}

function createText(x, y, txt, cls) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("class", cls);
    t.textContent = txt;
    fretboardEl.appendChild(t);
}

function drawDot(cx, cy, color, id) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy);
    c.setAttribute("r", 9);
    c.setAttribute("fill", color);
    if(id) {
        c.setAttribute("id", id);
        c.setAttribute("class", "target-note");
    } else {
        c.setAttribute("class", "fret-marker");
    }
    fretboardEl.appendChild(c);
}

/* === 3. LÓGICA DO JOGO === */

// Mapa de Enarmonia (Quem é igual a quem)
const enharmonicMap = {
    "C#": "Db", "Db": "C#",
    "D#": "Eb", "Eb": "D#",
    "F#": "Gb", "Gb": "F#",
    "G#": "Ab", "Ab": "G#",
    "A#": "Bb", "Bb": "A#"
};

function generateNewNote() {
    isGameActive = true;
    
    // Limpa
    const old = document.getElementById("target-dot");
    if(old) old.remove();
    document.querySelectorAll(".note-btn").forEach(b => {
        b.classList.remove("wrong-anim", "correct-anim");
    });

    // Sorteia
    const strIndex = Math.floor(Math.random() * strings);
    const fretIndex = Math.floor(Math.random() * (frets + 1)); // 0 a 12

    const midiVal = openStringsMidi[strIndex] + fretIndex;
    
    // Calcula nome da nota (ex: MIDI 61 -> "C#")
    const noteName = notesScale[midiVal % 12];

    currentTarget = {
        string: strIndex,
        fret: fretIndex,
        note: noteName, // Sempre será Sustenido ou Natural baseado no array notesScale
        midi: midiVal
    };

    // Desenha Bolinha Vermelha
    const marginX = 60;
    const marginY = 30;
    const boardWidth = 760;
    const fretDist = boardWidth / frets;
    
    let cx = marginX + (fretIndex * fretDist) - (fretDist/2);
    if(fretIndex === 0) cx = 40; // Pestana (corda solta)

    const cy = marginY + (strIndex * 50);

    drawDot(cx, cy, "red", "target-dot");
    
    setTimeout(() => playTone(midiVal), 200);
}

function checkAnswer(userNote) {
    if(!isGameActive) return;

    // Lógica Inteligente:
    // O usuário clicou em 'userNote' (ex: "Db")
    // O alvo é 'currentTarget.note' (ex: "C#")
    // Precisamos ver se são iguais OU se são enarmônicos
    
    const targetNote = currentTarget.note;
    const isCorrect = (userNote === targetNote) || (enharmonicMap[userNote] === targetNote);

    if (isCorrect) {
        // ACERTOU
        stats.right++;
        playTone(currentTarget.midi + 12); // Som de vitória (oitava acima)
        
        // Marca o botão clicado como certo
        const clickedBtn = document.querySelector(`button[data-note="${userNote}"]`);
        if(clickedBtn) clickedBtn.classList.add("correct-anim");
        
        // Se a nota tiver um "irmão" (ex: clicou C#, ilumina Db também)
        if(enharmonicMap[userNote]) {
            const siblingBtn = document.querySelector(`button[data-note="${enharmonicMap[userNote]}"]`);
            if(siblingBtn) siblingBtn.classList.add("correct-anim");
        }

        isGameActive = false;
        setTimeout(generateNewNote, 1000);

    } else {
        // ERROU
        stats.wrong++;
        const btn = document.querySelector(`button[data-note="${userNote}"]`);
        if(btn) btn.classList.add("wrong-anim");
    }
    
    updateStats();
}

function updateStats() {
    document.getElementById("score-right").innerText = stats.right;
    document.getElementById("score-wrong").innerText = stats.wrong;
}

function resetGame() {
    stats = { right: 0, wrong: 0 };
    updateStats();
    generateNewNote();
}

/* === INICIALIZAÇÃO === */
document.querySelectorAll(".note-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const note = e.target.getAttribute("data-note");
        checkAnswer(note);
    });
});

window.onload = () => {
    drawFretboard();
    generateNewNote();
};