// Configuração do Firebase (substitua com suas próprias credenciais)
const firebaseConfig = {
    apiKey: "AIzaSyDRpR_8BzOWgWLZwbHGH1YStyaB_PjrO6U",
    authDomain: "gerenciador-de-frases-citacoes.firebaseapp.com",
    databaseURL: "https://gerenciador-de-frases-citacoes-default-rtdb.firebaseio.com",
    projectId: "gerenciador-de-frases-citacoes"
};

// Credenciais de login
const firebaseCredentials = {
    email: "psics.psix.141@gmail.com",
    password: "14142135"
};

// Inicializar Firebase
let firebaseApp;
let firebaseAuth;
let firebaseDatabase;
let firebaseToken = null;

// Variáveis globais
let frases = [];
let frasesOrdenadas = [];
let fraseAtual = null;
let indiceAtual = 0;
let modoOrdenado = false;
let autoresContagem = {};
let totalFrasesCarregadas = 0;

// Elementos do DOM
const elementos = {
    fraseText: document.getElementById('fraseText'),
    fraseAutor: document.getElementById('fraseAutor'),
    btnNovaFrase: document.getElementById('btnNovaFrase'),
    btnOrdenado: document.getElementById('btnOrdenado'),
    btnAnterior: document.getElementById('btnAnterior'),
    btnProximo: document.getElementById('btnProximo'),
    btnStats: document.getElementById('btnStats'),
    btnSair: document.getElementById('btnSair'),
    statusText: document.getElementById('statusText'),
    contadorFrase: document.getElementById('contadorFrase'),
    indiceAtual: document.getElementById('indiceAtual'),
    totalFrases: document.getElementById('totalFrases'),
    modoAtual: document.getElementById('modoAtual'),
    contadorFrases: document.getElementById('contadorFrases'),
    firebaseStatus: document.getElementById('firebaseStatus'),
    
    // Modals
    statsModal: document.getElementById('statsModal'),
    ordenadoModal: document.getElementById('ordenadoModal'),
    
    // Estatísticas
    totalFrasesStat: document.getElementById('totalFrasesStat'),
    autoresUnicosStat: document.getElementById('autoresUnicosStat'),
    semAutorStat: document.getElementById('semAutorStat'),
    topAuthorsList: document.getElementById('topAuthorsList'),
    
    // Ordenado
    totalFrasesOrdenado: document.getElementById('totalFrasesOrdenado'),
    numeroInicio: document.getElementById('numeroInicio'),
    btnIniciarOrdenado: document.getElementById('btnIniciarOrdenado'),
    
    // Botões de fechar modais
    closeModals: document.querySelectorAll('.close-modal')
};

// Frases locais para fallback
const frasesLocais = [
    {
        frase: "A vida é o que acontece enquanto você está ocupado fazendo outros planos.",
        autor: "John Lennon",
        contexto: "",
        chave: "local-1"
    },
    {
        frase: "O sucesso é ir de fracasso em fracasso sem perder entusiasmo.",
        autor: "Winston Churchill",
        contexto: "",
        chave: "local-2"
    },
    {
        frase: "A única forma de fazer um excelente trabalho é amar o que você faz.",
        autor: "Steve Jobs",
        contexto: "",
        chave: "local-3"
    },
    {
        frase: "A mente que se abre a uma nova ideia jamais voltará ao seu tamanho original.",
        autor: "Albert Einstein",
        contexto: "",
        chave: "local-4"
    },
    {
        frase: "Não espere por circunstâncias ideais. Comece agora mesmo com o que você tem.",
        autor: "Arthur Ashe",
        contexto: "",
        chave: "local-5"
    }
];

