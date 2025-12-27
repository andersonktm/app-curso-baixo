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
let menuObserver = null; // Guardamos o observador aqui

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
            console.error(error);
        });
});

if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(confirm("Deseja realmente sair?")) {
            // Chama a função de sair do Firebase
            signOut(auth)
                .then(() => {
                    console.log("Usuário deslogado.");
                    // O SEGREDO: Força a página a recarregar do zero
                    window.location.reload();
                })
                .catch((error) => {
                    console.error("Erro ao sair:", error);
                    alert("Ocorreu um erro ao tentar sair.");
                });
        }
    });
}

// --- MONITORAMENTO DE ESTADO ---
// ... imports anteriores mantidos ...

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        loginScreen.style.opacity = '0';
        setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
        appContainer.style.opacity = '1';
        appContainer.style.pointerEvents = 'all';
        
        // --- NOVO: BAIXAR CONTEÚDO DO CURSO (Protegido) ---
        try {
            // Referência ao documento que criamos no admin
            const docRef = doc(db, "site_data", "curso_completo");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const dadosSeguros = docSnap.data();
                
                // CHAMA A FUNÇÃO QUE CRIAMOS NO SCRIPT.JS
                if (window.iniciarCurso) {
                    window.iniciarCurso(dadosSeguros);
                }
            } else {
                console.error("Documento do curso não encontrado no Firestore!");
                alert("Erro: Conteúdo do curso não encontrado. Contate o suporte.");
            }

        } catch (error) {
            console.error("Erro ao baixar curso:", error);
            alert("Erro de conexão ao baixar o curso.");
        }
        // ---------------------------------------------------

        // 1. Carrega progresso do usuário (mantido)
        await fetchUserProgress();
        
        // 2. Preenche memória sidebar (mantido)
        fillSidebarFromMemory();
        
        // 3. Observador (mantido)
        startMenuObserver();

        if(progressArea) updateSliderUI(currentModId, currentLessId);

    } else {
        // ... (código de logout mantido)
    }
});


// --- SLIDER (SALVAR) ---
if(progressSlider) {
    // Evento 'change' só dispara quando solta o mouse (Evita chamadas excessivas)
    progressSlider.addEventListener('change', async (e) => {
        if(!currentUser) return;
        const valor = e.target.value;
        const lessonKey = `progresso_${currentModId}_${currentLessId}`;
        const userRef = doc(db, "users", currentUser.uid);

        progressVal.innerText = valor + "%";
        
        // Atualiza memória
        userProgressData[lessonKey] = valor;
        // Atualiza sidebar visualmente
        updateSingleSidebarItem(currentModId, currentLessId, valor);

        try {
            await setDoc(userRef, { [lessonKey]: valor }, { merge: true });
        } catch (error) { console.error("Erro ao salvar:", error); }
    });

    // Evento 'input' é visual (enquanto arrasta)
    progressSlider.addEventListener('input', (e) => {
        progressVal.innerText = e.target.value + "%";
    });
}

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
            // Corrige o ID: 'progresso_0_1' -> 'percent-0-1'
            let sidebarId = key.replace('progresso_', 'percent-');
            sidebarId = sidebarId.replace(/_/g, '-'); 

            const span = document.getElementById(sidebarId);
            if(span) {
                const novoTexto = value > 0 ? value + "%" : "";
                // PROTEÇÃO ANTI-LOOP: Só escreve se for diferente
                if(span.innerText !== novoTexto) {
                    span.innerText = novoTexto;
                }
            }
        }
    }
}

function updateSingleSidebarItem(mod, less, val) {
    const span = document.getElementById(`percent-${mod}-${less}`);
    if(span) {
        const novoTexto = val > 0 ? val + "%" : "";
        // PROTEÇÃO ANTI-LOOP: Verifica antes de escrever
        if(span.innerText !== novoTexto) {
            span.innerText = novoTexto;
        }
    }
}

function updateSliderUI(mod, less) {
    if(!currentUser || !progressArea) return;
    
    progressArea.style.display = 'block';
    const lessonKey = `progresso_${mod}_${less}`;
    const savedValue = userProgressData[lessonKey] || 0;
    
    progressSlider.value = savedValue;
    progressVal.innerText = savedValue + "%";
}

// Observador Inteligente
function startMenuObserver() {
    if(!menuContainer) return;
    if(menuObserver) menuObserver.disconnect(); // Garante que não tem duplicados
    
    menuObserver = new MutationObserver((mutations) => {
        // Filtra para ver se foi uma mudança de estrutura (Script.js criou menu)
        // Ignora se a mudança foi num span de porcentagem (nossa própria culpa)
        const isMenuRebuild = mutations.some(m => {
            return m.type === 'childList' && 
                   (!m.target.id || !m.target.id.startsWith('percent-'));
        });

        if (isMenuRebuild) {
            fillSidebarFromMemory();
        }
    });

    menuObserver.observe(menuContainer, { childList: true, subtree: true });
}

// --- PONTE COM SCRIPT.JS ---
window.addEventListener('load', () => {
    if(typeof loadLesson !== 'undefined') {
        const originalLoad = window.loadLesson;
        
        window.loadLesson = function(modIdx, lessIdx) {
            originalLoad(modIdx, lessIdx);
            
            currentModId = modIdx;
            currentLessId = lessIdx;
            
            updateSliderUI(modIdx, lessIdx);
        }
    }
});