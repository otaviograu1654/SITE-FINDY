// ===================================================================
// MEDIDOR DE FORÇA DE SENHA
// ===================================================================
// Este script "escuta" o campo de senha do cadastro: toda vez que o
// usuário digita algo, ele recalcula uma pontuação e atualiza a
// barrinha colorida e o texto (Fraca / Média / Forte).

const passwordInput = document.getElementById('signup-senha');
const statusEl = document.getElementById('password-status');
const statusIcon = document.getElementById('password-status-icon');
const statusText = document.getElementById('password-status-text');

// Recebe o texto da senha e devolve um "nível" (1, 2 ou 3) e um rótulo.
// A lógica soma 1 ponto para cada critério atendido — quanto mais
// critérios, mais forte consideramos a senha.
function calcularForcaDaSenha(senha) {
  if (!senha) {
    return { nivel: 0, rotulo: '' };
  }

  let pontos = 0;
  if (senha.length >= 6) pontos++;                 // tamanho mínimo razoável
  if (senha.length >= 10) pontos++;                 // tamanho bom
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++; // maiúsculas + minúsculas
  if (/[0-9]/.test(senha)) pontos++;                 // números
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;          // símbolos (!@#$ etc.)

  if (pontos <= 2) return { nivel: 1, rotulo: 'Fraca' };
  if (pontos <= 3) return { nivel: 2, rotulo: 'Média' };
  return { nivel: 3, rotulo: 'Forte' };
}

// Cada nível liga a um nome de classe CSS (que decide a cor) e a um
// símbolo de texto simples — sem precisar de nenhum ícone externo.
const INFO_NIVEL = {
  1: { classe: 'weak',   simbolo: '✕' },  // fraca
  2: { classe: 'medium', simbolo: '–' },  // mediana ("meio risco")
  3: { classe: 'strong', simbolo: '✓' },  // forte
};

function atualizarMedidor() {
  const { nivel, rotulo } = calcularForcaDaSenha(passwordInput.value);

  // Remove qualquer classe de força anterior antes de aplicar a nova
  statusEl.className = 'password-status';

  if (nivel > 0) {
    const { classe, simbolo } = INFO_NIVEL[nivel];
    statusEl.classList.add(`password-status--${classe}`);
    statusIcon.textContent = simbolo;
    statusText.textContent = rotulo;
  } else {
    // Campo vazio: some com o símbolo e o texto
    statusIcon.textContent = '';
    statusText.textContent = '';
  }
}

if (passwordInput) {
  passwordInput.addEventListener('input', atualizarMedidor);
}

// ===================================================================
// BLOQUEIO DO CADASTRO SEM SENHA PREENCHIDA
// ===================================================================
// O atributo "required" no HTML já impede o navio de enviar o
// formulário com o campo de senha vazio. Aqui só adicionamos um
// destaque visual (borda vermelha) nesse caso, pra ficar bem claro
// pro usuário qual campo precisa ser preenchido.
const signupForm = document.getElementById('signup-form');
const passwordField = passwordInput ? passwordInput.closest('.password-field') : null;

if (signupForm && passwordInput && passwordField) {
  signupForm.addEventListener('submit', (evento) => {
    if (passwordInput.value.trim() === '') {
      evento.preventDefault();
      passwordField.classList.add('password-field--invalid');
      passwordInput.focus();
    } else {
      passwordField.classList.remove('password-field--invalid');
    }
  });

  // Assim que o usuário começa a digitar, tiramos o destaque de erro
  passwordInput.addEventListener('input', () => {
    passwordField.classList.remove('password-field--invalid');
  });
}

// ===================================================================
// MENU "CATEGORIAS" (abre ao passar o mouse sobre a palavra)
// ===================================================================
// "mouseenter"/"mouseleave" disparam quando o ponteiro entra ou sai da
// área do elemento. Colocamos os dois listeners no bloco INTEIRO
// (botão + menu juntos), não só no botão — assim, ao mover o mouse do
// botão para baixo, para dentro do menu, ele continua "dentro" da área
// observada, e o menu só fecha quando o mouse sai de cima dele de vez.

const categoriesToggle = document.getElementById('categories-toggle');
const categoriesMenu = document.getElementById('categories-menu');
const categoriesDropdown = document.getElementById('categories-dropdown');

if (categoriesToggle && categoriesMenu && categoriesDropdown) {
  categoriesDropdown.addEventListener('mouseenter', () => {
    categoriesMenu.hidden = false;
    categoriesToggle.setAttribute('aria-expanded', 'true');
  });

  categoriesDropdown.addEventListener('mouseleave', () => {
    categoriesMenu.hidden = true;
    categoriesToggle.setAttribute('aria-expanded', 'false');
  });
}

// ===================================================================
// CATEGORIA ATIVA (lida a partir da URL)
// ===================================================================
// Quando esta página é aberta a partir de um link com "?categoria=Nome"
// (por exemplo, clicando num card da página inicial ou numa opção do
// menu acima), o texto de categoria embaixo de cada cartão de
// profissional é atualizado para bater com aquele nome, lido
// diretamente da URL.

const rotulosDeCategoria = document.querySelectorAll('[data-categoria-label]');

if (rotulosDeCategoria.length > 0) {
  const parametros = new URLSearchParams(window.location.search);
  const categoriaDaUrl = parametros.get('categoria');

  if (categoriaDaUrl) {
    rotulosDeCategoria.forEach((rotulo) => {
      rotulo.textContent = categoriaDaUrl;
    });
  }
}


