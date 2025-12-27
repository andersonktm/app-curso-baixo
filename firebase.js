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
        
        loginScreen.style.opacity = '0';
        setTimeout(() => { loginScreen.style.display = 'none'; }, 500);
        appContainer.style.opacity = '1';
        appContainer.style.pointerEvents = 'all';
        
        // --- CARREGAMENTO DO CURSO (AGORA LEVE) ---
        try {
            // MUDANÇA CRÍTICA AQUI:
            // Antes: "curso_completo" (Pesado) -> Agora: "indice_curso" (Leve)
            // Certifique-se de ter rodado o Admin novo para criar este arquivo.
            const docRef = doc(db, "site_data", "indice_curso");
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const dadosLeves = docSnap.data();
                
                // Envia apenas o esqueleto (Títulos/Estrutura) para o script.js
                if (window.iniciarCurso) {
                    window.iniciarCurso(dadosLeves);
                }
            } else {
                console.error("Índice do curso não encontrado! (Rode o Admin > Salvar e Distribuir)");
                // Fallback: Se não achar o índice novo, tenta o antigo pra não quebrar
                const fallbackRef = doc(db, "site_data", "curso_completo");
                const fallbackSnap = await getDoc(fallbackRef);
                if(fallbackSnap.exists()) {
                    console.warn("Usando fallback antigo (curso_completo)");
                    if (window.iniciarCurso) window.iniciarCurso(fallbackSnap.data());
                } else {
                    alert("Erro crítico: Nenhum dado de curso encontrado.");
                }
            }

        } catch (error) {
            console.error("Erro ao baixar índice:", error);
            alert("Erro de conexão ao baixar o curso.");
        }
        // ---------------------------------------------------

        await fetchUserProgress();
        fillSidebarFromMemory();
        startMenuObserver();

        if(progressArea) updateSliderUI(currentModId, currentLessId);

    } else {
        // Usuário deslogado
    }
});


// --- SLIDER (SALVAR) ---
if(progressSlider) {
    progressSlider.addEventListener('change', async (e) => {
        if(!currentUser) return;
        const valor = e.target.value;
        const lessonKey = `progresso_${currentModId}_${currentLessId}`;
        const userRef = doc(db, "users", currentUser.uid);

        progressVal.innerText = valor + "%";
        
        userProgressData[lessonKey] = valor;
        updateSingleSidebarItem(currentModId, currentLessId, valor);

        try {
            await setDoc(userRef, { [lessonKey]: valor }, { merge: true });
        } catch (error) { console.error("Erro ao salvar:", error); }
    });

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
    
    progressSlider.value = savedValue;
    progressVal.innerText = savedValue + "%";
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