// Inicializar Firebase
async function inicializarFirebase() {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseDatabase = firebase.database();
        
        atualizarStatus("🔐 Autenticando no Firebase...", "info");
        
        // Fazer login
        const userCredential = await firebaseAuth.signInWithEmailAndPassword(
            firebaseCredentials.email,
            firebaseCredentials.password
        );
        
        firebaseToken = await userCredential.user.getIdToken();
        atualizarStatus("✅ Conectado ao Firebase!", "success");
        elementos.firebaseStatus.textContent = "Conectado ao Firebase";
        elementos.firebaseStatus.style.color = "#2ed573";
        
        return true;
    } catch (error) {
        console.error("Erro ao inicializar Firebase:", error);
        atualizarStatus("⚠️ Modo offline: usando frases locais", "warning");
        elementos.firebaseStatus.textContent = "Modo offline";
        elementos.firebaseStatus.style.color = "#ffa502";
        
        // Usar frases locais
        frases = [...frasesLocais];
        frasesOrdenadas = [...frasesLocais];
        totalFrasesCarregadas = frases.length;
        elementos.contadorFrases.textContent = frases.length;
        
        // Mostrar primeira frase
        mostrarFraseAleatoria();
        
        return false;
    }
}

// Carregar frases do Firebase
async function carregarFrasesFirebase() {
    try {
        atualizarStatus("📥 Carregando frases do banco...", "info");
        
        // Contar frases
        const snapshotCount = await firebaseDatabase.ref('phrases').once('value');
        const totalFrases = snapshotCount.numChildren();
        
        if (totalFrases === 0) {
            throw new Error("Nenhuma frase encontrada no banco");
        }
        
        atualizarStatus(`📚 ${totalFrases} frases encontradas...`, "info");
        
        // Buscar todas as frases
        const snapshot = await firebaseDatabase.ref('phrases').once('value');
        const frasesData = snapshot.val();
        
        frases = [];
        frasesOrdenadas = [];
        autoresContagem = {};
        
        for (const key in frasesData) {
            if (frasesData.hasOwnProperty(key)) {
                const fraseData = frasesData[key];
                
                if (fraseData && fraseData.text && typeof fraseData.text === 'string') {
                    const autor = (fraseData.author && typeof fraseData.author === 'string' && fraseData.author.trim() !== '') 
                        ? fraseData.author.toString().trim() 
                        : "Desconhecido";
                    
                    // Contar autores
                    if (autoresContagem[autor]) {
                        autoresContagem[autor]++;
                    } else {
                        autoresContagem[autor] = 1;
                    }
                    
                    const fraseObj = {
                        frase: fraseData.text.toString().trim(),
                        autor: autor,
                        contexto: (fraseData.context && typeof fraseData.context === 'string') 
                            ? fraseData.context.toString().trim() 
                            : "",
                        categoria: (fraseData.category && typeof fraseData.category === 'string') 
                            ? fraseData.category.toString().trim() 
                            : "",
                        timestamp: fraseData.timestamp || 0,
                        chave: key
                    };
                    
                    frases.push(fraseObj);
                    frasesOrdenadas.push(fraseObj);
                }
            }
        }
        
        totalFrasesCarregadas = frases.length;
        elementos.contadorFrases.textContent = frases.length;
        elementos.totalFrases.textContent = frases.length;
        elementos.totalFrasesOrdenado.textContent = frases.length;
        
        atualizarStatus(`✅ ${frases.length} frases carregadas!`, "success");
        
        // Mostrar primeira frase
        mostrarFraseAleatoria();
        
    } catch (error) {
        console.error("Erro ao carregar frases:", error);
        atualizarStatus("❌ Erro ao carregar frases", "error");
        
        // Usar frases locais como fallback
        setTimeout(() => {
            frases = [...frasesLocais];
            frasesOrdenadas = [...frasesLocais];
            totalFrasesCarregadas = frases.length;
            elementos.contadorFrases.textContent = frases.length;
            elementos.totalFrases.textContent = frases.length;
            elementos.totalFrasesOrdenado.textContent = frases.length;
            
            atualizarStatus("📁 Usando frases locais", "warning");
            mostrarFraseAleatoria();
        }, 1000);
    }
}

// Atualizar status
function atualizarStatus(mensagem, tipo = "info") {
    elementos.statusText.textContent = mensagem;
    
    // Cores baseadas no tipo
    switch (tipo) {
        case "success":
            elementos.statusText.style.color = "#2ed573";
            break;
        case "warning":
            elementos.statusText.style.color = "#ffa502";
            break;
        case "error":
            elementos.statusText.style.color = "#ff4757";
            break;
        case "info":
            elementos.statusText.style.color = "#1e90ff";
            break;
        default:
            elementos.statusText.style.color = "#ffffff";
    }
    
    // Remover mensagem após 5 segundos (exceto se for sucesso)
    if (tipo !== "success") {
        setTimeout(() => {
            if (modoOrdenado) {
                atualizarStatus(`📖 Modo ordenado: Frase ${indiceAtual + 1}/${frasesOrdenadas.length}`, "info");
            } else {
                atualizarStatus("🎲 Modo aleatório ativo", "success");
            }
        }, 5000);
    }
}

