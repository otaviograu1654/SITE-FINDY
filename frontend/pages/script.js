// Controla as interações gerais das telas, o menu de categorias e o FAQ.

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

// A navegação e as categorias do topo ficam em cabecalho.js.

// A vitrine de profissionais usa a API pelo arquivo categoria.js.

// Perguntas frequentes compartilhadas ficam em ajuda.js.

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

// --- Editar os campos de dados (Nome, Gênero, Email, Telefone) ---
// Os dois ícones (lápis e "check") são pequenos trechos de SVG prontos,
// guardados em variáveis pra não precisar redigitar o desenho toda vez
// que a gente troca de um ícone pro outro.
const ICONE_LAPIS = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 20l1-4.2L15.6 5.2a1.5 1.5 0 0 1 2.1 0l1.1 1.1a1.5 1.5 0 0 1 0 2.1L8.2 19 4 20Z" stroke="white" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;

const ICONE_CONFIRMAR = `
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 13l4 4L19 7" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

// Troca o <span> do valor por um campo editável (<input> ou <select>,
// dependendo do "data-tipo" definido no HTML de cada bloco).
function comecarEdicao(campoEl) {
  const tipo = campoEl.dataset.tipo;
  const textoEl = campoEl.querySelector('.profile-field__value');
  const botaoEl = campoEl.querySelector('.profile-field__edit');
  const valorAtual = textoEl.textContent.trim();

  let elementoEditavel;

  if (tipo === 'select') {
    elementoEditavel = document.createElement('select');
    campoEl.dataset.opcoes.split(',').forEach((opcao) => {
      const optionEl = document.createElement('option');
      optionEl.value = opcao;
      optionEl.textContent = opcao;
      if (opcao === valorAtual) optionEl.selected = true;
      elementoEditavel.appendChild(optionEl);
    });
  } else {
    elementoEditavel = document.createElement('input');
    elementoEditavel.type = tipo; // 'text', 'email' ou 'tel'
    elementoEditavel.value = valorAtual;
  }

  elementoEditavel.className = 'profile-field__input';
  textoEl.replaceWith(elementoEditavel);
  elementoEditavel.focus();
  if (typeof elementoEditavel.select === 'function') {
    elementoEditavel.select(); // já deixa o texto selecionado, pronto pra sobrescrever
  }

  // Enquanto está editando, o botão vira "confirmar" em vez de "editar"
  botaoEl.innerHTML = ICONE_CONFIRMAR;
  botaoEl.setAttribute('aria-label', `Salvar ${campoEl.dataset.nomeCampo}`);

  function salvarEdicao() {
    const novoValor = elementoEditavel.value.trim() || valorAtual;

    const novoSpan = document.createElement('span');
    novoSpan.className = 'profile-field__value';
    novoSpan.textContent = novoValor;
    elementoEditavel.replaceWith(novoSpan);

    botaoEl.innerHTML = ICONE_LAPIS;
    botaoEl.setAttribute('aria-label', `Editar ${campoEl.dataset.nomeCampo}`);
  }

  // Salva ao clicar no botão (agora "confirmar")...
  botaoEl.onclick = salvarEdicao;

  // ...ou ao apertar Enter dentro do campo, sem precisar tirar a mão
  // do teclado pra clicar no botão
  elementoEditavel.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      salvarEdicao();
    }
  });
}

document.querySelectorAll('.profile-field').forEach((campoEl) => {
  const botaoEditar = campoEl.querySelector('.profile-field__edit');
  if (botaoEditar) {
    botaoEditar.onclick = () => comecarEdicao(campoEl);
  }
});

// ===================================================================
// INTEGRAÇÃO COM O GOOGLE AGENDA (perfil do prestador + contratação)
// ===================================================================
// Este é um site estático, sem uma agenda real de verdade por trás —
// então, em vez de só "mostrar" um calendário, os botões abrem a tela
// de "Criar evento" do próprio Google Agenda do visitante, já
// preenchida com data, nome do profissional, categoria e local. A
// pessoa confere/ajusta e salva o evento na conta dela em dois
// cliques — sem precisar de login nem backend.

// Formata uma data JS pro formato exigido pela URL do Google Agenda:
// AAAAMMDDTHHmmSS (hora local — o Google interpreta no fuso de quem
// está logado no navegador).
function formatarDataParaGoogleAgenda(data) {
  const doisDigitos = (numero) => String(numero).padStart(2, '0');
  return (
    data.getFullYear() +
    doisDigitos(data.getMonth() + 1) +
    doisDigitos(data.getDate()) +
    'T' +
    doisDigitos(data.getHours()) +
    doisDigitos(data.getMinutes()) +
    '00'
  );
}

// Monta a URL de "criar evento" do Google Agenda e abre numa aba nova.
// Recebe um objeto { titulo, inicio, fim, local, detalhes } — "inicio"
// e "fim" são objetos Date.
function abrirGoogleAgenda({ titulo, inicio, fim, local, detalhes }) {
  const parametros = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: `${formatarDataParaGoogleAgenda(inicio)}/${formatarDataParaGoogleAgenda(fim)}`,
    details: detalhes || '',
    location: local || '',
  });

  window.open(`https://calendar.google.com/calendar/render?${parametros.toString()}`, '_blank', 'noopener');
}

// Sugere o próximo horário disponível: começa amanhã às 8h (início do
// expediente) e, se cair num domingo — dia em que o profissional não
// atende, segundo o quadro de "Disponibilidade" do perfil — empurra
// pra segunda-feira. Duração padrão: 1 hora.
function proximoHorarioDisponivel() {
  const agora = new Date();
  const sugestao = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 8, 0, 0);

  if (sugestao.getDay() === 0) { // 0 = domingo
    sugestao.setDate(sugestao.getDate() + 1);
  }

  const fim = new Date(sugestao.getTime() + 60 * 60 * 1000);
  return { inicio: sugestao, fim };
}

// --- Botão "Ver agenda" no perfil do prestador: usa um horário sugerido ---
const botaoVerAgenda = document.getElementById('btn-ver-agenda');

if (botaoVerAgenda) {
  botaoVerAgenda.addEventListener('click', () => {
    const nome = botaoVerAgenda.dataset.nome || 'profissional da Findy';
    const categoria = botaoVerAgenda.dataset.categoria || '';
    const local = botaoVerAgenda.dataset.local || '';
    const { inicio, fim } = proximoHorarioDisponivel();

    abrirGoogleAgenda({
      titulo: `Serviço com ${nome} — Findy`,
      inicio,
      fim,
      local,
      detalhes:
        `Agendamento feito através da Findy.\n` +
        `Profissional: ${nome}${categoria ? ` (${categoria})` : ''}.\n` +
        `Horário sugerido — ajuste o dia e a hora se precisar de outro momento.`,
    });
  });
}

// Pedidos reais ficam em contratacao.js, pedidos.js e atendimento.js.