// ===================================================================
// PAGINAÇÃO (troca visual de página ativa)
// ===================================================================
// Como este é um site estático (sem um servidor real por trás), os
// botões não carregam profissionais diferentes de verdade — só
// demonstram a interação de "qual página está selecionada agora".
const botoesPaginacao = document.querySelectorAll('.pagination__page');

botoesPaginacao.forEach((botao) => {
  botao.addEventListener('click', () => {
    botoesPaginacao.forEach((b) => b.classList.remove('pagination__page--active'));
    botao.classList.add('pagination__page--active');
  });
});

// ===================================================================
// WIDGET DE CHAT — a mensagem só aparece com o mouse sobre o avatar
// ===================================================================
const chatAvatar = document.querySelector('.chat-widget__avatar');
const chatBubble = document.querySelector('.chat-widget__bubble');

if (chatAvatar && chatBubble) {
  chatAvatar.addEventListener('mouseenter', () => {
    chatBubble.classList.add('chat-widget__bubble--visivel');
  });

  chatAvatar.addEventListener('mouseleave', () => {
    chatBubble.classList.remove('chat-widget__bubble--visivel');
  });
}

// ===================================================================
// PAINEL DE CHAT (FAQ com roteiro fixo)
// ===================================================================
const chatPanel = document.getElementById('chat-panel');
const chatPanelClose = document.getElementById('chat-panel-close');
const chatMessages = document.getElementById('chat-panel-messages');
const chatQuickReplies = document.querySelectorAll('.chat-quick-reply');

// Cria uma "bolha" de mensagem e adiciona no final da conversa.
// "tipo" é 'bot' ou 'usuario' — decide de que lado ela aparece e a cor,
// via a classe CSS correspondente (chat-message--bot / --usuario).
function adicionarMensagem(texto, tipo) {
  const mensagem = document.createElement('p');
  mensagem.className = `chat-message chat-message--${tipo}`;
  mensagem.textContent = texto;
  chatMessages.appendChild(mensagem);

  // Rola a conversa até o final, pra sempre mostrar a mensagem mais
  // recente — sem isso, uma conversa longa deixaria a resposta nova
  // escondida acima da área visível.
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatAvatar && chatPanel && chatPanelClose) {
  function abrirPainelDeChat() {
    chatPanel.hidden = false;
    chatAvatar.setAttribute('aria-expanded', 'true');
  }

  function fecharPainelDeChat() {
    chatPanel.hidden = true;
    chatAvatar.setAttribute('aria-expanded', 'false');
  }

  // O avatar é uma <img>, não um <button> — por isso escutamos tanto
  // "click" (mouse) quanto "keydown" com Enter/Espaço (teclado), já
  // que uma imagem não ativa sozinha com a tecla Enter como um botão
  // de verdade ativaria.
  chatAvatar.addEventListener('click', abrirPainelDeChat);
  chatAvatar.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      abrirPainelDeChat();
    }
  });

  chatPanelClose.addEventListener('click', fecharPainelDeChat);

  // Cada botão de pergunta pronta gera DUAS mensagens na conversa:
  // a pergunta (como se o usuário tivesse "dito" aquilo) e, na
  // sequência, a resposta fixa guardada em "data-resposta" no HTML.
  chatQuickReplies.forEach((botao) => {
    botao.addEventListener('click', () => {
      adicionarMensagem(botao.textContent.trim(), 'usuario');
      adicionarMensagem(botao.dataset.resposta, 'bot');
    });
  });
}

// ===================================================================
// PÁGINA DE PERFIL
// ===================================================================

// --- Trocar a foto de perfil ---
// O <input type="file"> fica escondido (hidden) — o botão de lápis só
// existe pra "clicar" nesse input escondido por trás dos panos, o que
// abre a janela de escolher arquivo do sistema operacional.
const botaoEditarFoto = document.getElementById('editar-foto');
const inputFotoPerfil = document.getElementById('input-foto-perfil');
const fotoPerfil = document.getElementById('profile-photo');
const avatarNoTopo = document.querySelector('.profile-nav__avatar');

if (botaoEditarFoto && inputFotoPerfil && fotoPerfil) {
  botaoEditarFoto.addEventListener('click', () => {
    inputFotoPerfil.click();
  });

  // Dispara quando a pessoa escolhe um arquivo na janela do sistema
  inputFotoPerfil.addEventListener('change', () => {
    const arquivo = inputFotoPerfil.files[0];
    if (!arquivo) return;

    // URL.createObjectURL cria um endereço temporário, só válido nesta
    // aba, que aponta pro arquivo escolhido — sem precisar enviar nada
    // pra internet. É assim que conseguimos mostrar a prévia na hora.
    const urlDaImagem = URL.createObjectURL(arquivo);
    fotoPerfil.src = urlDaImagem;
    if (avatarNoTopo) {
      avatarNoTopo.src = urlDaImagem;
    }
  });
}

// --- Excluir conta ---
// Como não existe backend neste projeto, não há o que "excluir" de
// verdade — mas ainda vale confirmar a ação, que é o comportamento
// esperado de qualquer botão destrutivo como este.
const botaoExcluirConta = document.getElementById('excluir-conta');

if (botaoExcluirConta) {
  botaoExcluirConta.addEventListener('click', () => {
    const confirmou = window.confirm(
      'Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.'
    );
    if (confirmou) {
      window.location.href = 'index.html';
    }
  });
}