// Mostrar frase aleatória
function mostrarFraseAleatoria() {
    modoOrdenado = false;
    elementos.contadorFrase.style.display = 'none';
    elementos.btnAnterior.disabled = true;
    elementos.btnProximo.disabled = true;
    elementos.btnOrdenado.style.background = 'linear-gradient(135deg, #8a2be2, #9b30ff)';
    elementos.modoAtual.textContent = '🎲 Modo Aleatório';
    elementos.modoAtual.style.color = '#2ed573';
    
    if (frases.length > 0) {
        const randomIndex = Math.floor(Math.random() * frases.length);
        fraseAtual = frases[randomIndex];
        mostrarFrase(fraseAtual);
        atualizarStatus("🎲 Modo aleatório ativo", "success");
    } else {
        elementos.fraseText.textContent = "Nenhuma frase disponível";
        elementos.fraseAutor.textContent = "";
    }
}

// Mostrar frase específica
function mostrarFrase(fraseObj, indice = -1) {
    // Limpar animação anterior
    elementos.fraseText.classList.remove('fade-in');
    elementos.fraseAutor.classList.remove('fade-in');
    
    // Aplicar efeito de fade
    setTimeout(() => {
        if (modoOrdenado && indice >= 0) {
            elementos.fraseText.textContent = `[#${indice + 1}] "${fraseObj.frase}"`;
        } else {
            elementos.fraseText.textContent = `"${fraseObj.frase}"`;
        }
        
        if (fraseObj.autor && fraseObj.autor.trim() !== '') {
            elementos.fraseAutor.textContent = `- ${fraseObj.autor}`;
            elementos.fraseAutor.style.display = 'block';
        } else {
            elementos.fraseAutor.textContent = "";
            elementos.fraseAutor.style.display = 'none';
        }
        
        // Adicionar animação
        elementos.fraseText.classList.add('fade-in');
        if (fraseObj.autor) {
            elementos.fraseAutor.classList.add('fade-in');
        }
        
        // Ajustar tamanho da fonte baseado no comprimento
        ajustarTamanhoFonte();
        
    }, 100);
}

// Ajustar tamanho da fonte baseado no comprimento
function ajustarTamanhoFonte() {
    const frase = elementos.fraseText.textContent;
    const comprimento = frase.length;
    
    let tamanhoBase = 32;
    
    if (comprimento > 200) {
        tamanhoBase = 24;
    } else if (comprimento > 150) {
        tamanhoBase = 26;
    } else if (comprimento > 100) {
        tamanhoBase = 28;
    } else if (comprimento < 50) {
        tamanhoBase = 36;
    }
    
    // Ajustar para mobile
    if (window.innerWidth <= 768) {
        tamanhoBase = Math.max(20, tamanhoBase - 8);
    }
    
    elementos.fraseText.style.fontSize = `${tamanhoBase}px`;
}

// Modo ordenado - iniciar
function iniciarModoOrdenado(numeroInicio) {
    if (frasesOrdenadas.length === 0) return;
    
    modoOrdenado = true;
    indiceAtual = Math.max(0, Math.min(numeroInicio - 1, frasesOrdenadas.length - 1));
    
    // Atualizar UI
    elementos.contadorFrase.style.display = 'block';
    elementos.indiceAtual.textContent = indiceAtual + 1;
    elementos.totalFrases.textContent = frasesOrdenadas.length;
    elementos.btnAnterior.disabled = (indiceAtual === 0);
    elementos.btnProximo.disabled = (indiceAtual === frasesOrdenadas.length - 1);
    elementos.btnOrdenado.style.background = 'linear-gradient(135deg, #0066ff, #0099ff)';
    elementos.modoAtual.textContent = '📖 Modo Ordenado';
    elementos.modoAtual.style.color = '#1e90ff';
    
    // Mostrar frase atual
    mostrarFrase(frasesOrdenadas[indiceAtual], indiceAtual);
    atualizarStatus(`📖 Modo ordenado: Frase ${indiceAtual + 1}/${frasesOrdenadas.length}`, "info");
    
    // Fechar modal
    fecharModal('ordenadoModal');
}

