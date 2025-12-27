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
let menuObserver = null; 


// Elementos UI
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password'); // Certifique-se que no HTML o ID é 'senha' ou 'password'
const errorMsg = document.getElementById('error-msg');
const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const progressArea = document.getElementById('progress-area');
const progressSlider = document.getElementById('progress-slider');
const progressVal = document.getElementById('progress-val');
const menuContainer = document.getElementById('menu-container');


// =================================================================
//  NOVA FUNÇÃO: LAZY LOADING (Busca conteúdo pesado sob demanda)
// =================================================================
window.fetchLessonContent = async function(modIdx, lessIdx) {
    // Cria o ID único usado no Admin, ex: "aula_0_1"
    const docId = `aula_${modIdx}_${lessIdx}`;
    
    // Referência à coleção de conteúdos pesados
    const docRef = doc(db, "conteudo_aulas", docId);

    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            // Retorna o objeto completo: { text: "...", audioBass: "...", etc }
            return docSnap.data(); 
        } else {
            console.warn("Conteúdo da aula não encontrado no banco:", docId);
            return null;
        }
    } catch (error) {
        console.error("Erro ao baixar aula:", error);
        return null;
    }
};

// =================================================================





// --- LOGIN (COM PROTEÇÃO CONTRA ERROS) ---
if (btnLogin) {
    btnLogin.addEventListener('click', (e) => {
        // Previne que o formulário recarregue a página
        e.preventDefault(); 

        const email = emailInput.value;
        const pass = passInput.value;

        // Feedback visual
        btnLogin.innerText = "Verificando...";
        
        signInWithEmailAndPassword(auth, email, pass)
            .then(() => { 
                btnLogin.innerText = "Sucesso!"; 
                // O onAuthStateChanged vai lidar com o redirecionamento
            })
            .catch((error) => {
                btnLogin.innerText = "ENTRAR NA ÁREA DO ALUNO";
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    errorMsg.innerText = "E-mail ou senha incorretos.";
                }
                console.error("Erro no login:", error);
            });
    });
}

// --- LOGOUT ---
if(btnLogout) {
    btnLogout.addEventListener('click', () => {
        if(confirm("Deseja realmente sair?")) {
            signOut(auth)
                .then(() => {
                    console.log("Usuário deslogado.");
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
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;

        // UI: Mostra o app
        if(loginScreen) {
            loginScreen.style.opacity = '0';
            setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
        }
        if(appContainer) {
            appContainer.style.opacity = '1';
            appContainer.style.pointerEvents = 'all';
        }

        // 1. PRIMEIRO: Baixa o progresso do usuário
        await fetchUserProgress();

        // 2. SEGUNDO: Liga o Observador
        startMenuObserver();

        // 3. TERCEIRO: Baixa o Conteúdo e Inicia o Curso
        try {
            const docRef = doc(db, "site_data", "indice_curso");
            let docSnap = await getDoc(docRef);
            let dadosCurso = null;

            if (docSnap.exists()) {
                dadosCurso = docSnap.data();
            } else {
                console.warn("Índice leve não encontrado, tentando fallback...");
                const fallbackRef = doc(db, "site_data", "curso_completo");
                const fallbackSnap = await getDoc(fallbackRef);
                if(fallbackSnap.exists()) dadosCurso = fallbackSnap.data();
            }

            if (dadosCurso && window.iniciarCurso) {
                window.iniciarCurso(dadosCurso);
            } else {
                console.error("Dados do curso não encontrados ou função iniciarCurso indisponível.");
            }

        } catch (error) {
            console.error("Erro ao baixar curso:", error);
        }
        
        // Fallback de segurança
        fillSidebarFromMemory();
        
        if(progressArea) updateSliderUI(currentModId, currentLessId);

    } else {
        // Usuário deslogado - Mantém na tela de login
    }
});


// --- SLIDER (SALVAR) ---
if(progressSlider) {
    progressSlider.addEventListener('change', async (e) => {
        if(!currentUser) return;
        const valor = e.target.value;
        const lessonKey = `progresso_${currentModId}_${currentLessId}`;
        const userRef = doc(db, "users", currentUser.uid);

        if(progressVal) progressVal.innerText = valor + "%";
        
        userProgressData[lessonKey] = valor;
        updateSingleSidebarItem(currentModId, currentLessId, valor);

        try {
            await setDoc(userRef, { [lessonKey]: valor }, { merge: true });
        } catch (error) { console.error("Erro ao salvar:", error); }
    });

    progressSlider.addEventListener('input', (e) => {
        if(progressVal) progressVal.innerText = e.target.value + "%";
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
            let sidebarId = key.replace('progresso_', 'percent-');
            sidebarId = sidebarId.replace(/_/g, '-'); 

            const span = document.getElementById(sidebarId);
            if(span) {
                const novoTexto = value > 0 ? value + "%" : "";
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
    
    if(progressSlider) progressSlider.value = savedValue;
    if(progressVal) progressVal.innerText = savedValue + "%";
}

function startMenuObserver() {
    if(!menuContainer) return;
    if(menuObserver) menuObserver.disconnect();
    
    menuObserver = new MutationObserver((mutations) => {
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