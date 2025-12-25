import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = {
    apiKey: "AIzaSyCTJGH90GaYbdRChcjOtpff5o6ZYzlYA8k",
    authDomain: "guia-baixo-app.firebaseapp.com",
    projectId: "guia-baixo-app",
    storageBucket: "guia-baixo-app.firebasestorage.app",
    messagingSenderId: "1027874033890",
    appId: "1:1027874033890:web:61de70c26e635811ab8ebb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variáveis
let currentUser = null;
let currentModId = 0;
let currentLessId = 0;
let userProgressData = {}; 

// Elementos UI
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('senha');
const errorMsg = document.getElementById('error-msg');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const progressArea = document.getElementById('progress-area');
const progressSlider = document.getElementById('progress-slider');
const progressVal = document.getElementById('progress-val');
const menuContainer = document.getElementById('menu-container');

// --- LOGIN ---
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const pass = passInput.value;
    btnLogin.innerText = "Verificando...";
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => { btnLogin.innerText = "ENTRAR"; })
        .catch((error) => {
            btnLogin.innerText = "ENTRAR";
            errorMsg.style.display = 'block';
            errorMsg.innerText = "Dados incorretos.";
        });
});

if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(confirm("Deseja realmente sair?")) signOut(auth);
    });
}

// --- MONITORAMENTO DE ESTADO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        loginScreen.style.opacity = '0';
        setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
        appContainer.style.opacity = '1';
        appContainer.style.pointerEvents = 'all';
        
        // 1. Carrega os dados do banco
        await fetchUserProgress();
        
        // 2. Preenche memória
        fillSidebarFromMemory();

        // 3. Ativa o Observador para preencher assim que o menu for criado
        startMenuObserver();

    } else {
        currentUser = null;
        userProgressData = {};
        loginScreen.style.display = 'flex';
        setTimeout(() => { loginScreen.style.opacity = '1'; }, 10);
        appContainer.style.opacity = '0';
        appContainer.style.pointerEvents = 'none';
    }
});

// --- SLIDER (SALVAR) ---
progressSlider.addEventListener('change', async (e) => {
    if(!currentUser) return;
    const valor = e.target.value;
    const lessonKey = `progresso_${currentModId}_${currentLessId}`;
    const userRef = doc(db, "users", currentUser.uid);

    progressVal.innerText = valor + "%";
    
    // Atualiza memória local e menu visualmente
    userProgressData[lessonKey] = valor;
    updateSingleSidebarItem(currentModId, currentLessId, valor);

    try {
        await setDoc(userRef, { [lessonKey]: valor }, { merge: true });
    } catch (error) { console.error("Erro ao salvar:", error); }
});

progressSlider.addEventListener('input', (e) => {
    progressVal.innerText = e.target.value + "%";
});

// --- FUNÇÕES AUXILIARES ---

async function fetchUserProgress() {
    if(!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            userProgressData = docSnap.data();
        }
    } catch (error) { console.error("Erro ao buscar dados:", error); }
}

function fillSidebarFromMemory() {
    for (const [key, value] of Object.entries(userProgressData)) {
        if (key.startsWith('progresso_')) {
            const sidebarId = key.replace('progresso_', 'percent-');
            const span = document.getElementById(sidebarId);
            if(span && value > 0) {
                span.innerText = value + "%";
            }
        }
    }
}

function updateSingleSidebarItem(mod, less, val) {
    const span = document.getElementById(`percent-${mod}-${less}`);
    if(span) span.innerText = val > 0 ? val + "%" : "";
}

// O Observador garante que a porcentagem apareça mesmo se o menu demorar
function startMenuObserver() {
    const observer = new MutationObserver((mutations) => {
        fillSidebarFromMemory();
    });

    if(menuContainer) {
        observer.observe(menuContainer, { childList: true, subtree: true });
    }
}

// --- PONTE COM SCRIPT.JS ---
window.addEventListener('load', () => {
    if(typeof loadLesson !== 'undefined') {
        const originalLoad = window.loadLesson;
        
        window.loadLesson = async function(modIdx, lessIdx) {
            originalLoad(modIdx, lessIdx);
            
            currentModId = modIdx;
            currentLessId = lessIdx;
            
            if(!currentUser) { progressArea.style.display = 'none'; return; }

            progressArea.style.display = 'block';
            progressSlider.value = 0;
            progressVal.innerText = "0%";
            progressSlider.disabled = true;

            const lessonKey = `progresso_${modIdx}_${lessIdx}`;
            const savedValue = userProgressData[lessonKey] || 0;
            
            progressSlider.value = savedValue;
            progressVal.innerText = savedValue + "%";
            progressSlider.disabled = false;
        }
    }
});