// Navegar para frase anterior
function fraseAnterior() {
    if (!modoOrdenado || indiceAtual <= 0) return;
    
    indiceAtual--;
    mostrarFrase(frasesOrdenadas[indiceAtual], indiceAtual);
    elementos.indiceAtual.textContent = indiceAtual + 1;
    elementos.btnAnterior.disabled = (indiceAtual === 0);
    elementos.btnProximo.disabled = (indiceAtual === frasesOrdenadas.length - 1);
    atualizarStatus(`📖 Modo ordenado: Frase ${indiceAtual + 1}/${frasesOrdenadas.length}`, "info");
}

// Navegar para próxima frase
function proximaFrase() {
    if (!modoOrdenado || indiceAtual >= frasesOrdenadas.length - 1) return;
    
    indiceAtual++;
    mostrarFrase(frasesOrdenadas[indiceAtual], indiceAtual);
    elementos.indiceAtual.textContent = indiceAtual + 1;
    elementos.btnAnterior.disabled = (indiceAtual === 0);
    elementos.btnProximo.disabled = (indiceAtual === frasesOrdenadas.length - 1);
    atualizarStatus(`📖 Modo ordenado: Frase ${indiceAtual + 1}/${frasesOrdenadas.length}`, "info");
}

// Mostrar estatísticas
function mostrarEstatisticas() {
    if (totalFrasesCarregadas === 0) {
        alert("Carregue o banco primeiro!");
        return;
    }
    
    // Atualizar estatísticas básicas
    elementos.totalFrasesStat.textContent = totalFrasesCarregadas;
    elementos.autoresUnicosStat.textContent = Object.keys(autoresContagem).length;
    
    const semAutor = autoresContagem["Desconhecido"] || 0;
    const percentSemAutor = ((semAutor / totalFrasesCarregadas) * 100).toFixed(2);
    elementos.semAutorStat.textContent = `${semAutor} (${percentSemAutor}%)`;
    
    // Criar top 10 autores
    const autoresArray = Object.entries(autoresContagem)
        .map(([autor, count]) => ({ autor, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    elementos.topAuthorsList.innerHTML = '';
    
    autoresArray.forEach((autorObj, index) => {
        const percent = ((autorObj.count / totalFrasesCarregadas) * 100).toFixed(2);
        const authorItem = document.createElement('div');
        authorItem.className = `author-item ${index < 3 ? 'top-3' : ''}`;
        
        authorItem.innerHTML = `
            <div class="author-name">
                <span class="author-rank">${index + 1}</span>
                ${autorObj.autor}
            </div>
            <div class="author-count">
                ${autorObj.count} frases (${percent}%)
            </div>
        `;
        
        elementos.topAuthorsList.appendChild(authorItem);
    });
    
    // Mostrar modal
    abrirModal('statsModal');
}

// Modal functions
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

function fecharTodosModais() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Inicializar eventos
function inicializarEventos() {
    // Botões principais
    elementos.btnNovaFrase.addEventListener('click', mostrarFraseAleatoria);
    elementos.btnAnterior.addEventListener('click', fraseAnterior);
    elementos.btnProximo.addEventListener('click', proximaFrase);
    elementos.btnStats.addEventListener('click', mostrarEstatisticas);
    elementos.btnSair.addEventListener('click', () => {
        if (confirm("Deseja realmente sair?")) {
            // Em uma aplicação web, não podemos fechar a janela
            // Mas podemos redirecionar ou mostrar uma mensagem
            elementos.fraseText.textContent = "Obrigado por usar o Frase Inspire!";
            elementos.fraseAutor.textContent = "";
            atualizarStatus("👋 Até a próxima!", "info");
            
            setTimeout(() => {
                elementos.fraseText.textContent = "Recarregue a página para continuar...";
            }, 2000);
        }
    });
    
    // Botão ordenado
    elementos.btnOrdenado.addEventListener('click', () => {
        if (frasesOrdenadas.length === 0) {
            atualizarStatus("⚠️ Nenhuma frase disponível para navegação", "warning");
            return;
        }
        
        elementos.numeroInicio.value = '';
        elementos.numeroInicio.max = frasesOrdenadas.length;
        abrirModal('ordenadoModal');
    });
    
    // Iniciar navegação ordenada
    elementos.btnIniciarOrdenado.addEventListener('click', () => {
        const numeroInput = elementos.numeroInicio.value.trim();
        
        if (!numeroInput) {
            alert("Por favor, digite um número válido!");
            return;
        }
        
        const numero = parseInt(numeroInput);
        if (isNaN(numero) || numero < 1 || numero > frasesOrdenadas.length) {
            alert(`Digite um número entre 1 e ${frasesOrdenadas.length}!`);
            return;
        }
        
        iniciarModoOrdenado(numero);
    });
    
    // Permitir Enter no campo de número
    elementos.numeroInicio.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elementos.btnIniciarOrdenado.click();
        }
    });
    
    // Clicar na frase
    elementos.fraseText.parentElement.addEventListener('click', () => {
        if (modoOrdenado) {
            if (indiceAtual < frasesOrdenadas.length - 1) {
                proximaFrase();
            }
        } else {
            mostrarFraseAleatoria();
        }
    });
    
    // Fechar modais
    elementos.closeModals.forEach(btn => {
        btn.addEventListener('click', fecharTodosModais);
    });
    
    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharTodosModais();
            }
        });
    });
    
    // Teclado
    document.addEventListener('keydown', (e) => {
        // Ignorar se estiver digitando em um input
        if (e.target.tagName === 'INPUT') return;
        
        switch (e.key) {
            case ' ':
            case 'Enter':
            case 'n':
                if (!modoOrdenado) {
                    e.preventDefault();
                    mostrarFraseAleatoria();
                }
                break;
                
            case 'Escape':
                fecharTodosModais();
                break;
                
            case 's':
            case 'S':
                if (totalFrasesCarregadas > 0) {
                    e.preventDefault();
                    mostrarEstatisticas();
                }
                break;
                
            case 'o':
            case 'O':
                e.preventDefault();
                elementos.btnOrdenado.click();
                break;
                
            case 'ArrowLeft':
                if (modoOrdenado) {
                    e.preventDefault();
                    fraseAnterior();
                }
                break;
                
            case 'ArrowRight':
                if (modoOrdenado) {
                    e.preventDefault();
                    proximaFrase();
                }
                break;
        }
    });
    
    // Redimensionamento da janela
    window.addEventListener('resize', ajustarTamanhoFonte);
}

