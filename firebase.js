import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// Variáveis de Estado
let currentUser = null;
let currentModId = 0;
let currentLessId = 0;
let userProgressData = {}; 

// Referências DOM
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

// --- 1. LOGIN ---
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const pass = passInput.value;
    btnLogin.innerText = "Aguarde...";
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => { btnLogin.innerText = "ENTRAR"; })
        .catch((error) => {
            btnLogin.innerText = "ENTRAR";
            errorMsg.style.display = 'block';
            errorMsg.innerText = "Login inválido.";
            console.error(error);
        });
});

if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(confirm("Sair da conta?")) signOut(auth);
    });
}

// --- 2. MONITORAMENTO (Auth State) ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // UI Transition
        loginScreen.style.opacity = '0';
        setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
        appContainer.style.opacity = '1';
        appContainer.style.pointerEvents = 'all';
        
        // Passos Críticos para automação:
        // A. Baixa dados do Firestore
        await fetchUserProgress();
        
        // B. Tenta preencher (caso menu já exista)
        fillSidebarFromMemory();

        // C. Ativa o "Vigia" para preencher assim que o menu for criado
        startMenuObserver();

        // D. Atualiza o slider da aula atual
        updateSliderUI(currentModId, currentLessId);

    } else {
        currentUser = null;
        userProgressData = {};
        loginScreen.style.display = 'flex';
        setTimeout(() => { loginScreen.style.opacity = '1'; }, 10);
        appContainer.style.opacity = '0';
        appContainer.style.pointerEvents = 'none';
    }
});

// --- 3. SLIDER DE PROGRESSO (Salvar) ---
progressSlider.addEventListener('change', async (e) => {
    if(!currentUser) return;
    const valor = e.target.value;
    const lessonKey = `progresso_${currentModId}_${currentLessId}`;
    const userRef = doc(db, "users", currentUser.uid);

    progressVal.innerText = valor + "%";
    
    // Atualiza memória local e UI instantaneamente
    userProgressData[lessonKey] = valor;
    updateSingleSidebarItem(currentModId, currentLessId, valor);

    try {
        await setDoc(userRef, { [lessonKey]: valor }, { merge: true });
    } catch (error) { console.error("Erro ao salvar:", error); }
});

progressSlider.addEventListener('input', (e) => {
    progressVal.innerText = e.target.value + "%";
});

// --- 4. FUNÇÕES AUXILIARES ---

async function fetchUserProgress() {
    if(!currentUser) return;
    const userRef = doc(db, "users", currentUser.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            userProgressData = docSnap.data();
        }
    } catch (error) { console.error("Erro busca:", error); }
}

// Preenche todos os itens do menu com base na memória
function fillSidebarFromMemory() {
    for (const [key, value] of Object.entries(userProgressData)) {
        if (key.startsWith('progresso_')) {
            // Converte 'progresso_0_1' para 'percent-0-1'
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

function updateSliderUI(mod, less) {
    if(!currentUser || !progressArea) return;
    
    progressArea.style.display = 'block';
    const lessonKey = `progresso_${mod}_${less}`;
    const savedValue = userProgressData[lessonKey] || 0;
    
    progressSlider.value = savedValue;
    progressVal.innerText = savedValue + "%";
}

// O Observador: Garante que as porcentagens apareçam mesmo se o script.js demorar a criar o menu
function startMenuObserver() {
    if(!menuContainer) return;
    
    const observer = new MutationObserver((mutations) => {
        fillSidebarFromMemory();
    });

    observer.observe(menuContainer, { childList: true, subtree: true });
}

// --- 5. INTERCEPTADOR (Hook no script.js) ---
// Isso permite saber quando o usuário muda de aula para atualizar o slider
window.addEventListener('load', () => {
    if(typeof loadLesson !== 'undefined') {
        const originalLoad = window.loadLesson;
        
        window.loadLesson = function(modIdx, lessIdx) {
            originalLoad(modIdx, lessIdx); // Chama a função original do script.js
            
            currentModId = modIdx;
            currentLessId = lessIdx;
            
            // Atualiza o slider quando muda de aula
            updateSliderUI(modIdx, lessIdx);
        }
    }
});