// Inicializar aplicação
async function inicializarAplicacao() {
    try {
        // Inicializar eventos primeiro
        inicializarEventos();
        
        // Inicializar Firebase
        const firebaseConectado = await inicializarFirebase();
        
        // Carregar frases se Firebase estiver conectado
        if (firebaseConectado) {
            await carregarFrasesFirebase();
        }
        
        // Mostrar primeira frase (já mostra frases locais se Firebase falhar)
        if (frases.length === 0) {
            frases = [...frasesLocais];
            frasesOrdenadas = [...frasesLocais];
            totalFrasesCarregadas = frases.length;
            elementos.contadorFrases.textContent = frases.length;
            mostrarFraseAleatoria();
        }
        
    } catch (error) {
        console.error("Erro ao inicializar aplicação:", error);
        atualizarStatus("❌ Erro ao iniciar aplicação", "error");
        
        // Usar frases locais em caso de erro
        setTimeout(() => {
            frases = [...frasesLocais];
            frasesOrdenadas = [...frasesLocais];
            totalFrasesCarregadas = frases.length;
            elementos.contadorFrases.textContent = frases.length;
            mostrarFraseAleatoria();
            atualizarStatus("📁 Modo offline ativo", "warning");
        }, 1000);
    }
}

// Iniciar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', inicializarAplicacao);

// Adicionar suporte a Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registrado:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker falhou:', error);
            });
    });
}
